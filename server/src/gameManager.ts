import path from "node:path";
import { Worker } from "node:worker_threads";

import { type GetGameResponse } from "@common/typings";

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
                        activeGameID = this.id; // The active game is the most recently created one
                    }

                    if (message.data.stopped === true) {
                        // If allowJoin is true, then a new game hasn't been created by this game, so create one to replace this one
                        let shouldCreateNewGame = this.data.allowJoin;

                        // If this is the active game, set the active game to the most recently created one
                        // If there is no eligible game, create one to replace this one
                        if (activeGameID === this.id && !shouldCreateNewGame) {
                            const runningGames = games.filter((g?: GameContainer): g is GameContainer => !!g && !g.data.over);
                            if (runningGames.length) {
                                activeGameID = runningGames.reduce((a, b) => a.data.startedTime > b.data.startedTime ? a : b).id;
                            } else {
                                shouldCreateNewGame = true;
                            }
                        }

                        void this.worker.terminate();
                        Logger.log(`Game ${this.id} | Ended`);
                        if (shouldCreateNewGame) {
                            newGame(this.id);
                        } else {
                            games[this.id] = undefined;
                        }
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
    const game = games[activeGameID];

    return game && !game.data.over
        ? { success: true, gameID: activeGameID }
        : { success: false };
}

export const games: Array<GameContainer | undefined> = [];

let activeGameID = 0;

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
