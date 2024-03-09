import { type ExplosionDefinition } from "../definitions/explosions";
import { type SuroiBitStream } from "./suroiBitStream";
import { type Vector } from "./vector";

/*
    eslint-disable

    @typescript-eslint/indent,
    @typescript-eslint/consistent-type-definitions,
    @typescript-eslint/prefer-reduce-type-parameter,
*/

/*
    `@typescript-eslint/indent`                       Indenting rules for TS generics suck -> get disabled
    `@typescript-eslint/consistent-type-definitions`  Top 10 most pointless rules
    `@typescript-eslint/prefer-reduce-type-parameter` This rule doesn't even work correctly when the accumulator
                                                      is being built up over the course of the reduction operation
*/

/**
 * A function producing a partial version of a given object definition
 * @template Def The definition that will partially be constructed by this function
 */
// It's a function whose argument types are narrowed if needed, and `unknown` causes false errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PartialFn<Def extends ObjectDefinition> = (...args: readonly any[]) => Partial<Def>;

/**
 * A declaration of a partial that extends another partial
 * @template Keys The names of the other partials that can be extended
 * @template Def The definition that will be partially constructed by this partial
 */
type PartialExtension<Keys extends string, Def extends ObjectDefinition> = {
    /**
     * The name of the partial that this partial should extend
     */
    readonly extends: Keys
    /**
     * @see {@linkcode PartialFn}
     */
    readonly applier: PartialFn<Def>
};

/**
 * Either a {@linkcode PartialFn} or a {@linkcode PartialExtension}
 * @template Keys The names of the other partials in the collection this declaration belongs to
 * @template Def The definition that will be partially constructed
 */
type PartialDecl<Keys extends string, Def extends ObjectDefinition> = PartialFn<Def> | PartialExtension<Keys, Def>;

/**
 * A record of strings associated with partials. Each partial can then be extended to form a complete definition
 * @template Keys The specific keys in this record. Stricter typings works best
 * @template Def The type of definition that the partials are partials of
 */
type Partials<Keys extends string, Def extends ObjectDefinition> = Readonly<Record<Keys, PartialDecl<Keys, Def>>>;

/**
 * Gets the function type associated with a certain partial. If `PartialsDecl[Key]` is already a function, then it's
 * returned as-is; otherwise, it's inheriting from another partial, and the appropriate typing for the overall function
 * is calculated
 * @template Def The type of definitions the partials construct
 * @template Keys The specific keys in the partials record. Stricter typings work best
 * @template PartialsDecl The partial record to search through when resolving inherited partials
 * @template Key The specific id of the partial whose function type is desired
 */
type GetPartialDeclFn<
    Def extends ObjectDefinition,
    Keys extends string,
    PartialsDecl extends Partials<Keys, Def>,
    Key extends Keys
> = ((...args: readonly unknown[]) => unknown) & (
    PartialsDecl[Key] extends PartialExtension<Keys, Def>
        ? GetInheritedDef<Def, Keys, PartialsDecl[Key]["applier"], GetPartialDeclFn<Def, Keys, PartialsDecl, PartialsDecl[Key]["extends"]>>
        : PartialsDecl[Key]
);

/**
 * A helper type to reduce repetition (Haskell-style `where` clause when™) when assembling the type for an inherited
 * partial.
 *
 * **API note**: Function arguments for inherited partials are somewhat messily assembled; the first argument is
 * the arguments for the extension (aka the partial doing the extending), and the second argument is the arguments
 * for the inherited partial (aka the partial being inherited from). *This schema applies recursively*, somewhat
 * unfortunately.
 *
 * For example, take the partial A, whose function has parameters `[number, number]`; and the partial B, whose
 * parameters are `[string, string]`. If B extends A, then the resulting function returned by this type will
 * have parameters of type `[[string, string], [number, number]]`
 *
 * If partial C then extends B, with C having parameters `[boolean, boolean]`, then the function returned by
 * this type will have parameters of type `[[boolean, boolean], [[string, string], [number, number]]]`
 *
 * @template Def The type of definition this function creates
 * @template Keys The names of the partials in the collection
 * @template ApplierFn The type of the extended partial's (aka the one doing the inheriting) function
 * @template PDeclFn The type of the inherited partial's (aka the one being inherited from) function
 *
 * @param extensionArgs The arguments to pass to the extended partial's (aka the one doing the inheriting) function
 * @param inheritArgs The arguments to pass to the inherited partial's (aka the one being inherited from) function.
 * See the API note for more information regarding the format these are passed in
 * @returns The result of combining the inherited definition with the extended definition. (_**WARNING**: This is currently
 * set to be `Def` because setting it to the more correct type leads to type instantiation considered "excessively deep". See
 * the comment accompanying this type's definition for more info_)
 */
type GetInheritedDef<
    Def extends ObjectDefinition,
    Keys extends string,
    ApplierFn extends PartialExtension<Keys, Def>["applier"],
    PDeclFn extends GetPartialDeclFn<Def, Keys, Partials<Keys, Def>, PartialExtension<Keys, Def>["extends"]>
> = (
        extensionArgs: Parameters<ApplierFn>,
        inheritArgs: Parameters<PDeclFn>
    ) => /* ReturnType<ApplierFn> & ReturnType<PDeclFn> */ Def;
/*
    ! WARNING !
    This return type is INTENTIONALLY INCORRECT and was chosen to be too lenient instead of too restrictive.
    The correct return type has been left as a comment. Using it causes TS2589 ("Type instantiation is excessively deep"),
    and so for now, it has been simplified.

    This means that the API is technically unsound, however any abusive usage should result in a definition validation failure.
*/

/**
 * A class representing a list of definitions
 * @template Def The specific type of `ObjectDefinition` this class holds
 */
export class ObjectDefinitions<Def extends ObjectDefinition = ObjectDefinition> {
    /**
     * How many bits are needed to identify a given object belonging to this definition set
     */
    readonly bitCount: number;
    /**
     * Internal collection storing the definitions
     */
    readonly definitions: readonly Def[];
    /**
     * A private mapping between identification strings and the index in the definition array
     */
    private readonly idStringToNumber: Record<string, number> = {};

    /*
        idea: a "standard" set of factories that can be used by default? for example a lot of
        definitions follow the trend of having the `name` and `idString` be the same, except
        that the name is capitalized and spaced, whereas the `idString` is in lowercase and
        snake_case (ex: "Some cool item", "some_cool_item"); perhaps a factory could be
        dedicated to simplifying this common pattern?

        some definitions also spam-repeat `itemType: ItemType.Whatever`, so making that into a
        factory could be interesting too

        but maybe a more lightweight syntax would be needed for such "builtin" factories
    */

    /**
     * Sets up the creation of a new object definition list utilizing partial definitions
     * @template Def The specific type of `ObjectDefinition` that this list will contain
     * @returns A function accepting a set of partials to be used in the definitions
     */
    static create<Def extends ObjectDefinition = ObjectDefinition>() {
        /**
         * A function to declare the partials to be used in this definition set.
         *
         * @template PartialsDecl The specific subtype of `Partials` used for `partialsDecl`.
         * @param partialsDecl An object whose keys are identifiers for partial definitions and whose values are the
         * partials in question.
         * @returns Another function to declare the actual definitions used by this definition list. In this function,
         * the partials created here will be available for use.
         * @see {@linkcode Partials}
         */
        return <const PartialsDecl extends Partials<keyof PartialsDecl & string, Def>>(partialsDecl: PartialsDecl) => {
            /**
             * Helper type, self-explanatory
             */
            type Keys = keyof PartialsDecl & string;

            /**
             * A function used to declare the definitions to use inside this definition list.
             *
             * @param definitionsDecl A function responsible for providing the list of definitions to be used
             * inside this list. It receives another function, known as the applier, which is used to invoke
             * the inheritance mechanism by passing the name of the desired partial, followed by any necessary
             * argument for that partial's function.
             */
            return (
                definitionsDecl: (
                    /**
                     * A function used to create a definition that inherits from a previously-declared partial
                     * definition.
                     *
                     * @param
                     */
                    apply: <
                        Key extends Keys,
                        Overrides extends Partial<Def>
                    >(
                        name: Key,
                        overrides: Overrides,
                        ...args: Parameters<GetPartialDeclFn<Def, Keys, PartialsDecl, Key>>
                    ) => ReturnType<GetPartialDeclFn<Def, Keys, PartialsDecl, Key>> & Overrides
                ) => readonly Def[]
            ) => {
                type ObjectEntries = <O extends object>(obj: O) => Array<readonly [keyof O, O[keyof O]]>;

                function resolveInheritance<K extends Keys>(key: K, ...trace: Keys[]): PartialFn<Def> {
                    const value = partialsDecl[key];
                    if (typeof value === "function") return value;

                    const inheritTargetName = value.extends;
                    if (!(inheritTargetName in partialsDecl)) {
                        throw new Error(`Partial '${String(key)}' tried to extend non-existant partial '${inheritTargetName}'`);
                    }

                    if (trace.includes(inheritTargetName)) {
                        throw new Error(`Circular dependency found: ${[...trace, inheritTargetName].join(" -> ")}`);
                    }

                    const inheritTarget = resolveInheritance(inheritTargetName, ...trace, inheritTargetName);
                    // documentation comment below is p much copied from `GetInheritedDef`, with some modifications
                    /**
                     * @param extensionArgs The arguments to pass to the extended partial's (aka the one doing the inheriting) function
                     * @param inheritArgs The arguments to pass to the inherited partial's (aka the one being inherited from) function.
                     * See the API note on {@linkcode GetInheritedDef} for more information regarding the format these are passed in
                     * @returns The result of combining the inherited definition with the extended definition. (_**WARNING**: This is currently
                     * set to be `Def` because setting it to the more correct type leads to type instantiation considered "excessively deep". See
                     * the comment accompanying {@linkcode GetInheritedDef}'s definition for more info_)
                     */
                    return (
                        extensionArgs: Parameters<typeof value.applier>,
                        inheritArgs: Parameters<typeof inheritTarget>
                    ) => Object.assign({}, inheritTarget(...inheritArgs), value.applier(...extensionArgs)) as Def;
                }

                const partials = (Object.entries as ObjectEntries)(partialsDecl).map(
                    ([key]) => [key, resolveInheritance(key as Keys, key as Keys)] as const
                ).reduce(
                    (acc, [key, fn]) => {
                        acc[key as Keys] = fn;
                        return acc;
                    },
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- top 10 irrelevant
                    {} as Record<Keys, PartialFn<Def>>
                );

                return new ObjectDefinitions<Def>(
                    definitionsDecl(
                        (name, overrides, ...args) => Object.assign(
                            {},
                            partials[name](...args) as ReturnType<GetPartialDeclFn<Def, Keys, PartialsDecl, typeof name>>,
                            overrides
                        )
                    )
                );
            };
        };
    }

    /**
     * Creates a new instance of `ObjectDefinitions`. Can be used to bypass the inheritance system if such
     * functionalities aren't needed
     * @param definitions An array of definitions to store within this object
     */
    constructor(definitions: readonly Def[]) {
        this.bitCount = Math.ceil(Math.log2(definitions.length));

        this.definitions = definitions;

        for (let i = 0, defLength = definitions.length; i < defLength; i++) {
            const idString = definitions[i].idString;
            if (this.idStringToNumber[idString] !== undefined) {
                throw new Error(`Duplicated idString: ${idString}`);
            }

            this.idStringToNumber[idString] = i;
        }
    }

    reify<U extends Def = Def>(type: ReifiableDef<Def>): U {
        return typeof type === "string"
            ? this.fromString<U>(type)
            : type as U;
    }

    fromString<U extends Def = Def>(idString: ReferenceTo<U>): U {
        const id = this.idStringToNumber[idString];
        if (id === undefined) throw new Error(`Unknown idString: ${idString}`);
        return this.definitions[id] as U;
    }

    writeToStream(stream: SuroiBitStream, type: ReifiableDef<Def>): void {
        stream.writeBits(
            this.idStringToNumber[
                typeof type === "string" ? type : type.idString
            ],
            this.bitCount
        );
    }

    readFromStream<Specific extends Def = Def>(stream: SuroiBitStream): Specific {
        const id = stream.readBits(this.bitCount);
        const max = this.definitions.length - 1;
        if (id > max) {
            console.warn(`ID out of range: ${id} (max: ${max})`);
        }

        return this.definitions[id] as Specific;
    }

    [Symbol.iterator](): Iterator<Def> {
        return this.definitions[Symbol.iterator]();
    }
}

export interface ObjectDefinition {
    readonly idString: string
    readonly name: string
}

/**
 * Semantically equivalent to `string`, this type is more to convey an intent
 */
export type ReferenceTo<T extends ObjectDefinition = ObjectDefinition> = T["idString"];

export type ReifiableDef<T extends ObjectDefinition> = ReferenceTo<T> | T;

// expand this as needed
export enum ItemType {
    Gun,
    Ammo,
    Melee,
    Throwable,
    Healing,
    Armor,
    Backpack,
    Scope,
    Skin
}

export enum ObstacleSpecialRoles {
    Door,
    Wall,
    Window,
    Activatable
}

export enum MapObjectSpawnMode {
    Grass,
    /**
     * Grass, beach and river banks.
     */
    GrassAndSand,
    RiverBank,
    River,
    Beach
}

export const LootRadius: Record<ItemType, number> = {
    [ItemType.Gun]: 3.4,
    [ItemType.Ammo]: 2,
    [ItemType.Melee]: 3,
    [ItemType.Throwable]: 3,
    [ItemType.Healing]: 2.5,
    [ItemType.Armor]: 3,
    [ItemType.Backpack]: 3,
    [ItemType.Scope]: 3,
    [ItemType.Skin]: 3
};

export interface BaseBulletDefinition {
    readonly damage: number
    readonly obstacleMultiplier: number
    readonly speed: number
    readonly range: number
    readonly penetration?: {
        readonly players?: boolean
        readonly obstacles?: boolean
    }

    readonly tracer?: {
        readonly opacity?: number
        readonly width?: number
        readonly length?: number
        readonly color?: number
        readonly image?: string
        // used by the radio bullet
        // this will make it scale and fade in and out
        readonly particle?: boolean
        readonly zIndex?: number
    }

    readonly rangeVariance?: number
    readonly shrapnel?: boolean
    readonly onHitExplosion?: ReferenceTo<ExplosionDefinition>
    readonly allowRangeOverride?: boolean
    readonly lastShotFX?: boolean
    readonly noCollision?: boolean
}

export interface WearerAttributes {
    /**
     * A number by which the player's maximum health will be multiplied
     */
    readonly maxHealth?: number
    /**
     * A number by which the player's maximum adrenaline will be multiplied
     */
    readonly maxAdrenaline?: number
    /**
     * A number that will be added to the player's minimum adrenaline. As the name implies,
     * this dictates the point at which adrenaline will stop decaying
     */
    readonly minAdrenaline?: number
    /**
     * A number by which the player's base speed will be multiplied
     */
    readonly speedBoost?: number
}

export interface ExtendedWearerAttributes extends WearerAttributes {
    /**
     *The upper limit after which this effect is no longer reapplied
     */
    readonly limit?: number
    /**
     * A fixed amount of HP restored
     */
    readonly healthRestored?: number
    /**
     * A fixed amount of adrenaline restored
     */
    readonly adrenalineRestored?: number
}

export interface ItemDefinition extends ObjectDefinition {
    readonly itemType: ItemType
    readonly noDrop?: boolean
}

export interface InventoryItemDefinition extends ItemDefinition {
    readonly fists?: {
        readonly left: Vector
        readonly right: Vector
    }
    readonly killstreak?: boolean
    readonly speedMultiplier: number
    /**
     * A set of attributes to modify the player this item belongs to
     * All attributes stack, and all of them are removed as soon as
     * the item is dropped
     */
    readonly wearerAttributes?: {
        /**
         * These attributes are applied when the item is in the player's
         * inventory
         */
        readonly passive?: WearerAttributes
        /**
         * These attributes are applied when the item is the active item, and
         * stack on top of the passive ones
         */
        readonly active?: WearerAttributes
        /**
         * These attributes are applied or removed when certain events occur
         */
        readonly on?: {
            /**
             * These attributes are applied whenever the player gets a kill
             */
            readonly kill?: Array<{
                /**
                 * The upper limit after which this effect is no longer reapplied
                 */
                readonly limit?: number
                /**
                 * A fixed amount of HP restored
                 */
                readonly healthRestored?: number
                /**
                 * A fixed amount of adrenaline restored
                 */
                readonly adrenalineRestored?: number
            } & WearerAttributes>
            /**
             * These attributs are applied whenever the player deals damage
             */
            readonly damageDealt?: Array<{
                /**
                 * The upper limit after which this effect is no longer reapplied
                 */
                readonly limit?: number
                /**
                 * A fixed amount of HP restored
                 */
                readonly healthRestored?: number
                /**
                 * A fixed amount of adrenaline restored
                 */
                readonly adrenalineRestored?: number
            } & WearerAttributes>
        }
    }
}
