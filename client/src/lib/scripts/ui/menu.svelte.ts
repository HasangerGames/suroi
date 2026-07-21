import { invalidate } from "$app/navigation";
import { GameInfo } from "$common/schemas/api/games";
import type { GameMode, Region, TeamMode } from "$common/schemas/misc";
import { m } from "$lib/paraglide/messages";
import { Config } from "../utils/config";

export let joinGame: (gameInfo: GameInfo) => Promise<void>;
export function setJoinGame(value: (gameInfo: GameInfo) => Promise<void>): void {
    joinGame = value;
}

export let endGame: () => void;
export function setEndGame(value: () => void): void {
    endGame = value;
}

let lastPlayButtonClickTime = 0;
export async function play() {
    if (menuUi.state !== "menu") return;

    const now = Date.now();
    if (now - lastPlayButtonClickTime < 1500) return; // Play button rate limit
    lastPlayButtonClickTime = now;

    menuUi.state = "connecting";

    let gameInfo: GameInfo | undefined;
    if (menuUi.selectedGameId === "new") {
        try {
            menuUi.connectingText = m.loading_creating_game();
            const response = await fetch(`${Config.regions[menuUi.newRegion].mainAddress}/api/game/new/${menuUi.newGameMode}/${menuUi.newTeamMode}`);
            gameInfo = {
                ...GameInfo.parse(await response.json()),
                region: menuUi.newRegion,
            };
        } catch (e) {
            menuUi.state = "menu";
            menuUi.serverError = m.error_creating_game();
            console.error(e);
            invalidate("app:games");
            return;
        }
    } else if (menuUi.selectedGameId !== undefined) {
        gameInfo = menuUi.games?.get(menuUi.selectedGameId);
    }

    menuUi.selectedGameId = undefined;

    if (!gameInfo) {
        menuUi.state = "menu";
        menuUi.serverError = m.error_finding_game();
        invalidate("app:games");
        return;
    }

    menuUi.connectingText = m.loading_connecting();
    await joinGame(gameInfo);
}

export const menuUi = $state<{
    state: "menu" | "connecting" | "inGame";
    connectingText?: string;
    serverError?: string;

    games: Map<string, GameInfo>;

    newRegion: Region;
    newGameMode: GameMode;
    newTeamMode: TeamMode;

    selectedGameId?: string;
}>({
    state: "menu",
    games: new Map(),
    newRegion: Config.defaultRegion,
    newGameMode: "normal",
    newTeamMode: "solo",
});
