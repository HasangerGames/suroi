export function isObject(item: unknown): item is Record<string, unknown> {
    return (item && typeof item === "object" && !Array.isArray(item)) as boolean;
}

export type DeepPartial<T> = {
    [K in keyof T]?: DeepPartial<T[K]>;
};

export type DeepRequired<T> = T extends Array<infer R>
    ? Array<DeepRequired<NonNullable<R>>>
    : {
        [K in keyof T]-?: DeepRequired<NonNullable<T[K]>>;
    };

export type DeepReadonly<T> = {
    readonly [K in keyof T]: DeepReadonly<T[K]>;
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

/**
 * Symbol used to indicate an object's deep-clone method
 * @see {@linkcode Cloneable}
 * @see {@linkcode cloneDeep}
*/
export const cloneDeepSymbol: unique symbol = Symbol("clone deep");

// what in the java
/**
 * Interface that any value wishing to provide a deep-cloning algorithm should implement
 * @see {@linkcode cloneDeepSymbol}
 * @see {@linkcode cloneDeep}
 */
export interface Cloneable<T> {
    [cloneDeepSymbol](): T
}

/**
 * Clones a given value recursively. Primitives are returned as-is (effectively cloned), while objects are deeply cloned.
 *
 * On a best-effort basis, properties and their descriptors are kept intact; this includes custom properties on `Array`s,
 * `Map`s, and `Set`s. These three data structures also receive special handling to preserve their contents, and the subclass
 * is preserved to the best of {@linkcode Object.setPrototypeOf}'s ability.
 *
 * For class instances, callers should look into making the class implement the {@linkcode Cloneable} interface, and define their
 * own deep-cloning algorithm there; this method will honor any such method. Doing so ensures that the cloning process is faster,
 * more secure, and probably more efficient
 * @param object The value to clone
 * @returns A deep-copy of `object`, to the best of this method's ability
 * @see {@linkcode cloneDeepSymbol}
 * @see {@linkcode Cloneable}
 */
export function cloneDeep<T>(object: T): T {
    // For cyclical data structures, ensures that cyclical-ness is preserved in the clone
    const clonedNodes = new Map<unknown, unknown>();

    return (function internal<T>(target: T): T {
        if (!isObject(target) && !Array.isArray(target)) return target;
        if (clonedNodes.has(target)) return clonedNodes.get(target) as T;

        if (cloneDeepSymbol in target) {
            const clone = target[cloneDeepSymbol];
            if (typeof clone === "function" && clone.length === 0) {
                return clone.call(target);
            } else {
                console.warn(`Inappropriate use of ${cloneDeepSymbol.toString()}: it should be a no-arg function`);
            }
        }

        const copyAllPropDescs = <T>(
            to: T,
            entryFilter: (entry: readonly [string, TypedPropertyDescriptor<any>]) => boolean = () => true
        ): T => {
            for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(target)).filter(entryFilter)) {
                desc.value = internal(target[key as keyof typeof target]);
                Object.defineProperty(to, key, desc);
            }

            return to;
        };

        const prototype = Object.getPrototypeOf(target);

        // special handling for certain builtins
        switch (true) {
            case target instanceof Array: {
                // we can probably treat this as an array (unless someone is trolling us)
                const root = Object.create(prototype);
                clonedNodes.set(target, root);

                for (let i = 0, l = target.length; i < l; i++) {
                    root[i] = internal(target[i]);
                }

                return copyAllPropDescs(root, ([key]) => /* filter out numeric keys */ Number.isNaN(+key));
            }
            case target instanceof Map: {
                const root = new Map<unknown, unknown>();
                clonedNodes.set(target, root);

                for (const [k, v] of (target as T & Map<unknown, unknown>).entries()) {
                    root.set(internal(k), internal(v));
                }

                // Map.prototype methods reject targets which aren't direct instances of `Map`, so our hand is kinda forced here
                Object.setPrototypeOf(root, prototype);
                return copyAllPropDescs(root as T);
            }
            case target instanceof Set: {
                const root = new Set<unknown>();
                clonedNodes.set(target, root);

                for (const v of target) root.add(internal(v));

                // Set.prototype methods reject targets which aren't direct instances of `Set`, so our hand is kinda forced here
                Object.setPrototypeOf(root, prototype);
                return copyAllPropDescs(root as T);
            }
            default: {
                /*
                    we pray that if a constructor is present, that it doesn't incur side-effects…
                    or at least, not necessary ones
                */
                const clone = Object.create(prototype) as T;
                clonedNodes.set(target, clone);

                return copyAllPropDescs(clone);
            }
        }
    })(object);
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
export class Stack<T> implements Cloneable<Stack<T>> {
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

    /**
     * Creates a deep clone of this {@link Stack}, cloning the elements inside it
     */
    [cloneDeepSymbol](): Stack<T> {
        const clone = new Stack<T>();

        let current: LinkedList<T> | undefined = this._head;
        let currentClone: LinkedList<T> | undefined;
        while (current !== undefined) {
            const node = { value: cloneDeep(current.value) };

            currentClone = currentClone
                ? currentClone.next = node
                : clone._head = node;
            current = current.next;
        }

        return clone;
    }
}

/**
 * Implementation of a [queue](https://en.wikipedia.org/wiki/Queue_(abstract_data_type))
 * @template T The type of the elements stored in this collection
 */
export class Queue<T> implements Cloneable<Queue<T>> {
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

    /**
     * Creates a deep clone of this queue, cloning the elements within it
     */
    [cloneDeepSymbol](): Queue<T> {
        const clone = new Queue<T>();

        let current: LinkedList<T> | undefined = this._head;
        let currentClone: LinkedList<T> | undefined;
        while (current !== undefined) {
            const node = { value: cloneDeep(current.value) };

            currentClone = currentClone
                ? currentClone.next = node
                : clone._head = node;

            current = current.next ?? void (clone._tail = current);
        }

        return clone;
    }
}
