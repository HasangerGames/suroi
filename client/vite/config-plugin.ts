import { FSWatcher, watch } from "chokidar";
import { type Plugin } from "vite";
import z from "zod";
import { ClientConfig } from "../../common/src/schemas/config/clientConfig";
import { GeneralConfig } from "../../common/src/schemas/config/generalConfig";

export const ClientAndGeneralConfig = z.object({
    client: ClientConfig,
    general: GeneralConfig
});

export function suroiConfig(): Plugin[] {
    let watcher: FSWatcher;

    const virtualModuleId = "virtual:suroi-config";
    const resolvedVirtualModuleId = `\0${virtualModuleId}`;

    function resolveId(id: string): string | undefined {
        if (id === virtualModuleId) {
            return resolvedVirtualModuleId;
        }
    }

    function load(id: string): string | undefined {
        if (id === virtualModuleId) {
            return `export default ${JSON.stringify(ClientConfig)}`;
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
                watcher = watch("../config.json", { ignoreInitial: true }).on("change", () => {
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
