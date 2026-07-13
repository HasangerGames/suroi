export interface GameInfo {
    id: string;
    gameMode: string;
    teamMode: "solo" | "duo" | "squad" | "duel";
    playerCount: number;
    timeStarted: number;
}
