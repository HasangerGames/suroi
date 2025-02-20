import { TeamSize } from "@common/constants";
import Cluster, { type Worker } from "node:cluster";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { WebSocketServer } from "ws";
import { Config, MapWithParams } from "./config";
import { Game } from "./game";
import { PlayerJoinData } from "./objects/player";
import { map, maxTeamSize, serverLog, serverWarn } from "./server";
import { pickRandomInArray } from "@common/utils/random";
import { RateLimiter } from "./utils/rateLimiter";

export enum WorkerMessages {
    AddPlayer,
    UpdateMaxTeamSize,
    UpdateMap,
    Reset
}

export type WorkerMessage =
    | {
        readonly type: WorkerMessages.AddPlayer
        readonly request: IncomingMessage
        readonly playerData: PlayerJoinData
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

    readonly promiseCallbacks: Array<(game: GameContainer) => void> = [];

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
        this.promiseCallbacks.push(resolve);
        this.worker = Cluster.fork({ id, maxTeamSize, map }).on("message", (data: Partial<GameData>): void => {
            this._data = { ...this._data, ...data };

            if (data.allowJoin === true) { // This means the game was just created
                creating = undefined;
                for (const resolve of this.promiseCallbacks) resolve(this);
                this.promiseCallbacks.length = 0;
            }
        });
    }

    sendMessage(message: WorkerMessage): void {
        this.worker.send(message);
    }
}

export const games: Array<GameContainer | undefined> = [];

export async function findGame(): Promise<GameContainer | undefined> {
    const eligibleGames = games.filter((g?: GameContainer): g is GameContainer =>
        g !== undefined
        && g.allowJoin
        && g.aliveCount < Config.maxPlayersPerGame
    );

    return eligibleGames.length
        ? pickRandomInArray(eligibleGames)
        : await newGame();
}

let creating: GameContainer | undefined;

export async function newGame(id?: number): Promise<GameContainer | undefined> {
    return new Promise<GameContainer | undefined>(resolve => {
        if (creating !== undefined) {
            creating.promiseCallbacks.push(resolve);
        } else if (id !== undefined) {
            serverLog(`Creating new game with ID ${id}`);
            const game = games[id];
            if (!game) {
                games[id] = new GameContainer(id, resolve);
            } else if (game.stopped) {
                game.promiseCallbacks.push(resolve);
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

if (!Cluster.isPrimary) {
    const data = process.env as {
        readonly id: string
        readonly maxTeamSize: string
        readonly map: MapWithParams
    };
    const id = parseInt(data.id);
    let maxTeamSize = parseInt(data.maxTeamSize);
    let map = data.map;

    let game = new Game(id, maxTeamSize, map);

    process.on("uncaughtException", e => game.error("An unhandled error occurred. Details:", e));

    const server = new WebSocketServer({ noServer: true });

    const simultaneousConnections = Config.protection?.maxSimultaneousConnections
        ? new RateLimiter(Config.protection.maxSimultaneousConnections)
        : undefined;

    process.on("message", (message: WorkerMessage, socket?: Socket) => {
        switch (message.type) {
            case WorkerMessages.AddPlayer: {
                const { request, playerData } = message;
                // @ts-expect-error despite what the typings say, the headers don't have to be a Buffer
                server.handleUpgrade(request, socket, request.headers, socket => {
                    if (simultaneousConnections?.isLimited(playerData.ip)) {
                        game.warn(playerData.ip, "exceeded connection limit");
                        socket.close();
                        return;
                    }

                    const player = game.addPlayer(socket, playerData);
                    if (!player) return;

                    simultaneousConnections?.increment(player.ip);

                    socket.binaryType = "arraybuffer";
                    // player.sendGameOverPacket(false); // uncomment to test game over screen

                    socket.on("message", (message: ArrayBuffer) => {
                        try {
                            game.onMessage(message, player);
                        } catch (e) {
                            game.warn("Error parsing message:", e);
                        }
                    });

                    socket.on("close", () => {
                        simultaneousConnections?.decrement(player.ip);
                        game.removePlayer(player);
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
