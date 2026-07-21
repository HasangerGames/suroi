import z from "zod";

export const Port = z.int().positive().max(65535);
export type Port = z.infer<typeof Port>;

export const UrlNoTrailingSlash = z.url().refine(u => !u.endsWith("/"), { error: "URL must not end with a trailing slash" });
export type UrlNoTrailingSlash = z.infer<typeof UrlNoTrailingSlash>;

export const GameMode = z.enum(["normal", "fall", "halloween", "infection", "hunted", "birthday", "winter", "nye"]);
export type GameMode = z.infer<typeof GameMode>;

export const TeamMode = z.enum(["solo", "duo", "squad", "duel"]);
export type TeamMode = z.infer<typeof TeamMode>;

export const Region = z.enum(["dev", "na", "sa", "eu", "as"]);
export type Region = z.infer<typeof Region>;
