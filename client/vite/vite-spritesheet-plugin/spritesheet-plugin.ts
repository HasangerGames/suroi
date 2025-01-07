import { FSWatcher, watch } from "chokidar";
import { existsSync, mkdirSync, readFileSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { Minimatch } from "minimatch";
import path from "path";
import { type SpritesheetData } from "pixi.js";
import { type Plugin, type ResolvedConfig } from "vite";
import { Modes, SpritesheetNames } from "../../../common/src/definitions/modes";
import readDirectory from "./utils/readDirectory.js";
import { Atlas, type CompilerOptions, createSpritesheets, MultiAtlasList } from "./utils/spritesheet.js";
import { Image, loadImage } from "skia-canvas";

const PLUGIN_NAME = "vite-spritesheet-plugin";

const imagesMatcher = new Minimatch("**/*.{png,gif,jpg,bmp,tiff,svg}");

const compilerOpts = {
    outDir: "atlases",
    margin: 8,
    removeExtensions: true,
    maximumSize: 4096,
    packerOptions: {}
} satisfies CompilerOptions as CompilerOptions;

const atlases: Partial<MultiAtlasList> = {};

export const cacheDir = ".spritesheet-cache";
if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir);
}

export interface CacheData {
    lastModified: number
    fileMap: Record<string, number>
    atlasFiles: {
        low: string[]
        high: string[]
    }
}

const cache: Partial<Record<SpritesheetNames, CacheData>> = {};

async function buildSpritesheets(): Promise<void> {
    let builtCount = 0;
    const modeEntries = Object.entries(Modes);
    const totalCount = modeEntries.length;
    console.log(`Building ${totalCount} spritesheets...`);
    const start = performance.now();

    const uncachedModes: Record<string, Record<string, number>> = {};
    const imagePaths: string[] = [];

    await Promise.all(modeEntries.map(async([mode, modeDef]) => {
        const pathMap = new Map<string, string>();

        const files = modeDef.spriteSheets
            .flatMap(sheet => readDirectory(`public/img/game/${sheet}`))
            .filter(x => imagesMatcher.match(x));

        // Maps have unique keys.
        // Since the filename is used as the key, and mode sprites are added to the map after the common sprites,
        // this method allows mode sprites to override common sprites with the same filename.
        for (const imagePath of files) {
            pathMap.set(imagePath.slice(imagePath.lastIndexOf(path.sep)), imagePath);
        }

        const images = [...pathMap.values()];

        const fileMap: Record<string, number> = images.reduce((fileMap, file) => {
            const { mtime, ctime } = statSync(file);
            fileMap[file] = Math.max(mtime.getTime(), ctime.getTime());
            return fileMap;
        }, {});

        const getCacheData = (): CacheData | undefined => {
            const dataFile = path.join(cacheDir, mode, "data.json");
            if (!existsSync(dataFile)) return;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const cacheData: CacheData = cache[mode] ?? JSON.parse(readFileSync(dataFile, "utf8")) as CacheData;

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

            const loadFromCache = async(files: string[]): Promise<Atlas[]> => Promise.all(
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
            imagePaths.push(...images);
        }
    }));

    if (Object.keys(uncachedModes).length) {
        console.log("\nLoading images...");
        const start = performance.now();
        const imageMap = new Map<string, Image>();
        await Promise.all([...new Set(imagePaths)].map(async path => imageMap.set(path, await loadImage(path))));
        console.log(`Loaded ${imagePaths.length} images in ${Math.round(performance.now() - start) / 1000}s\n`);

        const uncachedModeEntries = Object.entries(uncachedModes);
        for (const [mode, fileMap] of uncachedModeEntries) {
            console.log(`Building spritesheet "${mode}" (${++builtCount}/${totalCount})...`);
            const start = performance.now();
            atlases[mode] = await createSpritesheets(mode, fileMap, imageMap, compilerOpts);
            console.log(`Built spritesheet "${mode}" in ${Math.round(performance.now() - start) / 1000}s (${builtCount}/${totalCount})\n`);
        }
    }

    console.log(`Finished building spritesheets in ${Math.round(performance.now() - start) / 1000}s`);
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

    const getSheets = (): Atlas[] => Object.values(atlases).flatMap(sheets => [...sheets.low, ...sheets.high]);

    let buildTimeout: NodeJS.Timeout | undefined;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async buildStart() {
                await buildSpritesheets();

                for (const atlasId in atlases) {
                    // seriously eslint stfu
                    /*
                        eslint-disable
                        @typescript-eslint/no-unsafe-assignment,
                        @typescript-eslint/no-unsafe-call,
                        @typescript-eslint/no-unsafe-member-access,
                        @typescript-eslint/no-unsafe-return
                    */
                    exportedAtlases.high[atlasId] = atlases[atlasId].high.map(sheet => sheet.json);
                    exportedAtlases.low[atlasId] = atlases[atlasId].low.map(sheet => sheet.json);
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

                watcher = watch("public/img/game", {
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
            },
            resolveId,
            load
        }
    ];
}
