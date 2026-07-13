import z from "zod";

export const GameInfo = z.object({
    id: z.string(),
    gameMode: z.string(),
    teamMode: z.enum(["solo", "duo", "squad", "duel"]),
    playerCount: z.number(),
    startedTime: z.number()
});
export type GameInfo = z.infer<typeof GameInfo>;

export const GamesApiResponse = z.array(GameInfo);
export type GamesApiResponse = z.infer<typeof GamesApiResponse>;
