import { FSWatcher, watch } from "chokidar";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "fs";
import { readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { type Plugin, type ResolvedConfig } from "vite";
import { Mode, ModeDefinition, SpritesheetNames } from "../../../common/src/definitions/modes";
import { readDirectory } from "../../../common/src/utils/readDirectory";
import { getModeDefs } from "./utils";

const PLUGIN_NAME = "vite-audio-spritesheet-plugin";

export interface Atlas {
    readonly json: AudioSpritesheet
    readonly audio: Buffer
    readonly cacheName?: string
}

export type AudioSpritesheet = Record<string, { start: number, end: number }>;

export type MultiAtlasList = Record<SpritesheetNames, AudioSpritesheet>;

export interface CacheData {
    lastModified: number
    fileMap: Record<string, number>
    filename: string
}

export const cacheDir = ".spritesheet-cache/audio";
if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
}

const cache: Partial<Record<SpritesheetNames, CacheData>> = {};
const sheets: Partial<Record<Mode, { json: string, audio: Buffer, filename: string }>> = {};

async function buildSpritesheets(
    modeDefs: ReadonlyArray<readonly [Mode, ModeDefinition]>
): Promise<void> {
    const start = performance.now();

    let builtCount = 0;
    const totalCount = modeDefs.length;
    console.log(`Building ${totalCount} audio spritesheet${totalCount === 1 ? "" : "s"}...`);

    const uncachedModes: Record<string, Record<string, number>> = {};

    await Promise.all(modeDefs.map(async([mode, { spriteSheets }]) => {
        const pathMap = new Map<string, string>();

        const files = spriteSheets.flatMap(sheet => readDirectory(`public/audio/game/${sheet}`, /\.mp3$/i));

        // Maps have unique keys.
        // Since the filename is used as the key, and mode sprites are added to the map after the common sprites,
        // this method allows mode sprites to override common sprites with the same filename.
        for (const audioPath of files) {
            const filename = audioPath.slice(audioPath.lastIndexOf(path.sep));
            pathMap.set(filename, path.relative(".", audioPath));
        }

        const fileMap: Record<string, number> = {};
        for (const file of pathMap.values()) {
            const { mtimeMs, ctimeMs } = statSync(file);
            fileMap[file] = mtimeMs > ctimeMs ? mtimeMs : ctimeMs;
        }

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
            console.log(`Audio spritesheet "${mode}" is cached, skipping (${++builtCount}/${totalCount})`);

            const filename = cacheData.filename;
            sheets[mode] = {
                json: await readFile(path.join(cacheDir, mode, `${filename}.json`), "utf8"),
                audio: await readFile(path.join(cacheDir, mode, `${filename}.mp3`)),
                filename
            };
        } else {
            uncachedModes[mode] = fileMap;
        }
    }));

    const sheetsToBuild = Object.entries(uncachedModes);
    if (sheetsToBuild.length) {
        for (const [mode, fileMap] of sheetsToBuild) {
            console.log(`Building audio spritesheet "${mode}" (${++builtCount}/${totalCount})...`);
            const start = performance.now();

            const atlasCacheDir = path.join(cacheDir, mode);
            if (existsSync(atlasCacheDir)) {
                await Promise.all(
                    readdirSync(atlasCacheDir)
                        .map(async file => await rm(path.join(atlasCacheDir, file)))
                );
            } else {
                mkdirSync(atlasCacheDir);
            }

            let currentIdx = 0;
            const sheet: AudioSpritesheet = {};
            const buffers: Buffer[] = [];
            for (const file of Object.keys(fileMap)) {
                const buffer = readFileSync(file);
                buffers.push(buffer);
                const length = buffer.byteLength;
                const filename = file.slice(file.lastIndexOf("/") + 1, -4); // remove path and extension
                sheet[filename] = {
                    start: currentIdx,
                    end: currentIdx + length
                };
                currentIdx += length;
            }

            const json = JSON.stringify(sheet);
            const audio = Buffer.concat(buffers);
            const filename = `${mode}-${createHash("sha1").update(audio).digest("hex").slice(0, 8)}`;

            void writeFile(path.join(atlasCacheDir, `${filename}.json`), json);
            void writeFile(path.join(atlasCacheDir, `${filename}.mp3`), audio);

            sheets[mode] = { json, audio, filename };

            const cacheData: CacheData = {
                lastModified: Date.now(),
                fileMap,
                filename
            };
            void writeFile(path.join(atlasCacheDir, "data.json"), JSON.stringify(cacheData));

            console.log(`Built audio spritesheet "${mode}" in ${Math.round(performance.now() - start) / 1000}s (${builtCount}/${totalCount})`);
        }
    }

    console.log(`Finished building audio spritesheets in ${Math.round(performance.now() - start) / 1000}s`);
}

const audioDirs = readdirSync("public/audio/game");

const virtualModuleIds = [
    "virtual:audio-spritesheet-manifest",
    ...audioDirs.map(dir => `virtual:audio-spritesheet-${dir}`)
];

const cases = audioDirs.map(dir => {
    return `case "${dir}":return (await import("virtual:audio-spritesheet-${dir}")).spritesheet;`;
}).join("");
const manifest = `export const importSpritesheet=async t=>{switch(t){${cases}}}`;

export function audioSpritesheet(): Plugin[] {
    let modeDefs = getModeDefs();

    let watcher: FSWatcher;
    let serverConfigWatcher: FSWatcher;
    let config: ResolvedConfig;
    let buildTimeout: NodeJS.Timeout | undefined;

    const resolveId = (id: string): string | undefined => virtualModuleIds.includes(id) ? id : undefined;
    const load = (id: string): string | undefined => id === "virtual:audio-spritesheet-manifest" ? manifest : sheets[id as Mode]?.json;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async buildStart() {
                await buildSpritesheets(modeDefs);
            },
            generateBundle() {
                for (const sheet of Object.values(sheets)) {
                    this.emitFile({
                        type: "asset",
                        fileName: sheet.filename,
                        source: sheet.audio
                    });
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
                            // const module = server.moduleGraph.getModuleById(highResVirtualModuleId);
                            // if (module !== undefined) void server.reloadModule(module);
                            // const module2 = server.moduleGraph.getModuleById(lowResVirtualModuleId);
                            // if (module2 !== undefined) void server.reloadModule(module2);
                        }).catch(e => console.error(e));
                    }, 500);
                };

                watcher = watch("public/audio/game", { ignoreInitial: true })
                    .on("add", reloadPage)
                    .on("change", reloadPage)
                    .on("unlink", reloadPage);

                serverConfigWatcher = watch("../server/src/config.ts")
                    .on("change", () => {
                        modeDefs = getModeDefs();
                        reloadPage();
                    });

                const files = new Map<string, Buffer | string>();

                async function buildSheets(): Promise<void> {
                    await buildSpritesheets(modeDefs);

                    files.clear();
                    for (const sheet of Object.values(sheets)) {
                        files.set(sheet.filename, sheet.audio);
                    }
                }
                await buildSheets();

                return () => {
                    server.middlewares.use((req, res, next) => {
                        if (req.originalUrl === undefined) return next();

                        const file = files.get(req.originalUrl.slice(1));
                        if (file === undefined) return next();

                        res.writeHead(200, { "Content-Type": "audio/mp3" });
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
