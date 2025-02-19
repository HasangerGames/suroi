import { TeamSize } from "@common/constants";
import { type GetGameResponse } from "@common/typings";
import { pickRandomInArray } from "@common/utils/random";
import Cluster, { type Worker } from "node:cluster";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { WebSocketServer } from "ws";
import { Config, MapWithParams } from "./config";
import { Game } from "./game";
import { PlayerJoinData } from "./objects/player";
import { maxTeamSize, serverLog, serverWarn } from "./server";
import { SuroiByteStream } from "@common/utils/suroiByteStream";

export interface WorkerInitData {
    readonly id: number
    readonly maxTeamSize: number
    readonly map: MapWithParams
}

export enum WorkerMessages {
    AddPlayer,
    RemovePlayer,
    UpdateGameData,
    UpdateMaxTeamSize,
    UpdateMap,
    Reset
}

export type WorkerMessage =
    | {
        readonly type: WorkerMessages.AddPlayer
        readonly request: IncomingMessage
        readonly socket: Socket
        readonly head: Buffer
        readonly playerData: PlayerJoinData
    }
    | {
        readonly type: WorkerMessages.RemovePlayer
        readonly ip: string
    }
    | {
        readonly type: WorkerMessages.UpdateGameData
        readonly data: Partial<GameData>
    }
    | {
        readonly type: WorkerMessages.UpdateMaxTeamSize
        readonly maxTeamSize: TeamSize
    }
    | {
        readonly type: WorkerMessages.UpdateMap
        readonly map: MapWithParams
    }
    | {
        readonly type: WorkerMessages.Reset
    };

export interface GameData {
    aliveCount: number
    allowJoin: boolean
    over: boolean
    stopped: boolean
    startedTime: number
}

export class GameContainer {
    readonly worker: Worker;

    resolve: (id: number) => void;

    private _data: GameData = {
        aliveCount: 0,
        allowJoin: false,
        over: false,
        stopped: false,
        startedTime: -1
    };

    get aliveCount(): number { return this._data.aliveCount; }
    get allowJoin(): boolean { return this._data.allowJoin; }
    get over(): boolean { return this._data.over; }
    get stopped(): boolean { return this._data.stopped; }
    get startedTime(): number { return this._data.startedTime; }

    constructor(readonly id: number, resolve: (id: number) => void) {
        this.resolve = resolve;
        this.worker = Cluster.fork({ id, maxTeamSize, map: "normal" }).on("message", (message: Partial<GameData>): void => {
            this._data = { ...this._data, ...message };

            if (message.allowJoin === true) { // This means the game was just created
                creatingID = -1;
                this.resolve(this.id);
            }
        });
    }

    sendMessage(message: WorkerMessage): void {
        this.worker.send(message);
    }
}

export async function findGame(): Promise<GetGameResponse> {
    const eligibleGames = games.filter((g?: GameContainer): g is GameContainer =>
        g !== undefined
        && g.allowJoin
        && g.aliveCount < Config.maxPlayersPerGame
    );

    const gameID = eligibleGames.length
        ? pickRandomInArray(eligibleGames).id // Pick randomly from the available games
        : await newGame(); // If a game isn't available, attempt to create a new one

    return gameID !== undefined
        ? { success: true, gameID }
        : { success: false };
}

let creatingID = -1;

export async function newGame(id?: number): Promise<number | undefined> {
    return new Promise<number | undefined>(resolve => {
        if (creatingID !== -1) {
            resolve(creatingID);
        } else if (id !== undefined) {
            creatingID = id;
            serverLog(`Creating new game with ID ${id}`);
            const game = games[id];
            if (!game) {
                games[id] = new GameContainer(id, resolve);
            } else if (game.stopped) {
                game.resolve = resolve;
                game.sendMessage({ type: WorkerMessages.Reset });
            } else {
                serverWarn(`Game with ID ${id} already exists`);
                resolve(id);
            }
        } else {
            const maxGames = Config.maxGames;
            for (let i = 0; i < maxGames; i++) {
                const game = games[i];
                console.log("Game", i, "exists:", !!game, "stopped:", game?.stopped);
                if (!game || game.stopped) {
                    void newGame(i).then(id => resolve(id));
                    return;
                }
            }
            console.log("unable to create new game");
            resolve(undefined);
        }
    });
}

export const games: Array<GameContainer | undefined> = [];

if (!Cluster.isPrimary) {
    const data = process.env as unknown as WorkerInitData;
    const id = data.id;
    let { maxTeamSize, map } = data;

    let game = new Game(id, maxTeamSize, map);

    process.on("uncaughtException", e => game.error("An unhandled error occurred. Details:", e));

    const server = new WebSocketServer({ noServer: true });

    process.on("message", (message: WorkerMessage, socket?: Socket) => {
        switch (message.type) {
            case WorkerMessages.AddPlayer: {
                if (!socket) break;

                const { request, head, playerData } = message;
                socket.resume();
                server.handleUpgrade(request, socket, head, socket => {
                    const player = game.addPlayer(socket, playerData);
                    if (!player) {
                        socket.close();
                        return;
                    }

                    socket.binaryType = "arraybuffer";
                    // player.sendGameOverPacket(false); // uncomment to test game over screen

                    socket.on("message", (message: ArrayBuffer) => {
                        try {
                            const stream = new SuroiByteStream(message);
                            game.onMessage(stream, player);
                        } catch (e) {
                            console.warn("Error parsing message:", e);
                        }
                    });

                    socket.on("close", () => {
                        if (!player) return;

                        game.removePlayer(player);
                        if (Config.protection) {
                            process.send?.({ type: WorkerMessages.RemovePlayer, ip: player.ip });
                        }
                    });
                });
                break;
            }
            case WorkerMessages.UpdateMap:
                map = message.map;
                game.kill();
            // eslint-disable-next-line no-fallthrough
            case WorkerMessages.Reset: {
                game = new Game(id, maxTeamSize, map);
                break;
            }
            case WorkerMessages.UpdateMaxTeamSize: {
                maxTeamSize = message.maxTeamSize;
                break;
            }
        }
    });
}
