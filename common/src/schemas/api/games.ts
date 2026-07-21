import z from "zod";
import { GameMode, Port, Region, TeamMode } from "../misc";

export const GameInfo = z.object({
    id: z.string(),
    port: Port,
    gameMode: GameMode,
    teamMode: TeamMode,
    region: Region.optional(),
    playerCount: z.number(),
    startedTime: z.number(),
    ping: z.number().optional()
});
export type GameInfo = z.infer<typeof GameInfo>;

export const GamesApiResponse = z.array(GameInfo);
export type GamesApiResponse = z.infer<typeof GamesApiResponse>;
