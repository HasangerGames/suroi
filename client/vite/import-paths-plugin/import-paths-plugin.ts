import { FSWatcher, watch } from "chokidar";
import { readdirSync, statSync } from "fs";
import * as path from "path";
import { type Plugin, type ResolvedConfig } from "vite";

const PLUGIN_NAME = "import-paths-plugin";

/**
 * Recursively read a directory.
 * @param dir The absolute path to the directory.
 * @returns An array representation of the directory's contents.
 */
function readDirectory(dir: string): string[] {
    let results: string[] = [];

    for (const file of readdirSync(dir)) {
        const filePath = path.resolve(dir, file);
        const stat = statSync(filePath);

        if (stat?.isDirectory()) {
            results = results.concat(readDirectory(filePath));
        } else {
            results.push(filePath);
        }
    }

    return results;
}

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
            return `export const paths = ${JSON.stringify(paths)}`;
        }
    };

    const updatePaths = (): void => {
        paths = pluginConfig.folders.map(
            p => readDirectory(path.join(config.root, p))
                .map(p => {
                    return `./${path.relative(config.publicDir, p)}`;
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
