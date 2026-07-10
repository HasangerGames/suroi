import * as z from "zod";
import { type TeamMode } from "$common/constants";
import type { ModeName } from "$common/definitions/modes";
import { ClientConfig } from "$common/schemas/config/clientConfig";

const parsedConfig = ClientConfig.safeParse((await import("../../../config.json")).default);
if (parsedConfig.error) {
    throw new Error(`Unable to parse client config. Details:\n${z.prettifyError(parsedConfig.error)}`);
}
export const Config = parsedConfig.data;

export interface ServerInfo {
    readonly protocolVersion: number
    readonly playerCount: number
    readonly teamMode: TeamMode
    readonly teamModeSwitchTime: number
    readonly mode: ModeName
    readonly modeSwitchTime: number
}
