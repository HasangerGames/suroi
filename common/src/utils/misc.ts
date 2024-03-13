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

    type StringKeys = (keyof T & string);
    type SymbolKeys = (keyof T & symbol);

    for (
        const key of (
            Object.keys(source) as Array<StringKeys | SymbolKeys>
        ).concat(Object.getOwnPropertySymbols(source) as SymbolKeys[])
    ) {
        const [sourceProp, targetProp] = [source[key], target[key]];
        if (isObject(sourceProp)) {
            if (isObject(targetProp)) {
                mergeDeep(targetProp, sourceProp as DeepPartial<T[keyof T] & object>);
            } else {
                target[key] = cloneDeep(sourceProp) as T[StringKeys] & T[SymbolKeys];
            }
            continue;
        }

        target[key] = sourceProp as T[StringKeys] & T[SymbolKeys];
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
 * A [singly-linked list](https://en.wikipedia.org/wiki/Linked_list)
 * @template T The type of the values stored in this collection
 */
export interface LinkedList<T> {
    readonly value: T
    next?: LinkedList<T>
}

/**
 * A [doubly-linked list](https://en.wikipedia.org/wiki/Doubly_linked_list)
 * @template T The type of the values stored in this collection
 */
export interface DoublyLinkedList<T> {
    prev?: DoublyLinkedList<T>
    readonly value: T
    next?: DoublyLinkedList<T>
}

/**
 * Implementation of a [stack](https://en.wikipedia.org/wiki/Stack_(abstract_data_type))
 * @template T The type of the values stored in this collection
 */
export class Stack<T> {
    /**
     * Internal backing linked list
     */
    private _head?: LinkedList<T>;

    /**
     * Pushes an element onto the stack
     * @param {T} value The value to add to the stack
     */
    push(value: T): void {
        this._head = { value, next: this._head };
    }

    /**
     * Takes the top element of the stack, removes it, and returns it
     *
     * @throws {Error} If the stack is empty
     */
    pop(): T {
        const head = this._head;
        if (!head) throw new Error("Empty stack");

        const value = head.value;
        this._head = head.next;
        return value;
    }

    /**
     * Returns the top element of the stack without removing it
     *
     * @throws {Error} If the stack is empty
     */
    peek(): T {
        if (!this._head) throw new Error("Empty stack");

        return this._head.value;
    }

    /**
     * Returns whether or not the stack currently has elements. If this method return `true`,
     * `pop` and `peek` are guaranteed not to throw; inversely, if it returns `false`, then
     * `pop` and `peek` are guaranteed to throw an error
     */
    has(): boolean {
        return !!this._head;
    }
}

/**
 * Implementation of a [queue](https://en.wikipedia.org/wiki/Queue_(abstract_data_type))
 * @template T The type of the elements stored in this collection
 */
export class Queue<T> {
    /**
     * A reference to the beginning of the internal linked list for this collection
     */
    private _head?: LinkedList<T>;

    /**
     * A reference to the end of internal linked list for this collection
     */
    private _tail?: LinkedList<T>;

    /**
     * Adds a value to the end of the queue
     *
     * @param value The value to add
     */
    enqueue(value: T): void {
        const node = { value };

        if (!this._head) {
            this._tail = this._head = node;
            return;
        }

        this._tail = this._tail!.next = node;
    }

    /**
     * Returns the first value in the queue, if it exists
     * @returns The value at the front of the queue
     * @throws {Error} If the queue is empty
     */
    dequeue(): T {
        if (!this._head) throw new Error("Empty queue");

        const value = this._head.value;

        // eslint-disable-next-line no-cond-assign
        (this._head = this._head.next) ?? delete this._tail;

        return value;
    }

    /**
     * Returns the first element of the queue without removing it
     *
     * @throws {Error} If the queue is empty
     */
    peek(): T {
        if (!this._head) throw new Error("Empty queue");

        return this._head.value;
    }

    /**
     * Returns whether or not the queue currently has elements. If this method return `true`,
     * `dequeue` and `peek` are guaranteed not to throw; inversely, if it returns `false`, then
     * `dequeue` and `peek` are guaranteed to throw an error
     */
    has(): boolean {
        return !!this._head;
    }
}
