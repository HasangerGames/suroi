import { FSWatcher, watch } from "chokidar";
import { readFileSync } from "fs";
import path from "path";
import { type SpritesheetData } from "pixi.js";
import spritesheetc from "spritesheetc";
import { type Plugin } from "vite";
import { type ModeName, Modes, type SpritesheetNames } from "../../../common/src/definitions/modes";
import segfaultHandler from "segfault-handler";

segfaultHandler.registerHandler();

const PLUGIN_NAME = "vite-spritesheet-plugin";

export interface Atlas {
    readonly json: SpritesheetData
    readonly image: Buffer
    readonly cacheName?: string
}

export interface Spritesheet {
    readonly low: Atlas[]
    readonly high: Atlas[]
}

export interface ImageSpritesheetImporter {
    readonly importSpritesheet: (name: string) => Promise<ImageSpritesheetList>
}

export interface ImageSpritesheetList {
    readonly spritesheets: SpritesheetData[]
}

const spritesheetNames = Object.keys(Modes);

const virtualModuleIds = [
    "virtual:image-spritesheets-importer-low-res",
    "virtual:image-spritesheets-importer-high-res",
    ...spritesheetNames.flatMap(dir => [
        `virtual:image-spritesheets-low-res-${dir}`,
        `virtual:image-spritesheets-high-res-${dir}`
    ])
];

const files = new Map<string, Buffer>();
const modules = new Map<string, string>();

const makeImporter = (res: string): void => {
    const cases = spritesheetNames.map(dir =>
        `case "${dir}":return await import("virtual:image-spritesheets-${res}-res-${dir}");`
    ).join("");
    const importer = `export const importSpritesheet=async t=>{switch(t){${cases}}}`;
    modules.set(`virtual:image-spritesheets-importer-${res}-res`, importer);
};
makeImporter("low");
makeImporter("high");

const resolveId = (id: string): string | undefined => virtualModuleIds.includes(id) ? id : undefined;

const load = (id: string): string | undefined => {
    if (!virtualModuleIds.includes(id)) return;
    let data = modules.get(id);
    if (!data) {
        try {
            buildSpritesheets(id.slice(id.lastIndexOf("-") + 1) as SpritesheetNames);
        } catch (e) {
            console.error(e);
            return;
        }
        data = modules.get(id);
    }
    return data;
};

function buildSpritesheets(spritesheetName: SpritesheetNames): void {
    const filenames = spritesheetc.buildSpritesheets({
        inputs: [path.join("public", "img", "game", "manifests", `${spritesheetName}.txt`)],
        outputDir: ".spritesheet-cache",
        atlasName: spritesheetName,
        resolutions: [0.5, 1],
        speed: "fast"
    });
    const lowSheets: string[] = [];
    const highSheets: string[] = [];
    for (const file of filenames) {
        const sheets = file.includes("@0.5x") ? lowSheets : highSheets;
        sheets.push(readFileSync(`${file}.json`, "utf8"));
        files.set(`img/atlases/${file}.webp`, readFileSync(file));
    }
    modules.set(`virtual:image-spritesheets-low-res-${spritesheetName}`, `export const spritesheets=[${lowSheets.join()}]`);
    modules.set(`virtual:image-spritesheets-high-res-${spritesheetName}`, `export const spritesheets=[${highSheets.join()}]`);
}

export function imageSpritesheet(): Plugin[] {
    let watcher: FSWatcher;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            buildStart() {
                for (const modeName of Object.keys(Modes) as ModeName[]) {
                    buildSpritesheets(modeName);
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
            configureServer(server) {
                const onChange = (filename: string): void => {
                    const dirNames = filename.split(path.sep);
                    let dir = dirNames[3];
                    if (dir === "manifests") {
                        dir = dirNames[4];
                        dir = dir.substring(0, dir.indexOf("."));
                    }
                    console.log(dir);
                    const invalidatedModes = Object.entries(Modes)
                        .filter(([, mode]) => mode.spriteSheets.includes(dir as SpritesheetNames))
                        .map(([modeName]) => modeName);

                    const invalidateModule = (moduleId: string): void => {
                        modules.delete(moduleId);
                        const module = server.moduleGraph.getModuleById(moduleId);
                        if (module !== undefined) void server.reloadModule(module);
                    };

                    for (const modeName of invalidatedModes) {
                        invalidateModule(`virtual:image-spritesheets-low-res-${modeName}`);
                        invalidateModule(`virtual:image-spritesheets-high-res-${modeName}`);
                    }
                };
                watcher = watch("public/img/game", { ignoreInitial: true })
                    .on("add", onChange)
                    .on("change", onChange)
                    .on("unlink", onChange);

                return () => {
                    server.middlewares.use((req, res, next) => {
                        if (req.originalUrl === undefined) return next();

                        const file = files.get(req.originalUrl.slice(1));
                        if (file === undefined) return next();

                        res.writeHead(200, { "Content-Type": "image/webp" });
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
