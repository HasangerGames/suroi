import { FSWatcher, watch } from "chokidar";
import * as path from "path";
import { type Plugin, type ResolvedConfig } from "vite";
import { readDirectory } from "../../../common/src/utils/readDirectory";

const PLUGIN_NAME = "import-paths-plugin";

export function importPathsPlugin(
    pluginConfig: {
        folders: string[]
        moduleName: string
    }
): Plugin[] {
    let watcher: FSWatcher;
    let config: ResolvedConfig;

    let paths: string[] = [];

    const pluginVirtualModuleId = `virtual:${pluginConfig.moduleName}`;
    const pluginResolvedVirtualModuleId = `\0${pluginVirtualModuleId}`;

    const resolveId = (id: string): string | undefined => {
        if (id === pluginVirtualModuleId) return pluginResolvedVirtualModuleId;
    };

    const load = (id: string): string | undefined => {
        if (id === pluginResolvedVirtualModuleId) {
            return `export const paths=${JSON.stringify(paths)}`;
        }
    };

    const updatePaths = (): void => {
        paths = pluginConfig.folders.map(
            p => readDirectory(path.join(config.root, p))
                .map(p => {
                    return `./${path.relative(config.publicDir, p)}`.replace(/\\/g, "/");
                })
        ).flat();
    };

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            configResolved(cfg) {
                config = cfg;
            },
            async buildStart() {
                updatePaths();
            },
            resolveId,
            load
        },
        {
            name: `${PLUGIN_NAME}:serve`,
            apply: "serve",
            configResolved(cfg) {
                config = cfg;
            },
            async configureServer(server) {
                const reloadPage = (): void => {
                    updatePaths();

                    const module = server.moduleGraph.getModuleById(pluginResolvedVirtualModuleId);
                    if (module !== undefined) void server.reloadModule(module);
                };

                const initWatcher = (): void => {
                    watcher = watch(pluginConfig.folders, {
                        cwd: config.root,
                        ignoreInitial: true
                    })
                        .on("add", reloadPage)
                        .on("change", reloadPage)
                        .on("unlink", reloadPage);
                };
                initWatcher();
                updatePaths();
            },
            closeBundle: async() => {
                await watcher.close();
            },
            resolveId,
            load
        }
    ];
}
