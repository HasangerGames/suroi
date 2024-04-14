import { randomBytes } from "node:crypto";
import { Config } from "./config";
import { Logger } from "./utils/misc";
import { Worker, getEnvironmentData } from "node:worker_threads";

export class GameContainer {
    id: number;
    worker: Worker;

    constructor(id: number) {
        this.id = id;
        this.worker = new Worker("./src/game.ts", { workerData: id });
        this.worker.on("message", (data): void => {
            console.log(data);
        });
    }

    get data(): GameData {
        return getEnvironmentData(this.id) as GameData;
    }

    addToken(): string {
        const token = randomBytes(4).toString("hex");
        this.worker.postMessage({
            type: WorkerMessages.RegisterToken,
            token
        });
        return token;
    }
}

export enum WorkerMessages {
    RegisterToken
}

export interface GameData {
    aliveCount: number
    allowJoin: boolean
    over: boolean
    stopped: boolean
    startedTime: number
}

export function findGame(): { readonly success: true, readonly gameID: number } | { readonly success: false } {
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

export function newGame(id?: number): number {
    if (id !== undefined) {
        if (!games[id] || games[id]?.data.stopped) {
            Logger.log("Creating new game...");
            games[id] = new GameContainer(id);
            return id;
        }
    } else {
        for (let i = 0; i < Config.maxGames; i++) {
            if (!games[i] || games[i]?.data.stopped) return newGame(i);
        }
    }
    return -1;
}

export function endGame(id: number, createNewGame: boolean): void {
    if (createNewGame) {
        Logger.log(`Game ${id} | Creating...`);
        games[id] = new GameContainer(id);
    } else {
        games[id] = undefined;
    }
}

export function canJoin(game?: GameContainer): boolean {
    return game !== undefined && game.data !== undefined && game.data.aliveCount < Config.maxPlayersPerGame && !game.data.over;
}
