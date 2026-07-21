import { z } from "zod";
import { ServerConfig } from "$common/schemas/config/serverConfig";
import config from "../../config.json";

const parsedConfig = ServerConfig.safeParse(config);
if (parsedConfig.error) {
    throw new Error(`Unable to parse client config. Details:\n${z.prettifyError(parsedConfig.error)}`);
}
export const Config = parsedConfig.data;
