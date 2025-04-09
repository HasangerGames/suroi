import { readDirectory } from "../../../common/src/utils/readDirectory";
import { Modes, type ModeName } from "../../../common/src/definitions/modes";
import path from "node:path";
import { createHash } from "node:crypto";

export function getPaths(modeName: ModeName, folder: string, filterRegex: RegExp): MapIterator<string> {
    const pathMap = new Map<string, string>();
    const files = Modes[modeName].spriteSheets
        .flatMap(sheet => readDirectory(`public/${folder}/game/${sheet}`, filterRegex));

    // Maps have unique keys.
    // Since the filename is used as the key, and mode sprites are added to the map after the common sprites,
    // this method allows mode sprites to override common sprites with the same filename.
    for (const filePath of files) {
        const filename = filePath.slice(filePath.lastIndexOf(path.sep));
        pathMap.set(filename, path.relative(".", filePath));
    }

    return pathMap.values();
}

export const shortHash = (buffer: Buffer): string => createHash("sha1").update(buffer).digest("hex").slice(0, 8);
