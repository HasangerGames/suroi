import { Config } from "./config";
import { Logger } from "./utils/misc";
import { Worker } from "node:worker_threads";
import { type GetGameResponse } from "../../common/src/typings";
import { maxTeamSize } from "./server";

export class GameContainer {
    id: number;
    worker: Worker;

    data: GameData = {
        aliveCount: 0,
        allowJoin: false,
        over: false,
        stopped: false,
        startedTime: -1
    };

    ipPromiseMap = new Map<string, Array<(ip: string) => void>>();

    constructor(id: number) {
        this.id = id;
        // @ts-expect-error no typings for this
        const isTSNode = process[Symbol.for("ts-node.register.instance")];
        this.worker = new Worker(`./src/game.${isTSNode ? "ts" : "js"}`, { workerData: { id, maxTeamSize } });
        this.worker.on("message", (message: WorkerMessage): void => {
            switch (message.type) {
                case WorkerMessages.UpdateGameData: {
                    this.data = { ...this.data, ...message.data };
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
                    const promises = this.ipPromiseMap.get(message.ip);
                    if (!promises) break;
                    for (const resolve of promises) resolve(message.ip);
                    this.ipPromiseMap.delete(message.ip);
                    break;
                }
            }
        });
    }

    async allowIP(ip: string): Promise<string> {
        return await new Promise<string>(resolve => {
            const promises = this.ipPromiseMap.get(ip);
            if (promises) {
                promises.push(resolve);
            } else {
                this.worker.postMessage({
                    type: WorkerMessages.AllowIP,
                    ip
                });

                this.ipPromiseMap.set(ip, [resolve]);
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
        type: WorkerMessages.AllowIP | WorkerMessages.IPAllowed
        ip: string
    } |
    {
        type: WorkerMessages.UpdateGameData
        data: Partial<GameData>
    } |
    {
        type: WorkerMessages.CreateNewGame
    };

export interface GameData {
    aliveCount: number
    allowJoin: boolean
    over: boolean
    stopped: boolean
    startedTime: number
}

export async function findGame(): Promise<GetGameResponse> {
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

        if (game) {
            return { success: true, gameID: game.id };
        } else {
            return { success: false };
        }
    }
}

export const games: Array<GameContainer | undefined> = [];

export function newGame(id?: number): number {
    if (id !== undefined) {
        if (!games[id] || games[id]?.data.stopped) {
            Logger.log(`Game ${id} | Creating...`);
            games[id] = new GameContainer(id);
            return id;
        }
    } else {
        for (let i = 0; i < Config.maxGames; i++) {
            const game = games[i];
            if (!game || game?.data?.stopped) return newGame(i);
        }
    }
    return -1;
}

export function endGame(id: number, createNewGame: boolean): void {
    void games[id]?.worker.terminate();
    Logger.log(`Game ${id} | Ended`);
    if (createNewGame) {
        Logger.log(`Game ${id} | Creating...`);
        games[id] = new GameContainer(id);
    } else {
        games[id] = undefined;
    }
}

export function canJoin(game?: GameContainer): boolean {
    return game?.data !== undefined && game.data.aliveCount < Config.maxPlayersPerGame && !game.data.over;
}
