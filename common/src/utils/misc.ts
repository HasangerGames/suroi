export function log(message: string, noLine = false): void {
    const date: Date = new Date();
    const dateString = `[${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString("en-US")}]`;

    console.log(`${dateString} ${message}`);
    if (!noLine) console.log(`${dateString} ===========================`);
}

export function stripNonASCIIChars(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/[^\x00-\xFF]/g, "");
}

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
