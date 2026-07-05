import { FSWatcher, watch } from "chokidar";
import { readFileSync } from "fs";
import path from "path";
import { type SpritesheetData } from "pixi.js";
import spritesheetc, { type BuilderOptions } from "spritesheetc";
import { type Plugin } from "vite";
import { Modes, type SpritesheetNames } from "../../../common/src/definitions/modes";

const PLUGIN_NAME = "vite-spritesheet-plugin";

export interface ImageSpritesheetImporter {
    readonly importSpritesheet: (name: string) => Promise<{ readonly spritesheets: SpritesheetData[] }>
}

const spritesheetNames = Object.keys(Modes) as SpritesheetNames[];

const spritesheetVirtualModuleIds = spritesheetNames.flatMap(dir => [
    `virtual:image-spritesheets-low-res-${dir}`,
    `virtual:image-spritesheets-high-res-${dir}`
]);

const virtualModuleIds = [
    "virtual:image-spritesheets-importer-low-res",
    "virtual:image-spritesheets-importer-high-res",
    ...spritesheetVirtualModuleIds
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
            const spritesheetName = id.slice(id.lastIndexOf("-") + 1) as SpritesheetNames;
            buildSpritesheets(spritesheetName, ".spritesheet-cache", "fast");
        } catch (e) {
            console.error(e);
            return;
        }
        data = modules.get(id);
    }
    return data;
};

function buildSpritesheets(spritesheetName: SpritesheetNames, outputDir: string, speed: BuilderOptions["speed"]): void {
    const filenames = spritesheetc.buildSpritesheets({
        inputs: [path.join("public", "img", "game", "manifests", `${spritesheetName}.txt`)],
        outputDir,
        atlasName: spritesheetName,
        resolutions: [0.5, 1],
        speed
    });
    const lowSheets: string[] = [];
    const highSheets: string[] = [];
    for (const file of filenames) {
        const sheets = file.includes("@0.5x") ? lowSheets : highSheets;
        let json = readFileSync(`${file}.json`, "utf8");
        if (outputDir === "client/dist/img/atlases") { // please fix me i am awful
            json = json.replace("client/dist/", "");
        }
        let alteredFile = file;
        if (file.startsWith("client/dist/img/atlases/")) { // please fix me i am awful
            alteredFile = file.replace("client/dist/img/atlases/", "");
        }
        sheets.push(json);
        files.set(`img/atlases/${alteredFile}`, readFileSync(file));
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
                for (const sheet of spritesheetNames) {
                    buildSpritesheets(sheet, "client/dist/img/atlases", "slow");
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
                const onChange = (): void => {
                    // Invalidate all spritesheet modules
                    // TODO Invalidate only modules affected by the detected changes
                    for (const moduleId of spritesheetVirtualModuleIds) {
                        modules.delete(moduleId);
                        const module = server.moduleGraph.getModuleById(moduleId);
                        if (module !== undefined) void server.reloadModule(module);
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
