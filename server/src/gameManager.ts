import { TeamSize } from "@common/constants";
import Cluster, { type Worker } from "node:cluster";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { WebSocketServer } from "ws";
import { Config, MapWithParams } from "./config";
import { Game } from "./game";
import { PlayerJoinData } from "./objects/player";
import { map, maxTeamSize, serverLog, serverWarn, simultaneousConnections } from "./server";

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

    resolve: (game: GameContainer) => void;

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

    constructor(readonly id: number, resolve: (game: GameContainer) => void) {
        this.resolve = resolve;
        this.worker = Cluster.fork({ id, maxTeamSize, map }).on("message", (message: WorkerMessage): void => {
            switch (message.type) {
                case WorkerMessages.UpdateGameData: {
                    this._data = { ...this._data, ...message.data };

                    if (message.data.allowJoin === true) { // This means the game was just created
                        creating = undefined;
                        this.resolve(this);
                    }
                    break;
                }
                case WorkerMessages.RemovePlayer: {
                    simultaneousConnections[message.ip]--;
                    break;
                }
            }
        });
    }

    sendMessage(message: WorkerMessage): void {
        this.worker.send(message);
    }
}

let creating: GameContainer | undefined;

export async function newGame(id?: number): Promise<GameContainer | undefined> {
    return new Promise<GameContainer | undefined>(resolve => {
        if (creating !== undefined) {
            resolve(creating);
        } else if (id !== undefined) {
            serverLog(`Creating new game with ID ${id}`);
            const game = games[id];
            if (!game) {
                games[id] = new GameContainer(id, resolve);
            } else if (game.stopped) {
                game.resolve = resolve;
                game.sendMessage({ type: WorkerMessages.Reset });
            } else {
                serverWarn(`Game with ID ${id} already exists`);
                resolve(game);
            }
        } else {
            const maxGames = Config.maxGames;
            for (let i = 0; i < maxGames; i++) {
                const game = games[i];
                console.log("Game", i, "exists:", !!game, "stopped:", game?.stopped);
                if (!game || game.stopped) {
                    void newGame(i).then(game => resolve(game));
                    return;
                }
            }
            serverWarn("Unable to create new game, no slots left");
            resolve(undefined);
        }
    });
}

export const games: Array<GameContainer | undefined> = [];

if (!Cluster.isPrimary) {
    const data = process.env;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const id = parseInt(data.id!);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let maxTeamSize = parseInt(data.maxTeamSize!);
    let map = data.map as MapWithParams;

    let game = new Game(id, maxTeamSize, map);

    process.on("uncaughtException", e => game.error("An unhandled error occurred. Details:", e));

    const server = new WebSocketServer({ noServer: true });

    process.on("message", (message: WorkerMessage, socket?: Socket) => {
        switch (message.type) {
            case WorkerMessages.AddPlayer: {
                const { request, playerData } = message;
                const removePlayer = (): void => {
                    if (Config.protection?.maxSimultaneousConnections) {
                        process.send?.({ type: WorkerMessages.RemovePlayer, ip: playerData.ip });
                    }
                };
                if (!socket) {
                    removePlayer();
                    break;
                }
                socket.resume();

                // @ts-expect-error despite what the typings say, the headers don't have to be a Buffer
                server.handleUpgrade(request, socket, request.headers, socket => {
                    const player = game.addPlayer(socket, playerData);
                    if (!player) {
                        socket.close();
                        removePlayer();
                        return;
                    }

                    socket.binaryType = "arraybuffer";
                    // player.sendGameOverPacket(false); // uncomment to test game over screen

                    socket.on("message", (message: ArrayBuffer) => {
                        try {
                            game.onMessage(message, player);
                        } catch (e) {
                            console.warn("Error parsing message:", e);
                        }
                    });

                    const close = (): void => {
                        removePlayer();
                        game.removePlayer(player);
                    };
                    socket.on("error", close);
                    socket.on("close", close);
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
