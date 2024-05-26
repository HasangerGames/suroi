import { Config } from "./config";
import { Logger } from "./utils/misc";
import { Worker } from "node:worker_threads";
import { type GetGameResponse } from "../../common/src/typings";
import { maxTeamSize } from "./server";
import path from "node:path";
import { Modes } from "../../common/src/definitions/modes";

export class GameContainer {
    id: number;
    worker: Worker;
    mode:string;
    data: GameData = {
        aliveCount: 0,
        allowJoin: false,
        over: false,
        stopped: false,
        startedTime: -1
    };

    ipPromiseMap = new Map<string, Array<() => void>>();

    constructor(id: number,mode:string) {
        this.id = id;
        this.mode=mode
        // @ts-expect-error no typings for this
        const isTSNode = process[Symbol.for("ts-node.register.instance")];
        this.worker = new Worker(path.resolve(__dirname, `game.${isTSNode ? "ts" : "js"}`), { workerData: { id, maxTeamSize,mode:Modes.find(m => m.idString === this.mode)! } });
        this.worker.on("message", (message: WorkerMessage): void => {
            switch (message.type) {
                case WorkerMessages.UpdateGameData: {
                    this.data = { ...this.data, ...message.data };

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
                    newGame(this.mode);
                    break;
                }
                case WorkerMessages.IPAllowed: {
                    const promises = this.ipPromiseMap.get(message.ip);
                    if (!promises) break;
                    for (const resolve of promises) resolve();
                    this.ipPromiseMap.delete(message.ip);
                    break;
                }
            }
        });
    }

    async allowIP(ip: string): Promise<void> {
        return await new Promise(resolve => {
            const promises = this.ipPromiseMap.get(ip);
            if (promises) {
                promises.push(resolve);
            } else {
                this.worker.postMessage({ type: WorkerMessages.AllowIP, ip });

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

export async function findGame(mode?:string): Promise<GetGameResponse> {
    for (let gameID = 0; gameID <Config.maxGames; gameID++) {
        const game = games[gameID];
        if (canJoin(game) && game?.data.allowJoin && (mode==undefined||game.mode==mode)) {
            return { success: true, gameID, mode:game.mode };
        }
    }

    const used_mode=mode ? mode : Config.defaultMode
    // Create a game if there's a free slot
    const gameID = newGame(used_mode);
    if (gameID !== -1) {
        return { success: true, gameID, mode:used_mode};
    } else {
        // Join the game that most recently started
        const game = games
            .filter((g => g && !g.data.over) as (g?: GameContainer) => g is GameContainer)
            .reduce((a, b) => a.data.startedTime > b.data.startedTime ? a : b);

        if (game) {
            return { success: true, gameID: game.id, mode:game.mode };
        } else {
            return { success: false };
        }
    }
}

export const games: Array<GameContainer | undefined> = [];

let creatingID = -1;

export function newGame(mode:string,id?: number): number {
    if (creatingID !== -1) return creatingID;
    if (id !== undefined) {
        if (!games[id] || games[id]?.data.stopped) {
            creatingID = id;
            Logger.log(`Game ${id} | Creating...`);
            games[id] = new GameContainer(id,mode);
            return id;
        }
    } else {
        for (let i = 0; i < Config.maxGames; i++) {
            const game = games[i];
            if (!game || game?.data?.stopped) return newGame(mode,i);
        }
    }
    return -1;
}

export function endGame(id: number, createNewGame: boolean): void {
    void games[id]?.worker.terminate();
    Logger.log(`Game ${id} | Ended`);
    if (createNewGame) newGame(games[id]!.mode,id);
    else games[id] = undefined;
}

export function canJoin(game?: GameContainer): boolean {
    return game?.data !== undefined && game.data.aliveCount < Config.maxPlayersPerGame && !game.data.over;
}
