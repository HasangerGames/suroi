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

export function isObject(item: unknown): item is Record<string, unknown> {
    return (item && typeof item === "object" && !Array.isArray(item)) as boolean;
}

export function mergeDeep(target: unknown, ...sources: unknown[]): unknown {
    if (!sources.length) return target;

    const [source, ...rest] = sources;

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                mergeDeep((target[key] ??= {}), source[key]);
                continue;
            }

            target[key] = source[key];
        }
    }

    return mergeDeep(target, ...rest);
}
