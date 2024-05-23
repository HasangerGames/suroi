import path from "node:path";
import { Worker } from "node:worker_threads";
import { type GetGameResponse } from "../../common/src/typings";
import { Config } from "./config";
import { maxTeamSize } from "./server";
import { Logger } from "./utils/misc";

export interface WorkerInitData {
    readonly id: number
    readonly maxTeamSize: number
}

export class GameContainer {
    readonly worker: Worker;

    private _data: GameData = {
        aliveCount: 0,
        allowJoin: false,
        over: false,
        stopped: false,
        startedTime: -1
    };

    get data(): GameData { return this._data; }

    private readonly _ipPromiseMap = new Map<string, Array<() => void>>();

    constructor(readonly id: number) {
        (
            this.worker = new Worker(
                //                               @ts-expect-error No typings available for this
                //                              ______________________^^^^______________________
                path.resolve(__dirname, `game.${process[Symbol.for("ts-node.register.instance")] ? "ts" : "js"}`),
                { workerData: { id, maxTeamSize } satisfies WorkerInitData }
            )
        ).on("message", (message: WorkerMessage): void => {
            switch (message.type) {
                case WorkerMessages.UpdateGameData: {
                    this._data = { ...this._data, ...message.data };

                    if (message.data.allowJoin === true) { // This means the game was just created
                        creatingID = -1;
                    }

                    if (message.data.stopped === true) {
                        // If allowJoin is true, then a new game hasn't been created by this game, so create one to replace this one
                        const shouldCreateNewGame = this.data.allowJoin;
                        endGame(this.id, shouldCreateNewGame);
                    }
                    break;
                }
                case WorkerMessages.CreateNewGame: {
                    newGame();
                    break;
                }
                case WorkerMessages.IPAllowed: {
                    const promises = this._ipPromiseMap.get(message.ip);
                    if (!promises) break;
                    for (const resolve of promises) resolve();
                    this._ipPromiseMap.delete(message.ip);
                    break;
                }
            }
        });
    }

    async allowIP(ip: string): Promise<void> {
        return await new Promise(resolve => {
            const promises = this._ipPromiseMap.get(ip);
            if (promises) {
                promises.push(resolve);
            } else {
                this.worker.postMessage({ type: WorkerMessages.AllowIP, ip });

                this._ipPromiseMap.set(ip, [resolve]);
            }
        });
    }
}

export enum WorkerMessages {
    AllowIP,
    IPAllowed,
    UpdateGameData,
    CreateNewGame
}

export type WorkerMessage =
    {
        readonly type: WorkerMessages.AllowIP | WorkerMessages.IPAllowed
        readonly ip: string
    } |
    {
        readonly type: WorkerMessages.UpdateGameData
        readonly data: Partial<GameData>
    } |
    {
        readonly type: WorkerMessages.CreateNewGame
    };

export interface GameData {
    aliveCount: number
    allowJoin: boolean
    over: boolean
    stopped: boolean
    startedTime: number
}

export function findGame(): GetGameResponse {
    for (let gameID = 0; gameID < Config.maxGames; gameID++) {
        const game = games[gameID];
        if (canJoin(game) && game?.data.allowJoin) {
            return { success: true, gameID };
        }
    }

    // Create a game if there's a free slot
    const gameID = newGame();
    if (gameID !== -1) {
        return { success: true, gameID };
    } else {
        // Join the game that most recently started
        const game = games
            .filter((g => g && !g.data.over) as (g?: GameContainer) => g is GameContainer)
            .reduce((a, b) => a.data.startedTime > b.data.startedTime ? a : b);

        return game
            ? { success: true, gameID: game.id }
            : { success: false };
    }
}

export const games: Array<GameContainer | undefined> = [];

let creatingID = -1;

export function newGame(id?: number): number {
    if (creatingID !== -1) return creatingID;
    if (id !== undefined) {
        if (!games[id] || games[id]?.data.stopped) {
            creatingID = id;
            Logger.log(`Game ${id} | Creating...`);
            games[id] = new GameContainer(id);
            return id;
        }
    } else {
        const maxGames = Config.maxGames;
        for (let i = 0; i < maxGames; i++) {
            if (games[i]?.data.stopped !== false) return newGame(i);
        }
    }
    return -1;
}

export function endGame(id: number, createNewGame: boolean): void {
    void games[id]?.worker.terminate();
    Logger.log(`Game ${id} | Ended`);
    if (createNewGame) newGame(id);
    else games[id] = undefined;
}

export function canJoin(game?: GameContainer): boolean {
    return game?.data !== undefined && game.data.aliveCount < Config.maxPlayersPerGame && !game.data.over;
}
