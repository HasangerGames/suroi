import * as z from "zod";
import { ClientConfig } from "$common/schemas/config/clientConfig";

const parsedConfig = ClientConfig.safeParse((await import("../../../../config.json")).default);
if (parsedConfig.error) {
    throw new Error(`Unable to parse client config. Details:\n${z.prettifyError(parsedConfig.error)}`);
}
export const Config = parsedConfig.data;
