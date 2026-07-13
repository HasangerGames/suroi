import type { GameInfo } from "$common/typings/api/games";

export let joinGame: () => Promise<void>;
export function setJoinGame(value: () => Promise<void>): void {
    joinGame = value;
}

export let endGame: () => Promise<void>;
export function setEndGame(value: () => Promise<void>): void {
    endGame = value;
}

export interface MenuUi {
    state: "menu" | "connecting" | "inGame";
    region?: string;
    games?: GameInfo[];
    connectingText?: string;
    serverError?: string;
}

export const menuUi = $state<MenuUi>({
    state: "menu"
});
