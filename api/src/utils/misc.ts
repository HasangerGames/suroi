import fs from "fs";

/**
 * Read a JSON file.
 * @param path The path to the JSON file.
 */
export const readJSON = <T>(path: string): T => JSON.parse(fs.readFileSync(path, "utf-8")) as T;

export const Config = readJSON<any>("config.json");
export const Debug = Config.debug;

export function log(message: string): void {
    const date: Date = new Date();
    console.log(`[${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString("en-US")}] ${message}`);
}

/**
 * Get the MIME type of a file.
 * @param file The name or path to the file.
 */
export function getContentType(file: string): string {
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
}
