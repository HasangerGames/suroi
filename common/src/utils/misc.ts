import * as path from "path";
import * as fs from "fs";

export function log(message: string, noLine = false): void {
    const date: Date = new Date();
    const dateString = `[${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString("en-US")}]`;
    console.log(`${dateString} ${message}`);
    if (!noLine) console.log(`${dateString} ===========================`);
}

/**
 * Get the MIME type of a file.
 * @param file The name or path to the file.
 */
export const getContentType = (file: string): string => {
    let contentType = "";
    switch (file.split(".").pop()) {
        case "svg":
            contentType = "image/svg+xml";
            break;
        case "mp3":
            contentType = "audio/mpeg";
            break;
        case "html":
            contentType = "text/html; charset=UTF-8";
            break;
        case "css":
            contentType = "text/css";
            break;
        case "js":
            contentType = "text/javascript";
            break;
        case "png":
            contentType = "image/png";
            break;
        case "ico":
            contentType = "image/vnd.microsoft.icon";
            break;
        case "jpg":
            contentType = "image/jpeg";
            break;
    }

    return contentType;
};

/**
 * Recursively read a directory.
 * @param dir The absolute path to the directory.
 * @returns An array representation of the directory's contents.
 */
export const readDirectory = (dir: string): string[] => {
    let results: string[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.resolve(dir, file);
        const stat = fs.statSync(filePath);

        if (stat?.isDirectory()) {
            const res = readDirectory(filePath);
            results = results.concat(res);
        } else results.push(filePath);
    }

    return results;
};
