/* eslint-disable @typescript-eslint/consistent-type-definitions */

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

/**
 * Represents a successful operation
 * @template Res The type of the successful operation's result
 */
export type ResultRes<Res> = { res: Res };
/**
 * Represents a failed operation
 * @template Err The type of the failed operation's result
 */
export type ResultErr<Err> = { err: Err };
/**
 * Represents a result whose state is unknown
 * @template Res The type of the successful operation's result
 * @template Err The type of the failed operation's result
 */
export type Result<Res, Err> = ResultRes<Res> | ResultErr<Err>;

export function handleResult<Res>(result: Result<Res, unknown>, fallbackSupplier: () => Res): Res {
    return "err" in result ? fallbackSupplier() : result.res;
}

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

/**
 * A double-ended queue
 * @template T The type of the values stored in this collection
 */
export interface Deque<T> {
    prev?: Deque<T>
    readonly value: T
    next?: Deque<T>
}

/**
 * Implementation of a [stack](https://en.wikipedia.org/wiki/Stack_(abstract_data_type))
 * @template T The type of the values stored in this collection
 */
export class Stack<T> {
    /**
     * Internal backing deque
     */
    private _internal?: Deque<T>;

    /**
     * Internal tracker for the stack's size
     */
    private _size = 0;
    /**
     * The amount of elements contained in this collection
     */
    get size(): number { return this._size; }

    /**
     * Internal helper storing the versions of operations used for empty stacks
     */
    private readonly _empty = {
        push: (value: T) => {
            this._internal = { value };
            ++this._size;

            ({ push: this._push, pop: this._pop, peek: this._peek, has: this._has } = this._notEmpty);
        },
        pop: (): T => {
            throw new Error("Empty stack");
        },
        peek: (): T => {
            throw new Error("Empty stack");
        },
        has: () => false
    };

    /**
     * Internal helper storing the versions of operations used for non-empty stacks
     */
    private readonly _notEmpty = {
        push: (value: T) => {
            ++this._size;
            this._internal = this._internal!.next = { prev: this._internal, value };
        },
        pop: () => {
            --this._size;
            const value = this._internal!.value;

            if (!(this._internal = this._internal!.prev)) {
                ({ push: this._push, pop: this._pop, peek: this._peek, has: this._has } = this._empty);
            } else {
                delete this._internal.next;
            }

            return value;
        },
        peek: () => {
            return this._internal!.value;
        },
        has: () => true
    };

    /**
    * Internal reference to the current `push` operation
    */
    private _push = this._empty.push;
    /**
     * Pushes an element onto the stack
     * @param {T} value The value to add to the stack
     */
    get push(): (value: T) => void { return this._push; }

    /**
    * Internal reference to the current `pop` operation
    */
    private _pop = this._empty.pop;
    /**
     * Takes the top element of the stack, removes it and returns it
     *
     * @throws {Error} If the stack is empty
     */
    get pop(): () => T { return this._pop; }

    /**
    * Internal reference to the current `peek` operation
    */
    private _peek = this._empty.peek;
    /**
     * Returns the top element of the stack without removing it
     *
     * @throws {Error} If the stack is empty
     */
    get peek(): () => T { return this._peek; }

    /**
    * Internal reference to the current `has` operation
    */
    private _has = this._empty.has;
    /**
     * Returns whether or not the stack currently has elements. If this method return `true`,
     * `pop` and `peek` are guaranteed not to throw; inversely, if it returns `false`, then
     * `pop` and `peek` are guaranteed to throw an error;
     */
    get has(): () => boolean { return this._has; }
}
