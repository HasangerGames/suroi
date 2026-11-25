import { FSWatcher, watch } from "chokidar";
import { type Plugin } from "vite";
import z from "zod";
import { ClientConfig } from "../../common/src/schemas/config/clientConfig";
import { GeneralConfig } from "../../common/src/schemas/config/generalConfig";
import { mergeDeep } from "../../common/src/utils/misc";
import { existsSync, readFileSync } from "node:fs";

export const ClientAndGeneralConfig = z.object({
    client: ClientConfig,
    general: GeneralConfig
});
export type ClientAndGeneralConfig = z.infer<typeof ClientAndGeneralConfig>;

export function suroiConfig(): Plugin[] {
    let watcher: FSWatcher;

    const virtualModuleId = "virtual:suroi-config";
    const resolvedVirtualModuleId = `\0${virtualModuleId}`;

    function resolveId(id: string): string | undefined {
        if (id === virtualModuleId) {
            return resolvedVirtualModuleId;
        }
    }

    async function load(id: string): Promise<string | undefined> {
        if (id === resolvedVirtualModuleId) {
            let config = await import("../../config.defaults.json");
            if (existsSync("../../config.json")) {
                const userConfig = JSON.parse(readFileSync("../../config.json", "utf8"));
                config = mergeDeep(config, userConfig);
            }
            const parseResult = ClientAndGeneralConfig.safeParse(config);
            if (parseResult.error) {
                throw new Error(`Unable to parse config. Details:\n${z.prettifyError(parseResult.error)}`);
            }
            return `export default ${JSON.stringify(parseResult.data)}`;
        }
    }

    return [
        {
            name: "vite-suroi-config-plugin:build",
            apply: "build",
            resolveId,
            load
        },
        {
            name: "vite-suroi-config-plugin:serve",
            apply: "serve",
            enforce: "pre",
            configureServer(server) {
                watcher = watch(["../config.json", "../config.defaults.json"], { ignoreInitial: true }).on("change", () => {
                    const module = server.moduleGraph.getModuleById(virtualModuleId);
                    if (module !== undefined) void server.reloadModule(module);
                });
            },
            closeBundle: async() => {
                await watcher.close();
            },
            resolveId,
            load
        }
    ];
}
