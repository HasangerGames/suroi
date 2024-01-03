export function isObject(item: unknown): item is Record<string, unknown> {
    return (item && typeof item === "object" && !Array.isArray(item)) as boolean;
}

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type DeepRequired<T> = T extends Array<infer R>
    ? Array<DeepRequired<NonNullable<R>>>
    : {
        [K in keyof T]-?: DeepRequired<NonNullable<T[K]>>;
    };

export type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

export function mergeDeep<T extends object>(target: T, ...sources: Array<DeepPartial<T>>): T {
    if (!sources.length) return target;

    const [source, ...rest] = sources;

    for (const _key in source) {
        const key: keyof T = _key;

        const [sourceProp, targetProp] = [source[key], target[key]];
        if (isObject(targetProp)) {
            mergeDeep(targetProp, sourceProp as DeepPartial<T[keyof T] & object>);
            continue;
        }

        target[key] = sourceProp as T[keyof T];
    }

    return mergeDeep(target, ...rest);
}

export function cloneDeep<T>(object: T): T {
    if (!isObject(object)) return object;

    const clone = new (Object.getPrototypeOf(object).constructor)();

    for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(object))) {
        const clonedProperty = object[key as keyof T];

        desc.value = cloneDeep(clonedProperty);
        Object.defineProperty(clone, key, desc);
    }

    return clone;
}

export function freezeDeep<T>(object: T): DeepReadonly<T> {
    Object.freeze(object);

    for (const key in object) {
        const value = object[key];

        if (typeof value === "object" && value !== null) {
            freezeDeep(value);
        }
    }

    return object;
}

export class Timeout {
    callback: () => void;
    end: number;
    killed = false;

    constructor(callback: () => void, end: number) {
        this.end = end;
        this.callback = callback;
    }

    kill(): void {
        this.killed = true;
    }
}
