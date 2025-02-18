import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { rm, writeFile } from "fs/promises";
import { type IOption, MaxRectsPacker } from "maxrects-packer";
import path from "path";
import { type SpritesheetData } from "pixi.js";
import { Canvas, Image, loadImage, RenderOptions } from "skia-canvas";
import type { SpritesheetNames } from "../../../common/src/definitions/modes";
import { cacheDir } from "./spritesheet-plugin";

export interface CompilerOptions {
    /**
     * Output directory
     * @default "atlases"
     */
    outDir: string

    /**
    * Added pixels between sprites (can prevent pixels leaking to adjacent sprite)
    * @default 1
    */
    margin: number

    /**
     * Remove file extensions from the atlas frames
     * @default true
     */
    removeExtensions: boolean

    /**
     * The Maximum width and height a generated image can be
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

export type MultiAtlasList = Record<SpritesheetNames, Spritesheet>;

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

export const imageMap = new Map<string, Image>();

/**
 * Pack images spritesheets.
 * @param name Name of the spritesheet.
 * @param paths List of paths to the images.
 * @param options Options passed to the packer.
 */
export async function createSpritesheets(
    name: string,
    fileMap: Record<string, number>,
    options: CompilerOptions
): Promise<Spritesheet> {
    const packer = new MaxRectsPacker(
        options.maximumSize,
        options.maximumSize,
        options.margin,
        {
            ...options.packerOptions,
            allowRotation: false // TODO: support rotating frames
        }
    );

    await Promise.all(Object.keys(fileMap).map(async path => {
        let image = imageMap.get(path);
        if (!image) {
            imageMap.set(path, image = await loadImage(path));
        }
        packer.add(
            image.width,
            image.height,
            { path, image }
        );
    }));

    const sheets: Spritesheet = {
        low: [],
        high: []
    };
    const lowScale = 0.5;

    const atlasCacheDir = path.join(cacheDir, name);
    if (existsSync(atlasCacheDir)) {
        await Promise.all(
            readdirSync(atlasCacheDir)
                .map(async file => await rm(path.join(atlasCacheDir, file)))
        );
    } else {
        mkdirSync(atlasCacheDir);
    }

    await Promise.all(packer.bins.map(async bin => {
        const canvas = new Canvas(bin.width, bin.height);
        const ctx = canvas.getContext("2d");

        const lowJSON: SpritesheetData = {
            meta: {
                image: "",
                scale: lowScale,
                size: {
                    w: bin.width * lowScale,
                    h: bin.height * lowScale
                }
            },
            frames: {}
        };
        const highJSON: SpritesheetData = {
            meta: {
                image: "",
                scale: 1,
                size: {
                    w: bin.width,
                    h: bin.height
                }
            },
            frames: {}
        };

        for (const rect of bin.rects) {
            const data = rect.data as PackerRectData;

            ctx.drawImage(data.image, rect.x, rect.y, rect.width, rect.height);

            /**
             * there is _probably_ a file name
             */
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            let name = data.path.split(path.sep).at(-1)!;

            if (options.removeExtensions) {
                name = name.split(".").slice(0, -1).join("");
            }

            const { width, height, x, y } = rect;

            lowJSON.frames[name] = {
                frame: {
                    w: width * lowScale,
                    h: height * lowScale,
                    x: x * lowScale,
                    y: y * lowScale
                },
                sourceSize: {
                    w: width * lowScale,
                    h: height * lowScale
                }
            };
            highJSON.frames[name] = {
                frame: {
                    w: width,
                    h: height,
                    x: x,
                    y: y
                },
                sourceSize: {
                    w: width,
                    h: height
                }
            };
        }

        const lowResCanvas = new Canvas(bin.width * lowScale, bin.height * lowScale);
        const lowResCtx = lowResCanvas.getContext("2d");
        lowResCtx.drawImage(canvas, 0, 0, bin.width * lowScale, bin.height * lowScale);

        const [lowBuffer, highBuffer] = await Promise.all([
            lowResCanvas.toBuffer("png", options.renderOptions?.low),
            canvas.toBuffer("png", options.renderOptions?.high)
        ]);

        const writeAtlas = async(image: Buffer, json: SpritesheetData, resolution: number, sheetList: Atlas[]): Promise<void> => {
            const hash = createHash("sha1").update(image).digest("hex").slice(0, 8);
            const cacheName = `${name}-${hash}@${resolution}x`;
            json.meta.image = `${options.outDir}/${cacheName}.png`;

            void writeFile(path.join(atlasCacheDir, `${cacheName}.json`), JSON.stringify(json));
            void writeFile(path.join(atlasCacheDir, `${cacheName}.png`), image);

            sheetList.push({ json, image, cacheName });
        };

        void writeAtlas(
            lowBuffer,
            lowJSON,
            lowScale,
            sheets.low
        );
        void writeAtlas(
            highBuffer,
            highJSON,
            1,
            sheets.high
        );
    }));

    const cacheData: CacheData = {
        lastModified: Date.now(),
        fileMap,
        atlasFiles: {
            low: sheets.low.map(s => s.cacheName ?? ""),
            high: sheets.high.map(s => s.cacheName ?? "")
        }
    };
    writeFileSync(path.join(atlasCacheDir, "data.json"), JSON.stringify(cacheData));

    return sheets;
}
