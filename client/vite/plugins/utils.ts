import { readFileSync } from "node:fs";
import { Mode, ModeDefinition, Modes } from "../../../common/src/definitions/modes";
import { resolve } from "node:path";

function getModeFromServerConfig(enableDevMode: boolean): { readonly modeName?: Mode | undefined, readonly modeDefs: ReadonlyArray<readonly [Mode, ModeDefinition]> } {
    if (!enableDevMode) return { modeDefs: Object.entries(Modes) as ReadonlyArray<readonly [Mode, ModeDefinition]> };

    // truly awful hack to get the mode name from the server
    // because importing the server config directly causes vite to have a stroke
    const serverConfig = readFileSync(resolve(__dirname, "../../../server/src/config.ts"), "utf8");
    const mode: Mode = serverConfig
        .matchAll(/map: "(.*?)",/g)
        .next()
        .value?.[1]
        .split(":")[0];

    if (mode in Modes) {
        modeName = mode;
        modeDefs = [[mode, Modes[mode]]];
    }
}
