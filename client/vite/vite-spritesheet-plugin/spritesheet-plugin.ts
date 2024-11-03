import { watch } from "chokidar";
import { Minimatch } from "minimatch";
import path, { resolve } from "path";
import { type SpritesheetData } from "pixi.js";
import { type FSWatcher, type Plugin, type ResolvedConfig } from "vite";
import readDirectory from "./utils/readDirectory.js";
import { type CompilerOptions, createSpritesheets, type MultiResAtlasList } from "./utils/spritesheet.js";
import { GameConstants } from "../../../common/src/constants";
import { Mode, Modes } from "../../../common/src/definitions/modes";

const PLUGIN_NAME = "vite-spritesheet-plugin";

const defaultGlob = "**/*.{png,gif,jpg,bmp,tiff,svg}";
const imagesMatcher = new Minimatch(defaultGlob);

const compilerOpts = {
    outputFormat: "png",
    outDir: "atlases",
    margin: 8,
    removeExtensions: true,
    maximumSize: 4096,
    name: "atlas",
    packerOptions: {}
} satisfies CompilerOptions as CompilerOptions;

const getImageDirs = (modeName: Mode | "shared", imageDirs: string[] = []): string[] => {
    imageDirs.push(`public/img/game/${modeName}`);
    return modeName === "shared"
        ? imageDirs
        : getImageDirs(Modes[modeName].inheritTexturesFrom ?? "shared", imageDirs);
};

const imageDirs = getImageDirs(GameConstants.modeName).reverse();

async function buildSpritesheets(): Promise<MultiResAtlasList> {
    const fileMap = new Map<string, string>();

    // Maps have unique keys.
    // Since the filename is used as the key, and mode sprites are added to the map after the common sprites,
    // this method allows mode sprites to override common sprites with the same filename.
    for (const imagePath of imageDirs.map(dir => readDirectory(dir).filter(x => imagesMatcher.match(x))).flat()) {
        fileMap.set(imagePath.slice(imagePath.lastIndexOf(path.sep)), imagePath);
    }

    console.log("Building spritesheets...");

    return await createSpritesheets([...fileMap.values()], compilerOpts);
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

    let atlases: MultiResAtlasList;

    const exportedAtlases: {
        low: SpritesheetData[]
        high: SpritesheetData[]
    } = { low: [], high: [] };

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
                atlases = await buildSpritesheets();

                exportedAtlases.high = atlases.high.map(sheet => sheet.json);
                exportedAtlases.low = atlases.low.map(sheet => sheet.json);
            },
            generateBundle() {
                for (const sheet of [...atlases.low, ...atlases.high]) {
                    this.emitFile({
                        type: "asset",
                        fileName: sheet.json.meta.image,
                        source: sheet.image
                    });
                    this.info("Built spritesheets");
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

                watcher = watch(imageDirs.map(pattern => resolve(pattern, defaultGlob)), {
                    cwd: config.root,
                    ignoreInitial: true
                })
                    .on("add", reloadPage)
                    .on("change", reloadPage)
                    .on("unlink", reloadPage);

                const files = new Map<string, Buffer | string>();

                async function buildSheets(): Promise<void> {
                    atlases = await buildSpritesheets();

                    exportedAtlases.high = atlases.high.map(sheet => sheet.json);
                    exportedAtlases.low = atlases.low.map(sheet => sheet.json);

                    files.clear();
                    for (const sheet of [...atlases.low, ...atlases.high]) {
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
