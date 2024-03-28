import type { FSWatcher, Plugin, ResolvedConfig } from "vite";
import { watch } from "chokidar";
import { Minimatch } from "minimatch";

import readDirectory from "./utils/readDirectory.js";
import { type CompilerOptions, createSpritesheets, type multiResAtlasList } from "./utils/spritesheet.js";
import { resolve } from "path";
import { ModeAtlases } from "../../../common/src/definitions/modes";
import { type SpritesheetData } from "pixi.js";

const defaultGlob = "**/*.{png,gif,jpg,bmp,tiff,svg}";
const imagesMatcher = new Minimatch(defaultGlob);

const PLUGIN_NAME = "vite-spritesheet-plugin";

const compilerOpts = {
    outputFormat: "png",
    outDir: "atlases",
    margin: 8,
    removeExtensions: true,
    maximumSize: 4096,
    name: "",
    packerOptions: {}
} satisfies CompilerOptions as CompilerOptions;

const atlasesToBuild: Record<string, string> = {
    main: "public/img/game"
};

for (const atlasId of ModeAtlases) {
    atlasesToBuild[atlasId] = `public/img/modes/${atlasId}`;
}

const foldersToWatch = Object.values(atlasesToBuild);

async function buildSpritesheets(): Promise<multiResAtlasList> {
    const atlases: multiResAtlasList = {};

    for (const atlasId in atlasesToBuild) {
        const files: string[] = readDirectory(atlasesToBuild[atlasId]).filter(x => imagesMatcher.match(x));
        atlases[atlasId] = await createSpritesheets(files, {
            ...compilerOpts,
            name: atlasId
        });
    }

    return atlases;
}

export function spritesheet(): Plugin[] {
    let watcher: FSWatcher;
    let config: ResolvedConfig;

    const highResVirtualModuleId = "virtual:spritesheets-jsons-high-res";
    const highResresolvedVirtualModuleId = `\0${highResVirtualModuleId}`;

    const lowResVirtualModuleId = "virtual:spritesheets-jsons-low-res";
    const lowResResolvedVirtualModuleId = `\0${lowResVirtualModuleId}`;

    let atlases: multiResAtlasList = {};

    const exportedAtlases: {
        low: Record<string, SpritesheetData[]>
        high: Record<string, SpritesheetData[]>
    } = {
        low: {},
        high: {}
    };

    let buildTimeout: NodeJS.Timeout | undefined;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async buildStart() {
                this.info("Building spritesheets");
                atlases = await buildSpritesheets();

                for (const atlasId in atlases) {
                    exportedAtlases.high[atlasId] = atlases[atlasId].high.map(sheet => sheet.json);
                    exportedAtlases.low[atlasId] = atlases[atlasId].low.map(sheet => sheet.json);
                }
            },
            generateBundle() {
                for (const atlasId in atlases) {
                    const sheets = atlases[atlasId];
                    for (const sheet of [...sheets.low, ...sheets.high]) {
                        this.emitFile({
                            type: "asset",
                            fileName: sheet.json.meta.image,
                            source: sheet.image
                        });
                        this.info(`Built spritesheet ${sheet.json.meta.image}`);
                    }
                }
            },
            resolveId(id) {
                if (id === highResVirtualModuleId) {
                    return highResresolvedVirtualModuleId;
                } else if (id === lowResVirtualModuleId) {
                    return lowResResolvedVirtualModuleId;
                }
            },
            load(id) {
                if (id === highResresolvedVirtualModuleId) {
                    return `export const atlases = JSON.parse('${JSON.stringify(exportedAtlases.high)}')`;
                } else if (id === lowResResolvedVirtualModuleId) {
                    return `export const atlases = JSON.parse('${JSON.stringify(exportedAtlases.low)}')`;
                }
            }
        },
        {
            name: `${PLUGIN_NAME}:serve`,
            apply: "serve",
            configResolved(cfg) {
                config = cfg;
            },
            async configureServer(server) {
                function reloadPage(): void {
                    clearTimeout(buildTimeout);

                    buildTimeout = setTimeout(() => {
                        config.logger.info("Rebuilding spritesheets");

                        buildSheets().then(() => {
                            const module = server.moduleGraph.getModuleById(highResVirtualModuleId);
                            if (module !== undefined) void server.reloadModule(module);
                            const module2 = server.moduleGraph.getModuleById(lowResVirtualModuleId);
                            if (module2 !== undefined) void server.reloadModule(module2);
                        }).catch(console.error);
                    }, 500);
                }

                watcher = watch(foldersToWatch.map(pattern => resolve(pattern, defaultGlob)), {
                    cwd: config.root,
                    ignoreInitial: true
                })
                    .on("add", reloadPage)
                    .on("change", reloadPage)
                    .on("unlink", reloadPage);

                const files = new Map<string, Buffer | string>();

                async function buildSheets(): Promise<void> {
                    atlases = await buildSpritesheets();

                    for (const atlasId in atlases) {
                        exportedAtlases.high[atlasId] = atlases[atlasId].high.map(sheet => sheet.json);
                        exportedAtlases.low[atlasId] = atlases[atlasId].low.map(sheet => sheet.json);
                    }

                    files.clear();
                    for (const atlasId in atlases) {
                        const sheets = atlases[atlasId];
                        for (const sheet of [...sheets.low, ...sheets.high]) {
                            files.set(sheet.json.meta.image!, sheet.image);
                        }
                    }
                }
                await buildSheets();

                return () => {
                    server.middlewares.use((req, res, next) => {
                        if (req.originalUrl === undefined) return next();

                        const file = files.get(req.originalUrl.slice(1));
                        if (file === undefined) return next();

                        res.writeHead(200, {
                            "Content-Type": `image/${compilerOpts.outputFormat}`
                        });

                        res.end(file);
                    });
                };
            },
            closeBundle: async() => {
                await watcher.close();
            },
            resolveId(id) {
                if (id === highResVirtualModuleId) {
                    return highResresolvedVirtualModuleId;
                } else if (id === lowResVirtualModuleId) {
                    return lowResResolvedVirtualModuleId;
                }
            },
            load(id) {
                if (id === highResresolvedVirtualModuleId) {
                    return `export const atlases = JSON.parse('${JSON.stringify(exportedAtlases.high)}')`;
                } else if (id === lowResResolvedVirtualModuleId) {
                    return `export const atlases = JSON.parse('${JSON.stringify(exportedAtlases.low)}')`;
                }
            }
        }
    ];
}
