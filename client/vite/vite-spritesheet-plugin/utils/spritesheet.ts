import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { type IOption, MaxRectsPacker } from "maxrects-packer";
import path from "path";
import { type SpritesheetData } from "pixi.js";
import { Canvas } from "skia-canvas";
import type { SpritesheetNames } from "../../../../common/src/definitions/modes";
import { CacheData, cacheDir } from "../spritesheet-plugin";

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
     * maxrects-packer options
     * See https://soimy.github.io/maxrects-packer/
     * Currently does not support `allowRotation` option
     */
    packerOptions: Omit<IOption, "allowRotation">
}

export type Atlas = { readonly json: SpritesheetData, readonly image: Buffer, readonly cacheName?: string };

export type MultiAtlasList = Record<SpritesheetNames, { readonly low: Atlas[], readonly high: Atlas[] }>;

interface PackerRectData {
    readonly image: Image
    readonly path: string
}

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
): Promise<{ readonly low: Atlas[], readonly high: Atlas[] }> {
    const paths = Object.keys(fileMap);
    if (paths.length === 0) throw new Error("No file given.");

    const results = await Promise.allSettled(
        paths.map(async path => ({
            image: await loadImage(path),
            path
        } satisfies PackerRectData))
    );

    const images: readonly PackerRectData[] = results.filter(x => x.status === "fulfilled").map(({ value }) => value);
    const errors = results.filter(x => x.status === "rejected").map(({ reason }) => reason as unknown);
    if (errors.length !== 0) {
        console.error(errors);
        // @ts-expect-error ts doesn't know what an AggregateError is for some reason
        throw new AggregateError(errors);
    }

    function createSheet(resolution: number): Atlas[] {
        const packer = new MaxRectsPacker(
            options.maximumSize * resolution,
            options.maximumSize * resolution,
            options.margin,
            {
                ...options.packerOptions,
                allowRotation: false // TODO: support rotating frames
            }
        );

        for (const image of images) {
            packer.add(
                image.image.naturalWidth * resolution,
                image.image.naturalHeight * resolution,
                image
            );
        }

        const atlases: Atlas[] = [];

        for (const bin of packer.bins) {
            const canvas = new Canvas(bin.width, bin.height);
            const ctx = canvas.getContext("2d");

            const json: SpritesheetData = {
                meta: {
                    image: "",
                    scale: resolution,
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

                json.frames[name] = {
                    frame: {
                        w: rect.width,
                        h: rect.height,
                        x: rect.x,
                        y: rect.y
                    },
                    sourceSize: {
                        w: rect.width,
                        h: rect.height
                    }
                };
            }

            const buffer = canvas.toBufferSync("png");

            const hash = createHash("sha1").update(buffer).digest("hex").slice(0, 8);
            const cacheName = `${name}-${hash}@${resolution}x`;
            json.meta.image = `${options.outDir}/${cacheName}.png`;

            writeFileSync(path.join(atlasCacheDir, `${cacheName}.json`), JSON.stringify(json));
            writeFileSync(path.join(atlasCacheDir, `${cacheName}.png`), buffer);

            atlases.push({
                json,
                image: buffer,
                cacheName
            });
        }

        return atlases;
    }

    const atlasCacheDir = path.join(cacheDir, name);
    if (!existsSync(atlasCacheDir)) mkdirSync(atlasCacheDir);

    const sheets = {
        low: createSheet(0.5),
        high: createSheet(1)
    };

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
