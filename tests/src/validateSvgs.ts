import * as svgParser from "svg-parser";
import * as fs from "node:fs";
import { ColorStyles, styleText } from "@common/utils/logging";
import { readDirectory } from "@common/utils/readDirectory";

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
    player: 25_000,
    shared: 10_000, // theres only missing_texture there lol
    casings: 5_000,
    trails: 5_000
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

const svgPaths = [
    ...readDirectory("../client/public/img/game", /\.(svg)$/i),
    ...readDirectory("../client/public/img/killfeed", /\.(svg)$/i)
];

function checkNode(path: string, node: svgParser.ElementNode): void {
    if (!node) return;

    switch (node.tagName) {
        case "svg": {
            /* TODO: renable this after i fix all files that trigger it

            if (!node.properties) break;
            const { width, height } = node.properties;

            if (typeof width !== "number" || typeof height !== "number") {
                addError(
                    path,
                    `Root element sizes are not integers; width: ${width}, height: ${height}`
                );
            }
            */
            break;
        }
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
        case "image":
            addError(path, "Embedded image tag");
            break;
    }

    for (const child of node.children) {
        if (typeof child === "string") continue;
        if (child.type === "text") continue;
        checkNode(path, child);
    }
}

for (const path of svgPaths) {
    const stats = fs.statSync(path);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const baseDir = path.split("/").at(-2)!;

    let maxSize = MAX_SIZES[baseDir];

    if (!maxSize) {
        console.warn(`missing max size for directory ${baseDir}`);
        maxSize = 100_000;
    }

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

    const content = fs.readFileSync(path).toString();
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
