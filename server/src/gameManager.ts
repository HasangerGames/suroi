import { Config } from "./config";
import { Game } from "./game";
import type { CustomTeam } from "./team";
import { Logger } from "./utils/misc";

export function findGame(): { readonly success: true, readonly gameID: number } | { readonly success: false } {
    const maxGames = Config.maxGames;
    for (let gameID = 0; gameID < maxGames; gameID++) {
        const game = games[gameID];
        if (canJoin(game) && game?.allowJoin) {
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
            .filter((g => g && !g.over) as (g?: Game) => g is Game)
            .reduce((a, b) => a.startedTime > b.startedTime ? a : b);

        return game
            ? { success: true, gameID: game.id }
            : { success: false };
    }
}

export const games: Array<Game | undefined> = [];

export function newGame(id?: number): number {
    if (id !== undefined) {
        if (!games[id] || games[id]?.stopped) {
            Logger.log(`Game ${id} | Creating...`);
            games[id] = new Game(id);
            return id;
        }
    } else {
        const maxGames = Config.maxGames;
        for (let i = 0; i < maxGames; i++) {
            if (!games[i] || games[i]?.stopped) return newGame(i);
        }
    }
    return -1;
}

export function endGame(id: number, createNewGame: boolean): void {
    const game = games[id];
    if (game === undefined) return;
    game.allowJoin = false;
    game.stopped = true;
    for (const player of game.connectedPlayers) {
        player.socket.close();
    }
    Logger.log(`Game ${id} | Ended`);
    if (createNewGame) {
        Logger.log(`Game ${id} | Creating...`);
        games[id] = new Game(id);
    } else {
        games[id] = undefined;
    }
}

export function canJoin(game?: Game): boolean {
    return game !== undefined && game.aliveCount < Config.maxPlayersPerGame && !game.over;
}

export const customTeams: Map<string, CustomTeam> = new Map<string, CustomTeam>();
