import { FSWatcher, watch } from "chokidar";
import { createHash } from "crypto";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { type Plugin } from "vite";
import type { Mode, ModeDefinition } from "../../../common/src/definitions/modes";
import { readDirectory } from "../../../common/src/utils/readDirectory";
import { getModeDefs } from "./utils";

export type AudioSpritesheet = Record<string, { start: number, end: number }>;

export interface AudioSpritesheetManifest {
    readonly filename: string
    readonly spritesheet: AudioSpritesheet
}

const PLUGIN_NAME = "vite-audio-spritesheet-plugin";

const audioDirs = readdirSync("public/audio/game").filter(d => d !== "no-preload" && d !== "shared");

const virtualModuleIds = [
    "virtual:audio-spritesheet-importer",
    ...audioDirs.map(dir => `virtual:audio-spritesheet-${dir}`)
];

const files = new Map<string, Buffer>();
const modules = new Map<string, string>();

const cases = audioDirs.map(dir => {
    return `case "${dir}":return await import("virtual:audio-spritesheet-${dir}");`;
}).join("");
const importer = `export const importSpritesheet=async t=>{switch(t){${cases}}}`;
modules.set("virtual:audio-spritesheet-importer", importer);

const resolveId = (id: string): string | undefined => virtualModuleIds.includes(id) ? id : undefined;
const load = (id: string): string | undefined => modules.get(id);

async function buildSpritesheets(
    modeDefs: ReadonlyArray<readonly [Mode, ModeDefinition]>
): Promise<void> {
    console.log("Building audio spritesheets...");
    const start = performance.now();

    for (const [mode, { spriteSheets }] of modeDefs) {
        // Maps have unique keys.
        // Since the filename is used as the key, and mode sprites are added to the map after the common sprites,
        // this method allows mode sprites to override common sprites with the same filename.
        const pathMap = new Map<string, string>();
        const audioFiles = spriteSheets.flatMap(sheet => readDirectory(`public/audio/game/${sheet}`, /\.mp3$/i));
        for (const audioPath of audioFiles) {
            const filename = audioPath.slice(audioPath.lastIndexOf(path.sep));
            pathMap.set(filename, path.relative(".", audioPath));
        }

        let currentIdx = 0;
        const sheet: AudioSpritesheet = {};
        const buffers: Buffer[] = [];
        for (const path of pathMap.values()) {
            const buffer = readFileSync(path);
            buffers.push(buffer);
            const length = buffer.byteLength;
            const filename = path.slice(path.lastIndexOf("/") + 1, -4); // remove path and extension
            sheet[filename] = {
                start: currentIdx,
                end: currentIdx + length
            };
            currentIdx += length;
        }

        const audio = Buffer.concat(buffers);
        const filename = `audio/${mode}-${createHash("sha1").update(audio).digest("hex").slice(0, 8)}.mp3`;
        files.set(filename, audio);
        modules.set(`virtual:audio-spritesheet-${mode}`, `export const filename="${filename}";export const spritesheet=${JSON.stringify(sheet)}`);
    }

    console.log(`Built ${modeDefs.length} audio spritesheet${modeDefs.length === 1 ? "" : "s"} in ${Math.round(performance.now() - start)} ms`);
}

export function audioSpritesheet(): Plugin[] {
    let modeDefs = getModeDefs();

    let watcher: FSWatcher;
    let serverConfigWatcher: FSWatcher;
    let buildTimeout: NodeJS.Timeout | undefined;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async buildStart() {
                await buildSpritesheets(modeDefs);
            },
            generateBundle() {
                for (const [fileName, source] of files) {
                    this.emitFile({ type: "asset", fileName, source });
                }
            },
            resolveId,
            load
        },
        {
            name: `${PLUGIN_NAME}:serve`,
            apply: "serve",
            async configureServer(server) {
                void buildSpritesheets(modeDefs);

                const reloadPage = (): void => {
                    clearTimeout(buildTimeout);
                    buildTimeout = setTimeout(() => {
                        buildSpritesheets(modeDefs).then(() => {
                            for (const [mode] of modeDefs) {
                                const module = server.moduleGraph.getModuleById(`virtual:audio-spritesheet-${mode}`);
                                if (module !== undefined) void server.reloadModule(module);
                            }
                        }).catch(e => console.error(e));
                    }, 500);
                };

                watcher = watch("public/audio/game", { ignoreInitial: true })
                    .on("add", reloadPage)
                    .on("change", reloadPage)
                    .on("unlink", reloadPage);

                serverConfigWatcher = watch(["../server/src/config.ts", "../server/src/data/maps.ts"])
                    .on("change", () => {
                        const newModeDefs = getModeDefs();
                        let modeDefsChanged = false;
                        if (newModeDefs.length !== modeDefs.length) {
                            modeDefsChanged = true;
                        } else {
                            for (let i = 0, len = modeDefs.length; i < len; i++) {
                                if (modeDefs[i] !== newModeDefs[i]) {
                                    modeDefsChanged = true;
                                    break;
                                }
                            }
                        }
                        if (!modeDefsChanged) return;
                        modeDefs = newModeDefs;
                        reloadPage();
                    });

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
