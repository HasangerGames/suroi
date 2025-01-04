import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { type IOption, MaxRectsPacker } from "maxrects-packer";
import path from "path";
import { type SpritesheetData } from "pixi.js";
import type { Mode, SpritesheetNames } from "../../../../common/src/definitions/modes";
import { CacheData, cacheDir } from "../spritesheet-plugin";
import { readFileSync, writeFileSync } from "fs";
import { Resvg } from "@resvg/resvg-js";
import { imageSize } from "image-size";

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

export type AtlasList = Array<{ readonly json: SpritesheetData, readonly image: Buffer, readonly cacheName?: string }>;

export type MultiAtlasList = Record<SpritesheetNames, { readonly low: AtlasList, readonly high: AtlasList }>;

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
): Promise<{ readonly low: AtlasList, readonly high: AtlasList }> {
    const paths = Object.keys(fileMap);
    if (paths.length === 0) throw new Error("No file given.");

    interface PackerRectData {
        readonly image: {
            data: Buffer
            width: number
            height: number
            fileType: string
        }
        readonly path: string
    }

    const start = performance.now();

    const length = paths.length;
    let resolved = 0;
    let prevLength = 0;
    const max = (a: number, b: number): number => a > b ? a : b;
    const digits = Math.ceil(Math.log10(length));

    const writeFromStart = (str: string): boolean => process.stdout.write(`\r${str}`);

    const sep = path.sep;

    process.stdout.write(`Loading ${length} images...\n`);
    const results = (await Promise.allSettled(
        paths.map(async path => {
            const str = `Loading images: ${(++resolved).toString().padStart(digits, " ")} / ${length} ('${path.slice(path.lastIndexOf(sep) + 1)}')`;
            writeFromStart(str.padEnd(max(str.length, prevLength), " "));
            prevLength = str.length;

            const imageBuffer = readFileSync(path);

            const { width, height } = imageSize(imageBuffer);

            if (!width || !height) throw new Error(`Image ${path} has no dimensions information`);

            return {
                image: {
                    data: imageBuffer,
                    width,
                    height,
                    fileType: path.split(".").at(-1) ?? ""
                },
                path
            } satisfies PackerRectData;
        })
    ));
    writeFromStart(`Loaded ${length} images`.padEnd(prevLength, " "));
    console.log();

    const images: readonly PackerRectData[] = results.filter(x => x.status === "fulfilled").map(({ value }) => value);
    const errors = results.filter(x => x.status === "rejected").map(({ reason }) => reason as unknown);
    if (errors.length !== 0) {
        console.error(errors);
        throw new AggregateError(errors);
    }

    function createSheet(resolution: number): AtlasList {
        console.log(`Building spritesheet @ ${resolution}x...`);
        const packer = new MaxRectsPacker(
            options.maximumSize * resolution,
            options.maximumSize * resolution,
            options.margin,
            {
                ...options.packerOptions,
                allowRotation: false // TODO: support rotating frames
            }
        );

        writeFromStart(`Adding ${length} images to packer`);
        for (const image of images) {
            packer.add(
                image.image.width * resolution,
                image.image.height * resolution,
                image
            );
        }
        writeFromStart(`Added ${length} images to packer`);
        console.log("");

        const atlases: AtlasList = [];

        const binCount = packer.bins.length;
        console.log(`Parsing ${binCount} bins...`);
        let bins = 0;
        for (const bin of packer.bins) {
            let binSVG = `<svg viewBox="0 0 ${bin.width} ${bin.height}" xmlns="http://www.w3.org/2000/svg">`;

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

            const rects = bin.rects.length;
            const digits = Math.ceil(Math.log10(rects));
            let parsed = 0;
            writeFromStart(`Parsing ${rects} rects`);
            let maskId = 0;
            for (const rect of bin.rects) {
                const data = rect.data as PackerRectData;

                const dataUrl = `data:image/${data.image.fileType + (data.image.fileType === "svg" ? "+xml" : "")};base64,${data.image.data.toString("base64")}`;

                binSVG += `<mask id="mask${maskId}"><rect fill="white" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" /></mask>`;
                binSVG += `<image mask="url(#mask${maskId})" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" href="${dataUrl}" />`;

                const sourceParts = data.path.split(path.sep);

                /**
                 * there is _probably_ a file name
                 */
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                let name = sourceParts.at(-1)!;

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

                const str = `Parsed ${(++parsed).toString().padStart(digits, " ")} / ${rects} rects`;
                writeFromStart(str.padEnd(max(str.length, prevLength), " "));
                prevLength = str.length;

                maskId++;
            }

            binSVG += "</svg>";

            writeFromStart("Creating buffer".padEnd(prevLength, " "));
            const buffer = new Resvg(binSVG).render().asPng();

            writeFromStart("Creating hash".padEnd(prevLength, " "));
            const hash = createHash("sha1").update(buffer).digest("hex").slice(0, 8);

            json.meta.image = `${options.outDir}/${name}-${hash}@${resolution}x.png`;

            writeFromStart("Caching data".padEnd(prevLength, " "));

            const cacheName = `${name}-${hash}@${resolution}x`;
            writeFileSync(path.join(atlasCacheDir, `${cacheName}.json`), JSON.stringify(json));
            writeFileSync(path.join(atlasCacheDir, `${cacheName}.png`), buffer);

            atlases.push({
                json,
                image: buffer,
                cacheName
            });
            const str = `${++bins} / ${binCount} bins done`;
            writeFromStart(str.padEnd(prevLength = max(prevLength, 22), " "));
            prevLength = str.length;
        }

        console.log(`\nBuilt spritesheet @ ${resolution}x\n`);

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

    console.log(`Finished building spritesheets in ${Math.round(performance.now() - start) / 1000}s`);

    return sheets;
}
