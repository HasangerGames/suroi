import { FSWatcher, watch } from "chokidar";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { rm, writeFile } from "fs/promises";
import { type IOption, MaxRectsPacker } from "maxrects-packer";
import path from "path";
import { type SpritesheetData } from "pixi.js";
import { Canvas, Image, loadImage, type RenderOptions } from "skia-canvas";
import { type Plugin } from "vite";
import { type ModeName, Modes, type SpritesheetNames } from "../../../common/src/definitions/modes";
import { getPaths, shortHash } from "./utils";

const PLUGIN_NAME = "vite-spritesheet-plugin";

const compilerOpts = {
    margin: 8,
    maximumSize: 4096,
    renderOptions: {
        // @ts-expect-error no typings for the msaa property for some reason
        low: { msaa: false },
        // @ts-expect-error no typings for the msaa property for some reason
        high: { msaa: false }
    },
    packerOptions: {}
} satisfies CompilerOptions as CompilerOptions;

export interface CompilerOptions {
    /**
     * Added pixels between sprites (can prevent pixels leaking to adjacent sprite)
     * @default 1
     */
    margin: number

    /**
     * The maximum allowed width and height of a generated image
     * Once a spritesheet exceeds this size a new one will be created
     * @default 4096
     */
    maximumSize: number

    /**
     * Options to pass to skia-canvas when rendering
     */
    renderOptions?: {
        low?: RenderOptions
        high?: RenderOptions
    }

    /**
     * maxrects-packer options
     * See https://soimy.github.io/maxrects-packer/
     * Currently does not support `allowRotation` option
     */
    packerOptions: Omit<IOption, "allowRotation">
}

export interface Atlas {
    readonly json: SpritesheetData
    readonly image: Buffer
    readonly cacheName?: string
}

export interface Spritesheet {
    readonly low: Atlas[]
    readonly high: Atlas[]
}

interface PackerRectData {
    readonly image: Image
    readonly path: string
}

export interface CacheData {
    lastModified: number
    fileMap: Record<string, number>
    atlasFiles: {
        low: string[]
        high: string[]
    }
}

export interface ImageSpritesheetImporter {
    readonly importSpritesheet: (name: string) => Promise<ImageSpritesheetList>
}

export interface ImageSpritesheetList {
    readonly spritesheets: SpritesheetData[]
}

const imageDirs = Object.keys(Modes);

const virtualModuleIds = [
    "virtual:image-spritesheets-importer-low-res",
    "virtual:image-spritesheets-importer-high-res",
    ...imageDirs.flatMap(dir => [
        `virtual:image-spritesheets-low-res-${dir}`,
        `virtual:image-spritesheets-high-res-${dir}`
    ])
];

const files = new Map<string, Buffer>();
const modules = new Map<string, string>();

const makeImporter = (res: string): void => {
    const cases = imageDirs.map(dir =>
        `case "${dir}":return await import("virtual:image-spritesheets-${res}-res-${dir}");`
    ).join("");
    const importer = `export const importSpritesheet=async t=>{switch(t){${cases}}}`;
    modules.set(`virtual:image-spritesheets-importer-${res}-res`, importer);
};
makeImporter("low");
makeImporter("high");

const resolveId = (id: string): string | undefined => virtualModuleIds.includes(id) ? id : undefined;

const load = async(id: string): Promise<string | undefined> => {
    if (!virtualModuleIds.includes(id)) return;
    let data = modules.get(id);
    if (!data) {
        skiaImageCache.clear();
        await buildSpritesheets(id.slice(id.lastIndexOf("-") + 1) as ModeName);
        data = modules.get(id);
    }
    return data;
};

export const skiaImageCache = new Map<string, Image>();

export const cacheDir = ".spritesheet-cache";
if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
}

async function buildSpritesheets(modeName: ModeName): Promise<void> {
    const start = performance.now();

    // delete old files to prevent memory leaks
    for (const filePath of files.keys()) {
        if (!filePath.includes(`${modeName}-`)) continue;
        files.delete(filePath);
    }

    const fileMap: Record<string, number> = {};
    for (const file of getPaths(modeName, "img", /\.(png|gif|jpg|bmp|tiff|svg)$/i)) {
        const { mtimeMs, ctimeMs } = statSync(file);
        fileMap[file] = mtimeMs > ctimeMs ? mtimeMs : ctimeMs;
    }

    const getCacheData = (): CacheData | undefined => {
        const dataFile = path.join(cacheDir, modeName, "data.json");
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

    const cacheData = getCacheData();
    if (cacheData) {
        const { low, high } = cacheData.atlasFiles;

        const loadFromCache = (filesArray: string[], res: string): void => {
            const sheets: string[] = [];
            for (const file of filesArray) {
                sheets.push(readFileSync(path.join(cacheDir, modeName, `${file}.json`), "utf8"));
                files.set(`img/atlases/${file}.png`, readFileSync(path.join(cacheDir, modeName, `${file}.png`)));
            }
            modules.set(`virtual:image-spritesheets-${res}-res-${modeName}`, `export const spritesheets=[${sheets.join()}]`);
        };
        loadFromCache(low, "low");
        loadFromCache(high, "high");
    } else {
        const atlasCacheDir = path.join(cacheDir, modeName);
        if (existsSync(atlasCacheDir)) {
            await Promise.all(
                readdirSync(atlasCacheDir)
                    .map(async file => await rm(path.join(atlasCacheDir, file)))
            );
        } else {
            mkdirSync(atlasCacheDir);
        }

        const packer = new MaxRectsPacker(
            compilerOpts.maximumSize,
            compilerOpts.maximumSize,
            compilerOpts.margin,
            {
                ...compilerOpts.packerOptions,
                allowRotation: false // TODO: support rotating frames
            }
        );

        await Promise.all(Object.keys(fileMap).map(async path => {
            let image = skiaImageCache.get(path);
            if (!image) {
                skiaImageCache.set(path, image = await loadImage(path));
            }
            packer.add(
                image.width,
                image.height,
                { path, image }
            );
        }));

        const sheets: {
            readonly low: SpritesheetData[]
            readonly high: SpritesheetData[]
        } = {
            low: [],
            high: []
        };
        const atlasFiles: {
            readonly low: string[]
            readonly high: string[]
        } = {
            low: [],
            high: []
        };

        await Promise.all(packer.bins.map(async bin => {
            const { width, height } = bin;
            const [lowWidth, lowHeight] = [width / 2, height / 2];

            const canvas = new Canvas(width, height);
            const ctx = canvas.getContext("2d");

            const lowJSON: SpritesheetData = {
                meta: {
                    image: "",
                    scale: 0.5,
                    size: {
                        w: lowWidth,
                        h: lowHeight
                    }
                },
                frames: {}
            };
            const highJSON: SpritesheetData = {
                meta: {
                    image: "",
                    scale: 1,
                    size: {
                        w: width,
                        h: height
                    }
                },
                frames: {}
            };

            for (const rect of bin.rects) {
                const { image, path: fPath } = rect.data as PackerRectData;
                let { x, y, width: w, height: h } = rect;

                ctx.drawImage(image, x, y, w, h);

                const name = fPath.slice(fPath.lastIndexOf(path.sep) + 1, fPath.lastIndexOf("."));

                highJSON.frames[name] = {
                    frame: { x, y, w, h },
                    sourceSize: { w, h }
                };
                x /= 2; y /= 2; w /= 2; h /= 2;
                lowJSON.frames[name] = {
                    frame: { x, y, w, h },
                    sourceSize: { w, h }
                };
            }

            const lowResCanvas = new Canvas(lowWidth, lowHeight);
            const lowResCtx = lowResCanvas.getContext("2d");
            lowResCtx.drawImage(canvas, 0, 0, lowWidth, lowHeight);

            const [lowBuffer, highBuffer] = await Promise.all([
                lowResCanvas.toBuffer("png", compilerOpts.renderOptions?.low),
                canvas.toBuffer("png", compilerOpts.renderOptions?.high)
            ]);

            const writeAtlas = async(
                image: Buffer,
                json: SpritesheetData,
                resolution: number,
                sheetList: SpritesheetData[],
                filesList: string[]
            ): Promise<void> => {
                const cacheName = `${modeName}-${shortHash(image)}@${resolution}x`;
                const filePath = json.meta.image = `img/atlases/${cacheName}.png`;

                files.set(filePath, image);

                void writeFile(path.join(atlasCacheDir, `${cacheName}.json`), JSON.stringify(json));
                void writeFile(path.join(atlasCacheDir, `${cacheName}.png`), image);

                sheetList.push(json);
                filesList.push(cacheName);
            };

            void writeAtlas(
                lowBuffer,
                lowJSON,
                0.5,
                sheets.low,
                atlasFiles.low
            );
            void writeAtlas(
                highBuffer,
                highJSON,
                1,
                sheets.high,
                atlasFiles.high
            );
        }));

        const cacheData: CacheData = {
            lastModified: Date.now(),
            fileMap,
            atlasFiles
        };
        writeFileSync(path.join(atlasCacheDir, "data.json"), JSON.stringify(cacheData));

        modules.set(`virtual:image-spritesheets-low-res-${modeName}`, `export const spritesheets=${JSON.stringify(sheets.low)}`);
        modules.set(`virtual:image-spritesheets-high-res-${modeName}`, `export const spritesheets=${JSON.stringify(sheets.high)}`);
    }

    console.log(`Built image spritesheet "${modeName}" in ${Math.round(performance.now() - start)} ms`);
}

export function imageSpritesheet(): Plugin[] {
    let watcher: FSWatcher;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async buildStart() {
                skiaImageCache.clear(); // probably not needed but putting here just in case
                for (const modeName of Object.keys(Modes) as ModeName[]) {
                    await buildSpritesheets(modeName);
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
