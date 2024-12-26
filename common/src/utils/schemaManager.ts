import type { ObjectDefinition, ObjectDefinitions, ReferenceTo, ReifiableDef } from "./objectDefinitions";

/**
 * Represents a collection of items, with each item either being present or not.
 * @template Def The type of item held by this collection
 * @template SizeT The numeric type used to represent the collection as a bitfield.
 * Schemas with less than 30 items should use `number` for performance, those with
 * more than 30 items should use `bigint` for correctness (`number` bitwise breaks
 * around 30 bits)
 *
 * Implementors are free to choose whether they wish to use a bitfield or an array
 * as the primary data structure
 */
export interface SchemaCollection<Def extends ObjectDefinition, SizeT extends number | bigint = number> {
    /**
     * Returns this collection as a bitfield, which is to say, returns a number where for each bit `b`,
     * `num & (1 << b) !== 0` if and only if the schema entry at position `b` is contained within the collection
     */
    asBitfield(): SizeT
    /**
     * Returns this collection as a list, which is to say, returns a list containing all
     * the entries which are present in this schema
     */
    asList(): Def[]
}

export interface SchemaManager<Def extends ObjectDefinition, SizeT extends number | bigint = number> extends SchemaCollection<Def, SizeT> {
    /**
     * Adds an item to this collection
     * @param item The item to add
     * @returns Whether the item was already present (and thus nothing has changed)
     */
    addItem(item: ReifiableDef<Def>): boolean

    /**
     * Whether this collection contains the entry in question
     * @param item The item to query
     * @returns Whether the item is in the collection
     */
    hasItem(item: ReifiableDef<Def>): boolean

    /**
     * Removes a item from this collection
     * @param item The item to remove
     * @returns Whether the item was present (and therefore removed, as opposed
     * to not being removed due to not being present to begin with)
     */
    removeItem(item: ReifiableDef<Def>): boolean

    /**
     * Toggles an item in this collection, removing it if it is present and adding it otherwise
     * @param item The item to toggle
     * @returns Whether the item is now in the collection (aka, returns `true` if the item was
     * absent but is now present)
     */
    toggleItem(item: ReifiableDef<Def>): boolean

    /**
     * Calls a user-supplied function with a given entry, if it is present in this collection
     * @param item The item to query
     * @param cb A function to be called with the entry in question if it is in this collection
     */
    ifPresent<Name extends ReferenceTo<Def>>(
        item: Name | (Def & { readonly idString: Name }),
        cb: (def: Def & { readonly idString: Name }) => void
    ): void

    /**
     * Applies a mapping function to an element of the schema if it is present in this collection. If not, `undefined` is returned.
     * @param item The item to potentially map
     * @param mapper The mapping function. If the function may return `undefined`, it may be wise to make it return `null` instead,
     * to differentiate the two return values
     * @returns The result of the mapping function, or `undefined` if the item is not in this collection
     */
    map<Name extends ReferenceTo<Def>, U>(
        item: Name | (Def & { readonly idString: Name }),
        mapper: (data: Def & { readonly idString: Name }) => U
    ): U | undefined

    /**
     * Applies a mapping function to an element of the schema if it is present, returning a user-defined default if not
     * @param item The item to potentially map
     * @param mapper The mapping function
     * @param defaultValue The default value to return if the given item is not in this collection
     * @returns The result of the mapping function, or the supplied default value if the item is not in this collection
     */
    mapOrDefault<Name extends ReferenceTo<Def>, U>(
        item: Name | (Def & { readonly idString: Name }),
        mapper: (data: Def & { readonly idString: Name }) => U,
        defaultValue: U
    ): U

    [Symbol.iterator](): Iterator<Def>
}

/**
 * Ensures that `V` is either `number` or `bigint`. In the case of `number | bigint`, `never` is returned.
 *
 * Does not work with numeric literals: `DisallowUnion<0 | 1> == 0 | 1`, `DisallowUnion<0 | 1n> == 0 | 1n`
 */
type DisallowUnion<V extends number | bigint> = number extends V ? bigint extends V ? never : V : V;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
interface BitfieldBasedSchemaManager<
    Def extends ObjectDefinition,
    SizeT extends number | bigint = number
> extends SchemaManager<Def, SizeT> {}

// used to make protected properties visible
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class BitfieldBasedSchemaManager<
    Def extends ObjectDefinition,
    SizeT extends number | bigint = number
> implements SchemaManager<Def, SizeT> {
    declare protected _items: SizeT;
    declare protected readonly _idStringToSizeT: Record<ReferenceTo<Def>, SizeT>;
    constructor(items?: number | readonly Def[]) { throw new Error(); };
}

/**
 * Creates a {@link SchemaManager} from an {@link ObjectDefinitions}. The `SizeT` type is automatically inferred from
 * the schema's size
 * @template Def The type of definition in the schema and collection
 * @template SizeT The numeric type to use for the internal bitfield. See {@link SchemaCollection}
 * @param schema The schema
 * @param name Optionally specify the name of the collection
 * @param dummy A sentinel value use to enforce the correctness of the numeric type at runtime. If `bigint` is specified,
 *               it is automatically used without question. If `number` is specified, but the schema should actually use
 *               `bigint` (because it has 30 or more elements), a type error is raised. Only the type matters.
 * @returns A class conforming to {@link SchemaManager}
 *
 * @see {@link SchemaManager}
 * @see {@link SchemaCollection}
 */
export function makeSchemaManager<
    Def extends ObjectDefinition,
    SizeT extends number | bigint
>(schema: ObjectDefinitions<Def>, name = "", dummy: DisallowUnion<SizeT>): typeof BitfieldBasedSchemaManager<Def, SizeT> {
    if (typeof dummy === "number" && schema.definitions.length >= 30) {
        throw new TypeError(`Desired SizeT type (number) is not precise enough for a schema of 30 or more elements. (schema name: ${schema.name}, size: ${schema.definitions.length})`);
    }

    const size_t = (typeof dummy === "number" ? Number : BigInt) as unknown as (value: unknown) => SizeT;

    const zero = size_t(0);
    const oneShifted = (n: number | bigint): SizeT => (size_t(1) << size_t(n)) as SizeT;

    return {
        [name]: class implements SchemaManager<Def, SizeT> {
            protected _items: SizeT = zero;
            protected readonly _idStringToSizeT: Record<ReferenceTo<Def>, SizeT>;

            constructor(
                items?: number | readonly Def[]
            ) {
                this._idStringToSizeT = schema.definitions.reduce<Record<ReferenceTo<Def>, SizeT>>(
                    (acc, { idString }, i) => {
                        acc[idString as ReferenceTo<Def>] = size_t(i);
                        return acc;
                    },
                    {} as Record<ReferenceTo<Def>, SizeT>
                );

                // @ts-expect-error we write terse code and stay winning
                if (typeof (this._items = (items ?? 0)) === "object") {
                    this._items = (items as readonly Def[])
                        .map(({ idString }) => oneShifted(this._idStringToSizeT[idString as ReferenceTo<Def>]))
                        // SAFETY: acc and cur have the same type, so the "as number"
                        // isn't sound, but the addition and "as SizeT" both are
                        .reduce((acc, cur) => ((acc as number) + (cur as number)) as SizeT, zero);
                }
            }

            addItem(item: ReifiableDef<Def>): boolean {
                const idString: ReferenceTo<Def> = typeof item === "object" ? item.idString : item;

                const n = oneShifted(this._idStringToSizeT[idString]);
                const absent = (this._items & n) === zero;
                // @ts-expect-error ts can't correctly infer the type for
                // bitwise OR and (presumably) defaults to using number,
                // which is incorrect; it should be SizeT
                this._items |= n;

                return absent;
            }

            hasItem(item: ReifiableDef<Def>): boolean {
                const idString: ReferenceTo<Def> = typeof item === "object" ? item.idString : item;
                return (this._items & oneShifted(this._idStringToSizeT[idString])) !== zero;
            }

            removeItem(item: ReifiableDef<Def>): boolean {
                const idString: ReferenceTo<Def> = typeof item === "object" ? item.idString : item;
                const n = oneShifted(this._idStringToSizeT[idString]);
                const has = (this._items & n) !== zero;
                // @ts-expect-error ts can't correctly infer the type for
                // bitwise AND and (presumably) defaults to using number,
                // which is incorrect; it should be SizeT
                this._items &= ~n;

                return has;
            }

            toggleItem(item: ReifiableDef<Def>): boolean {
                const idString: ReferenceTo<Def> = typeof item === "object" ? item.idString : item;
                const n = oneShifted(this._idStringToSizeT[idString]);
                if ((this._items & n) !== zero) {
                    // @ts-expect-error see comment in removeItem
                    this._items &= ~n;
                    return false;
                }

                // @ts-expect-error see comment in addItem
                this._items |= n;
                return true;
            }

            ifPresent<Name extends ReferenceTo<Def>>(
                item: Name | (Def & { readonly idString: Name }),
                cb: (def: Def & { readonly idString: Name }) => void
            ): void {
                if (this.hasItem(item)) {
                    cb(schema.reify(item));
                }
            }

            map<Name extends ReferenceTo<Def>, U>(
                item: Name | (Def & { readonly idString: Name }),
                mapper: (data: Def & { readonly idString: Name }) => U
            ): U | undefined {
                if (this.hasItem(item)) {
                    return mapper(schema.reify(item));
                }
            }

            mapOrDefault<Name extends ReferenceTo<Def>, U>(
                item: Name | (Def & { readonly idString: Name }),
                mapper: (data: Def & { readonly idString: Name }) => U,
                defaultValue: U
            ): U {
                if (this.hasItem(item)) {
                    return mapper(schema.reify(item));
                }

                return defaultValue;
            }

            asBitfield(): SizeT {
                return this._items;
            }

            asList(): Def[] {
                return schema.definitions.filter((_, i) => (this._items & oneShifted(i)) !== zero);
            }

            [Symbol.iterator](): Iterator<Def> {
                return this.asList()[Symbol.iterator]();
            }
        }
    }[name] as unknown as typeof BitfieldBasedSchemaManager<Def, SizeT>;
}
