import { FSWatcher, watch } from "chokidar";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { type Plugin } from "vite";
import { type ModeName, Modes, type SpritesheetNames } from "../../../common/src/definitions/modes";
import { getPaths, shortHash } from "./utils";

export interface AudioSpritesheetImporter {
    readonly importSpritesheet: (name: string) => Promise<AudioSpritesheetManifest>
}

export interface AudioSpritesheetManifest {
    readonly filename: string
    /** key = sound name, value = byte length */
    readonly spritesheet: Record<string, number>
}

const PLUGIN_NAME = "vite-audio-spritesheet-plugin";

const audioDirContents = readdirSync("public/audio/game");
const audioDirs = Object.keys(Modes).filter(m => audioDirContents.includes(m));

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

const load = async(id: string): Promise<string | undefined> => {
    if (!virtualModuleIds.includes(id)) return;
    let data = modules.get(id);
    if (!data) {
        await buildSpritesheet(id.slice(id.lastIndexOf("-") + 1) as ModeName);
        data = modules.get(id);
    }
    return data;
};

async function buildSpritesheet(modeName: ModeName): Promise<void> {
    const start = performance.now();

    const sheet: Record<string, number> = {};
    const buffers: Buffer[] = [];
    for (const filePath of getPaths(modeName, "audio", /\.mp3$/i)) {
        const buffer = readFileSync(filePath);
        buffers.push(buffer);
        sheet[
            filePath.slice(filePath.lastIndexOf(path.sep) + 1, -4) // remove path and extension
        ] = buffer.byteLength;
    }

    const audio = Buffer.concat(buffers);
    const filename = `audio/${modeName}-${shortHash(audio)}.mp3`;
    files.set(filename, audio);
    modules.set(`virtual:audio-spritesheet-${modeName}`, `export const filename="${filename}";export const spritesheet=${JSON.stringify(sheet)}`);

    console.log(`Built audio spritesheet "${modeName}" in ${Math.round(performance.now() - start)} ms`);
}

export function audioSpritesheet(): Plugin[] {
    let watcher: FSWatcher;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async buildStart() {
                for (const modeName of Object.keys(Modes) as ModeName[]) {
                    await buildSpritesheet(modeName);
                }
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
                const onChange = (filename: string): void => {
                    const dir = filename.split(path.sep)[3] as SpritesheetNames;
                    const invalidatedModes = Object.entries(Modes)
                        .filter(([, mode]) => mode.spriteSheets.includes(dir))
                        .map(([modeName]) => modeName);

                    for (const modeName of invalidatedModes) {
                        const moduleId = `virtual:audio-spritesheet-${modeName}`;
                        modules.delete(moduleId);
                        const module = server.moduleGraph.getModuleById(moduleId);
                        if (module !== undefined) void server.reloadModule(module);
                    }
                };
                watcher = watch("public/audio/game", { ignoreInitial: true })
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
