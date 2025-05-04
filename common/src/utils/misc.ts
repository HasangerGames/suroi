import type { ObjectDefinition } from "./objectDefinitions";

/* eslint-disable @stylistic/indent */

declare global {
    // taken from https://github.com/microsoft/TypeScript/issues/45602#issuecomment-934427206
    interface Promise<T = void> {
        /**
         * Attaches a callback for only the rejection of the Promise.
         * @param onrejected The callback to execute when the Promise is rejected.
         * @returns A Promise for the completion of the callback.
         */
        catch<TResult = never>(
            onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
        ): Promise<T | TResult>
    }
}

export function isObject(item: unknown): item is Record<string, unknown> {
    return (item && typeof item === "object" && !Array.isArray(item)) as boolean;
}

/**
 * Patched version of `Array.isArray` that correctly narrows types when used on `readonly` arrays
 */
// again, variance => use any on an array type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isArray = Array.isArray as (x: any) => x is readonly any[];
// the default Array.isArray fails to correctly narrow readonly array types

// presumably because of variance, using unknown[] causes issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fn<Out = unknown> = (...args: any) => Out;

// see above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<Out = unknown, Args extends any[] = any[]> = new (...args: Args) => Out;

// see above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AbstractConstructor<Out = unknown, Args extends any[] = any[]> = abstract new (...args: Args) => Out;

export type DeepPartial<T> = {
    [K in keyof T]?: DeepPartial<T[K]>;
};

export type SDeepPartial<T> = T extends ObjectDefinition
    ? T
    : {
        [K in keyof T]?: SDeepPartial<T[K]>;
    };

export type DeepRequired<T> = (T extends Fn ? T : unknown) & (
    T extends Array<infer R>
        ? Array<DeepRequired<NonNullable<R>>>
        : {
            [K in keyof T]-?: DeepRequired<NonNullable<T[K]>>;
        }
);

export type DeepReadonly<T> = (T extends Fn ? T : unknown) & {
    readonly [K in keyof T]: DeepReadonly<T[K]>;
};

export type Mutable<T> = (T extends ReadonlyArray<infer I> ? I[] : unknown) & (T extends Fn ? T : unknown) & {
    -readonly [K in keyof T]: T[K];
};

export type DeepMutable<T> = (T extends ReadonlyArray<infer I> ? Array<DeepMutable<I>> : unknown) & (T extends Fn ? T : unknown) & {
    -readonly [K in keyof T]: DeepMutable<T[K]>;
};

export type WithPartial<O extends object, K extends keyof O> = Omit<O, K> & { [L in K]?: O[L] };

/**
 * Same as {@link Mutable} but descendants of {@link ObjectDefinition} remain untouched
 */
export type SMutable<T> = T extends ObjectDefinition
    ? T
    : (T extends ReadonlyArray<infer I> ? I[] : unknown) & (T extends Fn ? T : unknown) & {
        -readonly [K in keyof T]: T[K];
    };

/**
 * Same as {@link DeepMutable} but descendants of {@link ObjectDefinition} remain untouched
 */
export type SDeepMutable<T> = T extends ObjectDefinition
    ? T
    : (T extends ReadonlyArray<infer I> ? Array<SDeepMutable<I>> : unknown) & (T extends Fn ? T : unknown) & {
        -readonly [K in keyof T]: SDeepMutable<T[K]>;
    };

export type GetEnumMemberName<Enum extends Record<string | number, unknown>, Member extends number> = {
    [K in keyof Enum]: Enum[K] extends Member ? K : never
}[keyof Enum];

export type ReadonlyRecord<K extends string | number | symbol, T> = Readonly<Record<K, T>>;

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

// from https://stackoverflow.com/a/50375286
type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never;

export function mergeDeep<A extends readonly object[]>(target: Record<PrimitiveKey, never>, ...sources: A): UnionToIntersection<A[number]>;
export function mergeDeep<T extends object>(target: T, ...sources: ReadonlyArray<DeepPartial<T>>): T;
export function mergeDeep<T extends object>(target: T, ...sources: ReadonlyArray<DeepPartial<T>>): T {
    if (!sources.length) return target;

    const [source, ...rest] = sources;

    type StringKeys = keyof T & string;
    type SymbolKeys = keyof T & symbol;

    if (source) { // fast-track for empty objects
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
    }

    return mergeDeep(target, ...rest);
}

/**
 * Symbol used to indicate an object's deep-clone method
 * @see {@linkcode DeepCloneable}
 * @see {@linkcode cloneDeep}
*/
export const cloneDeepSymbol: unique symbol = Symbol("clone deep");

/**
 * Symbol used to indicate an object's cloning method
 */
export const cloneSymbol: unique symbol = Symbol("clone");

// what in the java
/**
 * Interface that any value wishing to provide a deep-cloning algorithm should implement
 * @see {@linkcode cloneDeepSymbol}
 * @see {@linkcode cloneDeep}
 */
export interface DeepCloneable<T> {
    [cloneDeepSymbol](): T
}

/**
 * Interface that any value wishing to provide a cloning algorithm should implement
 * @see {@linkcode cloneSymbol}
 */
export interface Cloneable<T> {
    [cloneSymbol](): T
}

/**
 * Clones a given value recursively. Primitives are returned as-is (effectively cloned), while objects are deeply cloned.
 *
 * On a best-effort basis, properties and their descriptors are kept intact; this includes custom properties on `Array`s,
 * `Map`s, and `Set`s. These three data structures also receive special handling to preserve their contents, and the subclass
 * is preserved to the best of {@linkcode Object.setPrototypeOf}'s ability.
 *
 * For class instances, callers should look into making the class implement the {@linkcode DeepCloneable} interface, and define their
 * own deep-cloning algorithm there; this method will honor any such method. Doing so ensures that the cloning process is faster,
 * more secure, and probably more efficient
 * @param object The value to clone
 * @returns A deep-copy of `object`, to the best of this method's ability
 * @see {@linkcode cloneDeepSymbol}
 * @see {@linkcode DeepCloneable}
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
                // basically we hope that the caller isn't a dumbass and hasn't
                // passed in an object with a nonsensical cloning method
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return clone.call(target);
            } else {
                console.warn(`Inappropriate use of ${cloneDeepSymbol.toString()}: it should be a no-arg function`);
            }
        }

        const copyAllPropDescs = <T>(
            to: T,
            entryFilter: (entry: readonly [string, TypedPropertyDescriptor<unknown>]) => boolean = () => true
        ): T => {
            for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(target)).filter(entryFilter)) {
                desc.value = internal(target[key as keyof typeof target]);
                Object.defineProperty(to, key, desc);
            }

            return to;
        };

        const prototype = Object.getPrototypeOf(target) as object | null;

        // special handling for certain builtins
        switch (true) {
            case target instanceof Array: {
                // we can probably treat this as an array (unless someone is trolling us)
                const root = Object.create(prototype) as T & unknown[];
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

    return object as DeepReadonly<T>;
}

// skull
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrimitiveKey = keyof any;

export function splitArray<In, Narrow extends In>(target: In[], predicate: (ele: In, index: number, array: In[]) => ele is Narrow): {
    true: Narrow[]
    false: Array<Exclude<In, Narrow>>
};
export function splitArray<In>(target: In[], predicate: (ele: In, index: number, array: In[]) => boolean): {
    true: In[]
    false: In[]
};
export function splitArray<In, const Out extends PrimitiveKey>(target: In[], predicate: (ele: In, index: number, array: In[]) => Out): Record<Out, In[]>;
/**
 * Splits an array into two subarrays based on a predicate. If `Out` is not assignable to `string | number | symbol`, use {@link groupArray} instead
 * @param target The array to split
 * @param predicate A function deciding which subarray to put each element in
 * @returns The two subarrays
 */
export function splitArray<In, const Out extends PrimitiveKey>(target: In[], predicate: (ele: In, index: number, array: In[]) => Out): Record<Out, In[]> {
    const length = target.length;
    const obj = Object.create(null) as Record<PrimitiveKey, In[]>;

    for (let i = 0; i < length; i++) {
        const ele = target[i];
        (obj[predicate(ele, i, target)] ??= []).push(ele);
    }

    return obj;
}

/**
 * Groups an array's elements based on the result of a picker function. If `Out` is assignable to `string | number | symbol`, favor the use
 * of {@link splitArray} instead
 * @param target The array to split
 * @param picker A function deciding which subarray to put each element in
 * @returns The two subarrays
 */
export function groupArray<In, Out>(target: In[], picker: (ele: In, index: number, array: In[]) => Out): Map<Out, In[]> {
    const length = target.length;
    const map = new Map<Out, In[]>();

    for (let i = 0; i < length; i++) {
        const ele = target[i];
        const key = picker(ele, i, target);
        if (map.has(key)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            map.get(key)!.push(ele);
            continue;
        }

        map.set(key, [ele]);
    }

    return map;
}

/**
 * Find and remove an element from an array.
 * @param array The array to iterate over.
 * @param value The value to check for.
 */
export function removeFrom<T>(array: T[], value: NoInfer<T>): void {
    const index = array.indexOf(value);
    if (index !== -1) array.splice(index, 1);
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
export class Stack<T> implements DeepCloneable<Stack<T>>, Cloneable<Stack<T>> {
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
        if (head === undefined) throw new Error("Empty stack");

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
        if (this._head === undefined) throw new Error("Empty stack");

        return this._head.value;
    }

    /**
     * Returns whether or not the stack currently has elements. If this method return `true`,
     * `pop` and `peek` are guaranteed not to throw; inversely, if it returns `false`, then
     * `pop` and `peek` are guaranteed to throw an error
     */
    has(): boolean {
        return this._head !== undefined;
    }

    /**
     * Cloning implementation
     * @param deep Whether to also deep-clone this stack's elements
     */
    private _clone(deep = false): Stack<T> {
        const clone = new Stack<T>();

        let current: LinkedList<T> | undefined = this._head;
        let currentClone: LinkedList<T> | undefined;
        while (current !== undefined) {
            const node = { value: deep ? cloneDeep(current.value) : current.value };

            currentClone = currentClone
                ? currentClone.next = node
                : clone._head = node;
            current = current.next;
        }

        return clone;
    }

    /**
     * Creates a clone of this {@link Stack}, without cloning the elements within
     */
    [cloneSymbol](): Stack<T> {
        return this._clone(false);
    }

    /**
     * Creates a deep clone of this {@link Stack}, cloning the elements inside it
     */
    [cloneDeepSymbol](): Stack<T> {
        return this._clone(true);
    }
}

/**
 * Implementation of a [queue](https://en.wikipedia.org/wiki/Queue_(abstract_data_type))
 * @template T The type of the elements stored in this collection
 */
export class Queue<T> implements DeepCloneable<Queue<T>>, Cloneable<Queue<T>> {
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

        if (this._tail === undefined) {
            this._tail = this._head = node;
            return;
        }

        this._tail = this._tail.next = node;
    }

    /**
     * Returns the first value in the queue, if it exists
     * @returns The value at the front of the queue
     * @throws {Error} If the queue is empty
     */
    dequeue(): T {
        if (this._head === undefined) throw new Error("Empty queue");

        const value = this._head.value;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        (this._head = this._head.next) ?? delete this._tail;

        return value;
    }

    /**
     * Returns the first element of the queue without removing it
     *
     * @throws {Error} If the queue is empty
     */
    peek(): T {
        if (this._head === undefined) throw new Error("Empty queue");

        return this._head.value;
    }

    /**
     * Returns whether or not the queue currently has elements. If this method return `true`,
     * `dequeue` and `peek` are guaranteed not to throw; inversely, if it returns `false`, then
     * `dequeue` and `peek` are guaranteed to throw an error
     */
    has(): boolean {
        return this._head !== undefined;
    }

    /**
     * Cloning implementation
     * @param deep Whether to clone this queue's elements
     */
    private _clone(deep = false): Queue<T> {
        const clone = new Queue<T>();

        let current: LinkedList<T> | undefined = this._head;
        let currentClone: LinkedList<T> | undefined;
        while (current !== undefined) {
            const node = { value: deep ? cloneDeep(current.value) : current.value };

            currentClone = currentClone
                ? currentClone.next = node
                : clone._head = node;

            current = current.next ?? void (clone._tail = current);
        }

        return clone;
    }

    /**
     * Creates a clone of this {@link Queue}, without cloning the elements within
     */
    [cloneSymbol](): Queue<T> {
        return this._clone(false);
    }

    /**
     * Creates a deep clone of this {@link Queue}, cloning the elements inside it
     */
    [cloneDeepSymbol](): Queue<T> {
        return this._clone(true);
    }
}

// top 10 naming
export class ExtendedMap<K, V> extends Map<K, V> {
    private _get(key: K): V {
        // it's up to callers to verify that the key is valid
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return super.get(key)!;
    }

    /**
     * Retrieves the value at a given key, placing (and returning) a user-defined
     * default value if no mapping for the key exists
     * @param key      The key to retrieve from
     * @param fallback A value to place at the given key if it currently not associated with a value
     * @returns The value emplaced at key `key`; either the one that was already there or `fallback` if
     *          none was present
     */
    getAndSetIfAbsent(key: K, fallback: V): V {
        // pretty obvious why this is okay
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (this.has(key)) return this.get(key)!;

        this.set(key, fallback);
        return fallback;
    }

    /**
     * Retrieves the value at a given key, placing (and returning) a user-defined
     * default value if no mapping for the key exists
     * @param key      The key to retrieve from
     * @param fallback A function providing a value to place at the given key if it currently not
     *                 associated with a value
     * @returns The value emplaced at key `key`; either the one that was already there
     *          or the result of `fallback` if none was present
     */
    getAndGetDefaultIfAbsent(key: K, fallback: () => V): V {
        // pretty obvious why this is okay
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (this.has(key)) return this.get(key)!;

        const value = fallback();
        this.set(key, value);

        return value;
    }

    ifPresent(key: K, callback: (obstacle: V) => void): void {
        this.ifPresentOrElse(key, callback, () => { /* no-op */ });
    }

    ifPresentOrElse(key: K, callback: (obstacle: V) => void, ifAbsent: () => void): void {
        const mappingPresent = super.has(key);

        if (!mappingPresent) {
            return ifAbsent();
        }

        callback(this._get(key));
    }

    mapIfPresent<U = V>(key: K, mapper: (value: V) => U): U | undefined {
        if (!super.has(key)) return undefined;

        return mapper(this._get(key));
    }
}

export type PredicateFor<
    Enum extends Record<string | number, string | number>,
    Member extends number | undefined
> = Enum[keyof Enum] extends Member
    ? {
        // if Member === Enum[keyof Enum], then they should all be boolean | undefined; if not, narrow as appropriate
        readonly [K in (keyof Enum & string) as `is${K}`]?: boolean | undefined
    }
    : Readonly<Record<`is${GetEnumMemberName<Enum, NonNullable<Member>> & string}`, true>> & {
        readonly [
            K in Exclude<Enum[keyof Enum], Member> as `is${GetEnumMemberName<Enum, K & number> & string}`
        ]?: K extends GetEnumMemberName<Enum, NonNullable<Member>> ? never : false
    };
