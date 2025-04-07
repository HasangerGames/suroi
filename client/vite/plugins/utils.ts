import { readFileSync } from "node:fs";
import { Mode, ModeDefinition, Modes } from "../../../common/src/definitions/modes";
import { resolve } from "node:path";

export function getModeDefs(): ReadonlyArray<readonly [Mode, ModeDefinition]> {
    if (process.env.DEBUG_CLIENT !== "true") return Object.entries(Modes) as ReadonlyArray<readonly [Mode, ModeDefinition]>;

    // truly awful hack to get the mode name from the server
    // because importing the server config directly causes vite to have a stroke
    const serverConfig = readFileSync(resolve(__dirname, "../../../server/src/config.ts"), "utf8");
    const mapName = serverConfig
        .matchAll(/map: "(.*?)",/g)
        .next()
        .value?.[1]
        .split(":")[0];

    if (mapName in Modes) {
        return [[mapName, Modes[mapName]]];
    }
}
