import * as fs from "node:fs";
import { ColorStyles, styleText } from "$common/utils/logging";
import { readDirectory } from "$common/utils/readDirectory";
import * as svgParser from "svg-parser";

const MAX_SIZES: Record<string, number> = {
    buildings: 300_000,
    airdrop: 200_000,
    equipment: 200_000,
    weapons: 150_000,
    obstacles: 150_000,
    badges: 100_000,
    emotes: 100_000,
    skins: 100_000,
    loot: 100_000,
    residues: 50_000,
    killfeed: 50_000,
    projectiles: 50_000,
    particles: 25_000,
    perks: 25_000,
    decals: 50_000,
    explosions: 25_000,
    mapPings: 25_000,
    indicators: 75_000,
    player: 25_000,
    game: 10_000, // theres only missing_texture there lol
    casings: 5_000,
    trails: 6_000
};

const MAX_PATH_LENGTH = 100_000;

function humanSize(bytes: number, dp = 1): string {
    const thresh = 1000;

    if (Math.abs(bytes) < thresh) {
        return `${bytes} B`;
    }

    const units = ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

    return `${bytes.toFixed(dp)} ${units[u]}`;
}

const fileErrors: Record<string, string[]> = {};
let errorsFound = 0;
function addError(file: string, msg: string): void {
    (fileErrors[file] ??= []).push(msg);
    errorsFound++;
}

const fileSizes: Record<string, {
    size: number
    count: number
    biggest: number
}> = {};

const unminifiedFiles: string[] | undefined = process.argv.includes("--fix-unminified") ? [] : undefined;

const fixNonIntegerSizes: string[] | undefined = process.argv.includes("--fix-non-integer-sizes") ? [] : undefined;

// pixels to mm * magical scaling
const nonIntegerFixScale = (96 / 25.4) * 0.9364705882352942;

const svgPaths = [
    ...readDirectory("../client/static/img/game", /\.(svg)$/i),
    ...readDirectory("../client/static/img/killfeed", /\.(svg)$/i)
];

function checkNode(path: string, node: svgParser.ElementNode): void {
    if (!node) return;

    switch (node.tagName) {
        case "path": {
            if (!node.properties) break;
            if (typeof node.properties.d !== "string") {
                console.log("why is this <path> tag `d` property not a string???????");
                break;
            }
            const len = node.properties.d.length;
            if (node.properties.d.length > MAX_PATH_LENGTH) {
                addError(
                    path,
                    `Path has too many nodes; length: ${len} (max: ${MAX_PATH_LENGTH})`
                );
            }
            break;
        }
        case "image": {
            addError(path, "Embedded image tag");
            break;
        }
    }

    for (const child of node.children) {
        if (typeof child === "string") continue;
        if (child.type === "text") continue;
        checkNode(path, child);
    }
}

for (const path of svgPaths) {
    const stats = fs.statSync(path);

    const dirSplit = path.split("/");
    // biome-ignore lint/style/noNonNullAssertion: we assume dirSplit is at least 3 long
    const baseDir = dirSplit.at(-2)! in MAX_SIZES ? dirSplit.at(-2)! : dirSplit.at(-3)!;

    const maxSize = MAX_SIZES[baseDir];
    if (maxSize) {
        if (stats.size > maxSize) {
            addError(
                path,
                `Size is ${humanSize(stats.size)} (max for ${baseDir}: ${humanSize(maxSize)})`
            );
        }

        fileSizes[baseDir] ??= {
            size: 0,
            count: 0,
            biggest: 0
        };
        fileSizes[baseDir].biggest = Math.max(fileSizes[baseDir].biggest, stats.size);
        fileSizes[baseDir].size += stats.size;
        fileSizes[baseDir].count++;
    } else {
        console.warn(`missing max size for directory (full path: ${path})`);
    }

    const content = fs.readFileSync(path, "utf8");

    if (content.split("\n").length > 1) {
        addError(path, "Unminified svg");
        unminifiedFiles?.push(path);
    }

    // this may be the worst hack i've ever written, but it seems to work so
    const dimensions = /(.*)(<svg[^>]+)(width="|height=")([\d.m]+)("[^>]+)(width="|height=")([\d.m]+)(".*)/s.exec(content);
    if (dimensions) {
        const dim1 = dimensions[4];
        const dim2 = dimensions[7];
        if (dim1.endsWith("mm") || dim2.endsWith("mm")) {
            // if first dimension (yes, dimensions[3]) is height, the second must be width,
            // meaning width must be dim2 and height must be dim1
            const swapDims = dimensions[3].startsWith("height");
            const width = swapDims ? dim2 : dim1;
            const height = swapDims ? dim1 : dim2;
            addError(
                path,
                `${fixNonIntegerSizes ? "[FIXED] " : ""}SVG dimensions are in millimeters; width: ${width}, height: ${height}`
            );

            dimensions[swapDims ? 7 : 4] = (parseFloat(width.slice(0, -2)) * nonIntegerFixScale).toFixed(3);
            dimensions[swapDims ? 4 : 7] = (parseFloat(height.slice(0, -2)) * nonIntegerFixScale).toFixed(3);

            if (fixNonIntegerSizes) {
                fs.writeFileSync(path, dimensions.slice(1).join("")); // since everything is in capture groups, all we have to do is stitch them back together
            }
        }
    } else {
        addError(path, "Dimensions could not be read");
    }

    const rootNode = svgParser.parse(content);
    for (const node of rootNode.children) {
        if (typeof node === "string") continue;
        if (node.type === "text") continue;
        checkNode(path, node);
    }
}

console.log("File size stats:");
const sortedSizes = Object.keys(fileSizes).sort((a, b) => {
    return fileSizes[b].size - fileSizes[a].size;
});

for (const key of sortedSizes) {
    const data = fileSizes[key];

    console.log(
        key.padEnd(12, " "),
        "total:  ",
        humanSize(data.size).padEnd(10, " "),
        "biggest:  ",
        humanSize(data.biggest).padEnd(10, " "),
        "average:  ",
        humanSize(Math.floor(data.size / data.count)).padEnd(10, " ")
    );
}

for (const file in fileErrors) {
    const errors = fileErrors[file];
    console.log(
        "File",
        styleText(file, ColorStyles.foreground.yellow.normal),
        `has ${errors.length} error${errors.length > 1 ? "s" : ""}:`
    );
    for (const error of errors) {
        console.log(` - ${error} `);
    }
}

if (unminifiedFiles?.length) {
    console.log(`Command to fix: svgo ${unminifiedFiles.join(" ")}`);
}

if (errorsFound) {
    const fileCount = Object.keys(fileErrors).length;
    console.log(
        "Found",
        styleText(errorsFound.toString(), ColorStyles.foreground.red.normal),
        "errors in",
        styleText(fileCount.toString(), ColorStyles.foreground.yellow.normal),
        "files"
    );
    process.exit(1);
}

console.log("Found no errors in all svgs!");
process.exit(0);
