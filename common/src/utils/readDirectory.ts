import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Recursively read a directory.
 * @param dir The absolute path to the directory.
 * @returns An array representation of the directory's contents.
 */
export function readDirectory(dir: string, filter?: RegExp): string[] {
    let results: string[] = [];
    if (!existsSync(dir)) return results;

    for (const file of readdirSync(dir)) {
        const filePath = resolve(dir, file);
        const stat = statSync(filePath);

        if (stat?.isDirectory()) {
            results = results.concat(readDirectory(filePath, filter));
        } else if (filter === undefined || filter.test(filePath)) {
            results.push(filePath);
        }
    }

    return results;
}
