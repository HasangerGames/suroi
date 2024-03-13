import { platform } from "os";
import { createHash } from "crypto";

import { type IOption, MaxRectsPacker } from "maxrects-packer";
import { type Image, createCanvas, loadImage } from "canvas";
import { type SpritesheetData } from "pixi.js";

export const supportedFormats = ["png", "jpeg"] as const;

export interface CompilerOptions {
    /**
    * Format of the output image
    * @default "png"
    */
    outputFormat: typeof supportedFormats[number]

    /**
     * Output directory
     * @default "atlases"
     */
    outDir: string

    name: string

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

export type AtlasList = Array<{ json: SpritesheetData, image: Buffer }>;

export type multiResAtlasList = Record<string, {
    low: AtlasList
    high: AtlasList
}>;

/**
 * Pack images spritesheets.
 * @param paths List of paths to the images.
 * @param options Options passed to the packer.
 */
export async function createSpritesheets(paths: string[], options: CompilerOptions): Promise<{ low: AtlasList, high: AtlasList }> {
    if (paths.length === 0) throw new Error("No file given.");

    if (!supportedFormats.includes(options.outputFormat)) {
        const supported = JSON.stringify(supportedFormats);
        throw new Error(`outputFormat should only be one of ${supported}, but "${options.outputFormat}" was given.`);
    }

    interface PackerRectData {
        image: Image
        path: string
    }

    const images: PackerRectData[] = [];

    await Promise.all(paths.map(async path => {
        const image = await loadImage(path);
        images.push({
            image,
            path
        });
    }));

    function createSheet(resolution: number): AtlasList {
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
                image.image.width * resolution,
                image.image.height * resolution,
                image
            );
        }

        const atlases: AtlasList = [];

        for (const bin of packer.bins) {
            const canvas = createCanvas(bin.width, bin.height);

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
                const data: PackerRectData = rect.data;

                ctx.drawImage(data.image, rect.x, rect.y, rect.width, rect.height);

                const sourceParts = (rect.data.path as string).split(platform() === "win32" ? "\\" : "/");
                let name = sourceParts.slice(sourceParts.length - 1, sourceParts.length).join();

                if (options.removeExtensions) {
                    const temp = name.split(".");
                    temp.splice(temp.length - 1, 1);
                    name = temp.join();
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

            const buffer = canvas.toBuffer(`image/${options.outputFormat}` as "image/png");

            const hash = createHash("sha1");
            hash.setEncoding("hex");
            hash.write(buffer);
            hash.end();
            const sha1 = (hash.read() as string).slice(0, 8);

            json.meta.image = `${options.outDir}/${options.name}-${sha1}@${resolution}x.${options.outputFormat}`;

            atlases.push({
                json,
                image: buffer
            });
        }

        return atlases;
    }

    return {
        low: createSheet(0.5),
        high: createSheet(1)
    };
}
