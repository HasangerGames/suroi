export let joinGame: () => Promise<void>;
export function setJoinGame(value: () => Promise<void>): void {
    joinGame = value;
}

export interface GameState {
    state: "menu" | "connecting" | "inGame"
    connectingText?: string
    serverError?: string
}

export const gameState = $state<GameState>({
    state: "menu"
});
