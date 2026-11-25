import { exists } from "node:fs/promises";
import z from "zod";
import { GeneralConfig } from "$common/schemas/config/generalConfig";
import { ServerConfig } from "$common/schemas/config/serverConfig";
import { mergeDeep } from "$common/utils/misc";

export const ServerAndGeneralConfig = z.object({
    server: ServerConfig,
    general: GeneralConfig
});

let config = await import("../../../config.defaults.json");
if (await exists("../../../config.json")) {
    const userConfig = await import("../../../config.json");
    config = mergeDeep(config, userConfig);
}
const parseResult = ServerAndGeneralConfig.safeParse(config);
if (parseResult.error) {
    throw new Error(`Unable to parse config. Details:\n${z.prettifyError(parseResult.error)}`);
}

export const s = parseResult.data.server;
export const g = parseResult.data.general;
