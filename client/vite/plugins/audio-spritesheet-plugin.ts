import { FSWatcher, watch } from "chokidar";
import { readFileSync } from "fs";
import path from "path";
import { type Plugin } from "vite";
import { type GameMode, GameModes, type SpritesheetNames } from "../../../common/src/definitions/gameModes";
import { readDirectory } from "../../../common/src/utils/readDirectory";
import { getPaths, shortHash } from "./utils";

export interface AudioSpritesheetImporter {
    readonly importSpritesheet: (name: string) => Promise<AudioSpritesheetManifest>
}

export interface AudioSpritesheetManifest {
    readonly filename: string
    /** key = sound name, value = byte length */
    readonly spritesheet: Record<string, number>
}

const modeNames = Object.keys(GameModes) as GameMode[];

const virtualModuleIds = [
    "virtual:audio-spritesheet-importer",
    "virtual:audio-spritesheet-no-preload",
    ...modeNames.map(modeName => `virtual:audio-spritesheet-${modeName}`)
];

const files = new Map<string, Buffer>();
const modules = new Map<string, string>();

const cases = modeNames.map(dir => {
    return `case "${dir}":return await import("virtual:audio-spritesheet-${dir}");`;
}).join("");
const importer = `export const importSpritesheet=async t=>{switch(t){${cases}}}`;
modules.set("virtual:audio-spritesheet-importer", importer);

const resolveId = (id: string): string | undefined => virtualModuleIds.includes(id) ? id : undefined;

const load = async(id: string): Promise<string | undefined> => {
    if (!virtualModuleIds.includes(id)) return;
    let data = modules.get(id);
    if (!data) {
        const moduleName = id.match(/virtual:audio-spritesheet-(.*)/)?.[1] as GameMode | "no-preload";
        if (moduleName === "no-preload") await getNoPreloadPaths();
        else await buildSpritesheet(moduleName);
        data = modules.get(id);
    }
    return data;
};

const removePathAndExtension = (f: string): string => f.slice(f.lastIndexOf(path.sep) + 1, -4);

function buildSpritesheet(modeName: GameMode): void {
    const start = performance.now();

    const sheet: Record<string, number> = {};
    const buffers: Buffer[] = [];
    for (const filePath of getPaths(modeName, "audio", /\.mp3$/i)) {
        const buffer = readFileSync(filePath);
        buffers.push(buffer);
        sheet[removePathAndExtension(filePath)] = buffer.byteLength;
    }

    const audio = Buffer.concat(buffers);
    const filename = `audio/atlases/${modeName}-${shortHash(audio)}.mp3`;
    files.set(filename, audio);
    modules.set(`virtual:audio-spritesheet-${modeName}`, `export const filename="${filename}";export const spritesheet=${JSON.stringify(sheet)}`);

    console.log(`Built audio spritesheet "${modeName}" in ${Math.round(performance.now() - start)} ms`);
}

function getNoPreloadPaths(): void {
    const noPreloadSounds: string[] = readDirectory("static/audio/game/no-preload", /\.mp3$/i)
        .map(removePathAndExtension);

    modules.set("virtual:audio-spritesheet-no-preload", `export const noPreloadSounds=${JSON.stringify(noPreloadSounds)}`);

    console.log("Updated paths of no preload sounds");
}

export function audioSpritesheet(): Plugin[] {
    let watcher: FSWatcher;

    return [
        {
            name: "vite-audio-spritesheet-plugin:build",
            apply: "build",
            buildStart() {
                modeNames.forEach(buildSpritesheet);
                getNoPreloadPaths();
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
            name: "vite-audio-spritesheet-plugin:serve",
            apply: "serve",
            enforce: "pre",
            configureServer(server) {
                const onChange = (filename: string): void => {
                    const dir = filename.split(path.sep)[3] as SpritesheetNames | "no-preload";
                    const invalidatedModules = dir === "no-preload"
                        ? ["no-preload"]
                        : Object.entries(GameModes)
                            .filter(([, mode]) => mode.spriteSheets.includes(dir))
                            .map(([modeName]) => modeName);

                    for (const moduleName of invalidatedModules) {
                        const moduleId = `virtual:audio-spritesheet-${moduleName}`;
                        modules.delete(moduleId);
                        const module = server.moduleGraph.getModuleById(moduleId);
                        if (module !== undefined) void server.reloadModule(module);
                    }
                };
                watcher = watch("static/audio/game", { ignoreInitial: true })
                    .on("add", onChange)
                    .on("change", onChange)
                    .on("unlink", onChange);

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
            },
            resolveId,
            load
        }
    ];
}
