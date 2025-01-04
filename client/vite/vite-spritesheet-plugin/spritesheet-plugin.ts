import { watch } from "chokidar";
import { existsSync, mkdirSync, readFileSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { Minimatch } from "minimatch";
import path from "path";
import { type SpritesheetData } from "pixi.js";
import { type FSWatcher, type Plugin, type ResolvedConfig } from "vite";
import { Modes, SpritesheetNames } from "../../../common/src/definitions/modes";
import readDirectory from "./utils/readDirectory.js";
import { AtlasList, type CompilerOptions, createSpritesheets, MultiAtlasList } from "./utils/spritesheet.js";

const PLUGIN_NAME = "vite-spritesheet-plugin";

export const cacheDir = ".spritesheet-cache";
export interface CacheData {
    lastModified: number
    fileMap: Record<string, number>
    atlasFiles: {
        low: string[]
        high: string[]
    }
}

const defaultGlob = "**/*.{png,gif,jpg,bmp,tiff,svg}";
const imagesMatcher = new Minimatch(defaultGlob);

const compilerOpts = {
    outDir: "atlases",
    margin: 8,
    removeExtensions: true,
    maximumSize: 4096,
    packerOptions: {}
} satisfies CompilerOptions as CompilerOptions;

const atlases: Partial<MultiAtlasList> = {};

const noCache = !existsSync(cacheDir);
if (noCache) mkdirSync(cacheDir);

const cache: Partial<Record<SpritesheetNames, CacheData>> = {};

const atlasIDs = ["shared", ...Object.keys(Modes)] as SpritesheetNames[];
const foldersToWatch = atlasIDs.map(id => `public/img/game/${id}`);

async function buildSpritesheets(): Promise<void> {
    for (const atlasID of atlasIDs) {
        const files = readDirectory(`public/img/game/${atlasID}`)
            .filter(x => imagesMatcher.match(x));

        console.log(`Building spritesheet "${atlasID}" (${files.length} files)...`);

        const fileMap: Record<string, number> = files.reduce((fileMap, file) => {
            const { mtime, ctime } = statSync(file);
            fileMap[file] = Math.max(mtime.getTime(), ctime.getTime());
            return fileMap;
        }, {});

        const getCacheData = (): CacheData | undefined => {
            const dataFile = path.join(cacheDir, atlasID, "data.json");
            if (!existsSync(dataFile)) return;

            const cacheData = JSON.parse(readFileSync(dataFile, "utf8")) as CacheData;

            const paths = Object.keys(fileMap);
            const cachedPaths = Object.keys(cacheData.fileMap);

            if (
                cachedPaths.length !== paths.length
                || Object.entries(fileMap).some(([path, lastModified]) => lastModified !== cacheData.fileMap[path])
                || paths.some(path => !cachedPaths.includes(path))
                || cachedPaths.some(path => !paths.includes(path))
            ) return;

            return cacheData;
        };

        const cacheData = cache[atlasID] ??= getCacheData();
        if (cacheData) {
            console.log(`Spritesheet "${atlasID}" is cached! Skipping build.`);

            const loadFromCache = async(files: string[]): Promise<AtlasList> => Promise.all(
                files.map(async file => ({
                    json: JSON.parse(await readFile(path.join(cacheDir, atlasID, `${file}.json`), "utf8")) as SpritesheetData,
                    image: await readFile(path.join(cacheDir, atlasID, `${file}.png`))
                }))
            );

            const { low, high } = cacheData.atlasFiles;
            atlases[atlasID] = {
                low: await loadFromCache(low),
                high: await loadFromCache(high)
            };
        } else {
            atlases[atlasID] = await createSpritesheets(atlasID, fileMap, compilerOpts);
        }
    }
}

const highResVirtualModuleId = "virtual:spritesheets-jsons-high-res";
const highResResolvedVirtualModuleId = `\0${highResVirtualModuleId}`;

const lowResVirtualModuleId = "virtual:spritesheets-jsons-low-res";
const lowResResolvedVirtualModuleId = `\0${lowResVirtualModuleId}`;

const resolveId = (id: string): string | undefined => {
    switch (id) {
        case highResVirtualModuleId: return highResResolvedVirtualModuleId;
        case lowResVirtualModuleId: return lowResResolvedVirtualModuleId;
    }
};

export function spritesheet(): Plugin[] {
    let watcher: FSWatcher;
    let config: ResolvedConfig;

    const exportedAtlases: {
        readonly low: Record<string, readonly SpritesheetData[]>
        readonly high: Record<string, readonly SpritesheetData[]>
    } = {
        low: {},
        high: {}
    };

    const load = (id: string): string | undefined => {
        switch (id) {
            case highResResolvedVirtualModuleId: return `export const atlases = JSON.parse('${JSON.stringify(exportedAtlases.high)}')`;
            case lowResResolvedVirtualModuleId: return `export const atlases = JSON.parse('${JSON.stringify(exportedAtlases.low)}')`;
        }
    };

    let buildTimeout: NodeJS.Timeout | undefined;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async buildStart() {
                await buildSpritesheets();

                for (const atlasId in atlases) {
                    exportedAtlases.high[atlasId] = atlases[atlasId].high.map(sheet => sheet.json);
                    exportedAtlases.low[atlasId] = atlases[atlasId].low.map(sheet => sheet.json);
                }
            },
            generateBundle() {
                for (const sheet of Object.values(atlases).map(sheets => [...sheets.low, ...sheets.high]).flat()) {
                    this.emitFile({
                        type: "asset",
                        fileName: sheet.json.meta.image,
                        source: sheet.image
                    });
                    this.info(`Built spritesheet ${sheet.json.meta.image}`);
                }
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
                function reloadPage(): void {
                    clearTimeout(buildTimeout);

                    buildTimeout = setTimeout(() => {
                        buildSheets().then(() => {
                            const module = server.moduleGraph.getModuleById(highResResolvedVirtualModuleId);
                            if (module !== undefined) void server.reloadModule(module);
                            const module2 = server.moduleGraph.getModuleById(lowResResolvedVirtualModuleId);
                            if (module2 !== undefined) void server.reloadModule(module2);
                        }).catch(e => console.error(e));
                    }, 500);
                }

                watcher = watch(foldersToWatch.map(pattern => path.resolve(pattern, defaultGlob)), {
                    cwd: config.root,
                    ignoreInitial: true
                })
                    .on("add", reloadPage)
                    .on("change", reloadPage)
                    .on("unlink", reloadPage);

                const files = new Map<string, Buffer | string>();

                async function buildSheets(): Promise<void> {
                    await buildSpritesheets();

                    const { low, high } = exportedAtlases;
                    for (const atlasId in atlases) {
                        high[atlasId] = atlases[atlasId].high.map(sheet => sheet.json);
                        low[atlasId] = atlases[atlasId].low.map(sheet => sheet.json);
                    }

                    files.clear();
                    for (const atlasId in atlases) {
                        const sheets = atlases[atlasId];
                        for (const sheet of [...sheets.low, ...sheets.high]) {
                            // consistently assigned in ./spritesheet.ts in function `createSheet` (in function `createSpritesheets`)
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
            resolveId,
            load
        }
    ];
}
