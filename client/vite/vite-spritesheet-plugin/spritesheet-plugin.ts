import { FSWatcher, watch } from "chokidar";
import { existsSync, mkdirSync, readFileSync, statSync } from "fs";
import { readFile } from "fs/promises";
import path, { resolve } from "path";
import { type SpritesheetData } from "pixi.js";
import { type Plugin, type ResolvedConfig } from "vite";
import { Mode, ModeDefinition, Modes, SpritesheetNames } from "../../../common/src/definitions/modes";
import { Atlas, CacheData, type CompilerOptions, createSpritesheets, imageMap, MultiAtlasList } from "./spritesheet";
import { readDirectory } from "../../../common/src/utils/readDirectory";

const PLUGIN_NAME = "vite-spritesheet-plugin";

const compilerOpts = {
    outDir: "atlases",
    margin: 8,
    removeExtensions: true,
    maximumSize: 4096,
    renderOptions: {
        // @ts-expect-error no typings for the msaa property for some reason
        low: { msaa: false },
        // @ts-expect-error no typings for the msaa property for some reason
        high: { msaa: false }
    },
    packerOptions: {}
} satisfies CompilerOptions as CompilerOptions;

const atlases: Partial<MultiAtlasList> = {};

export const cacheDir = ".spritesheet-cache";
if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir);
}

const cache: Partial<Record<SpritesheetNames, CacheData>> = {};

async function buildSpritesheets(
    modeDefs: ReadonlyArray<readonly [Mode, ModeDefinition]>
): Promise<void> {
    const start = performance.now();

    let builtCount = 0;
    const totalCount = modeDefs.length;
    console.log(`Building ${totalCount} spritesheet${totalCount === 1 ? "" : "s"}...`);

    const uncachedModes: Record<string, Record<string, number>> = {};

    await Promise.all(modeDefs.map(async([mode, { spriteSheets }]) => {
        const pathMap = new Map<string, string>();

        const files = spriteSheets
            .flatMap(sheet => readDirectory(`public/img/game/${sheet}`, /\.(png|gif|jpg|bmp|tiff|svg)$/i));

        // Maps have unique keys.
        // Since the filename is used as the key, and mode sprites are added to the map after the common sprites,
        // this method allows mode sprites to override common sprites with the same filename.
        for (const imagePath of files) {
            pathMap.set(imagePath.slice(imagePath.lastIndexOf(path.sep)), imagePath);
        }

        const images = [...pathMap.values()];

        const fileMap: Record<string, number> = images.reduce((fileMap, file) => {
            const { mtimeMs, ctimeMs } = statSync(file);
            fileMap[file] = max(mtimeMs, ctimeMs);
            return fileMap;
        }, {});

        const getCacheData = (): CacheData | undefined => {
            const dataFile = path.join(cacheDir, mode, "data.json");
            if (!existsSync(dataFile)) return;

            const cacheData: CacheData = cache[mode satisfies SpritesheetNames] ?? JSON.parse(readFileSync(dataFile, "utf8")) as CacheData;

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

        const cacheData = getCacheData();
        if (cacheData) {
            console.log(`Spritesheet "${mode}" is cached, skipping (${++builtCount}/${totalCount})`);

            const loadFromCache = async(files: readonly string[]): Promise<Atlas[]> => Promise.all(
                files.map(async file => ({
                    json: JSON.parse(await readFile(path.join(cacheDir, mode, `${file}.json`), "utf8")) as SpritesheetData,
                    image: await readFile(path.join(cacheDir, mode, `${file}.png`))
                }))
            );

            const { low, high } = cacheData.atlasFiles;
            atlases[mode] = {
                low: await loadFromCache(low),
                high: await loadFromCache(high)
            };
        } else {
            uncachedModes[mode] = fileMap;
        }
    }));

    const sheetsToBuild = Object.entries(uncachedModes);
    if (sheetsToBuild.length) {
        imageMap.clear();

        for (const [mode, fileMap] of sheetsToBuild) {
            const str = `Building spritesheet "${mode}" (${++builtCount}/${totalCount})...`;
            const strLength = str.length;
            process.stdout.write(str);
            const start = performance.now();
            atlases[mode] = await createSpritesheets(mode, fileMap, compilerOpts);
            console.log(`\rBuilt spritesheet "${mode}" in ${Math.round(performance.now() - start) / 1000}s (${builtCount}/${totalCount})`.padEnd(strLength, " "));
        }
    }

    console.log(`Finished building spritesheets in ${Math.round(performance.now() - start) / 1000}s`);
}

const max = (a: number, b: number): number => a > b ? a : b;

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

export function spritesheet(enableDevMode: boolean): Plugin[] {
    let modeName: Mode | undefined;
    let modeDefs: ReadonlyArray<readonly [Mode, ModeDefinition]>;

    const updateModeTarget = (): void => {
        if (enableDevMode) {
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
        modeDefs ??= Object.entries(Modes) as typeof modeDefs;
    };
    updateModeTarget();

    let watcher: FSWatcher;
    let serverConfigWatcher: FSWatcher;
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

    const getSheets = (): Atlas[] => Object.values(atlases).flatMap(sheets => [...sheets.low, ...sheets.high]);

    let buildTimeout: NodeJS.Timeout | undefined;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async buildStart() {
                await buildSpritesheets(modeDefs);

                const { low, high } = exportedAtlases;
                for (const atlasId in atlases) {
                    const atlas = atlases[atlasId as keyof typeof atlases];
                    if (atlas === undefined) continue;

                    high[atlasId] = atlas.high.map(sheet => sheet.json);
                    low[atlasId] = atlas.low.map(sheet => sheet.json);
                }
            },
            generateBundle() {
                for (const sheet of getSheets()) {
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
                const reloadPage = (): void => {
                    clearTimeout(buildTimeout);

                    buildTimeout = setTimeout(() => {
                        buildSheets().then(() => {
                            const module = server.moduleGraph.getModuleById(highResResolvedVirtualModuleId);
                            if (module !== undefined) void server.reloadModule(module);
                            const module2 = server.moduleGraph.getModuleById(lowResResolvedVirtualModuleId);
                            if (module2 !== undefined) void server.reloadModule(module2);
                        }).catch(e => console.error(e));
                    }, 500);
                };

                const initWatcher = (): void => {
                    const foldersToWatch = modeName === undefined
                        ? "public/img/game"
                        : Modes[modeName].spriteSheets.map(sheet => `public/img/game/${sheet}`);

                    watcher = watch(foldersToWatch, {
                        cwd: config.root,
                        ignoreInitial: true
                    })
                        .on("add", reloadPage)
                        .on("change", reloadPage)
                        .on("unlink", reloadPage);
                };
                initWatcher();

                serverConfigWatcher = watch("../server/src/config.ts", {
                    cwd: config.root,
                    ignoreInitial: true
                })
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    .on("change", async() => {
                        updateModeTarget();
                        await watcher.close();
                        initWatcher();
                        reloadPage();
                    });

                const files = new Map<string, Buffer | string>();

                async function buildSheets(): Promise<void> {
                    await buildSpritesheets(modeDefs);

                    const { low, high } = exportedAtlases;
                    for (const atlasId in atlases) {
                        const atlas = atlases[atlasId as keyof typeof atlases];
                        if (atlas === undefined) continue;

                        high[atlasId] = atlas.high.map(sheet => sheet.json);
                        low[atlasId] = atlas.low.map(sheet => sheet.json);
                    }

                    files.clear();
                    for (const sheet of getSheets()) {
                        // consistently assigned in ./spritesheet.ts in function `createSheet` (in function `createSpritesheets`)
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        files.set(sheet.json.meta.image!, sheet.image);
                    }
                }
                await buildSheets();

                return () => {
                    server.middlewares.use((req, res, next) => {
                        if (req.originalUrl === undefined) return next();

                        const file = files.get(req.originalUrl.slice(1));
                        if (file === undefined) return next();

                        res.writeHead(200, { "Content-Type": "image/png" });
                        res.end(file);
                    });
                };
            },
            closeBundle: async() => {
                await watcher.close();
                await serverConfigWatcher.close();
            },
            resolveId,
            load
        }
    ];
}
