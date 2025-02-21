import { TeamSize } from "@common/constants";
import Cluster, { type Worker } from "node:cluster";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { WebSocketServer } from "ws";
import { Config, MapWithParams } from "./config";
import { Game } from "./game";
import { PlayerJoinData } from "./objects/player";
import { pickRandomInArray } from "@common/utils/random";
import { RateLimiter, serverLog, serverWarn } from "./utils/serverHelpers";

export enum WorkerMessages {
    AddPlayer,
    UpdateTeamSize,
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
        readonly type: WorkerMessages.UpdateTeamSize
        readonly teamSize: TeamSize
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

    constructor(
        readonly id: number,
        teamSize: TeamSize,
        map: MapWithParams,
        resolve: (game: GameContainer) => void
    ) {
        this.promiseCallbacks.push(resolve);
        this.worker = Cluster.fork({ id, teamSize, map }).on("message", (data: Partial<GameData>): void => {
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

export async function findGame(teamSize: TeamSize, map: MapWithParams): Promise<GameContainer | undefined> {
    const eligibleGames = games.filter((g?: GameContainer): g is GameContainer =>
        g !== undefined
        && g.allowJoin
        && g.aliveCount < Config.maxPlayersPerGame
    );

    return eligibleGames.length
        ? pickRandomInArray(eligibleGames)
        : await newGame(undefined, teamSize, map);
}

let creating: GameContainer | undefined;

export async function newGame(id: number | undefined, teamSize: TeamSize, map: MapWithParams): Promise<GameContainer | undefined> {
    return new Promise<GameContainer | undefined>(resolve => {
        if (creating !== undefined) {
            creating.promiseCallbacks.push(resolve);
        } else if (id !== undefined) {
            serverLog(`Creating new game with ID ${id}`);
            const game = games[id];
            if (!game) {
                games[id] = new GameContainer(id, teamSize, map, resolve);
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
                    void newGame(i, teamSize, map).then(game => resolve(game));
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
        readonly teamSize: string
        readonly map: MapWithParams
    };
    const id = parseInt(data.id);
    let teamSize = parseInt(data.teamSize);
    let map = data.map;

    let game = new Game(id, teamSize, map);

    process.on("uncaughtException", e => game.error("An unhandled error occurred. Details:", e));

    setInterval(() => {
        const memoryUsage = process.memoryUsage().rss;
        game.log(`RAM usage: ${Math.round(memoryUsage / 1024 / 1024 * 100) / 100} MB`);
    }, 60000);

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
                game = new Game(id, teamSize, map);
                break;
            }
            case WorkerMessages.UpdateTeamSize: {
                teamSize = message.teamSize;
                break;
            }
        }
    });
}
