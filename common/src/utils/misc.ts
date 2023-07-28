export function log(message: string, noLine = false): void {
    const date: Date = new Date();
    const dateString = `[${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString("en-US")}]`;

    console.log(`${dateString} ${message}`);
    if (!noLine) console.log(`${dateString} ===========================`);
}

export function isObject(item: unknown): item is Record<string, unknown> {
    return (item && typeof item === "object" && !Array.isArray(item)) as boolean;
}

// https://stackoverflow.com/a/17323608/5905216
export function mod(n: number, m: number): number {
    return ((n % m) + m) % m;
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
