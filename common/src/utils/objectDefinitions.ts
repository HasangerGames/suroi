import { type ZIndexes } from "../constants";
import { type ExplosionDefinition } from "../definitions/explosions";
import { type ByteStream } from "./byteStream";
import { GlobalRegistrar } from "./definitionRegistry";
import { mergeDeep, type DeepPartial } from "./misc";
import { type Vector } from "./vector";

/*
    eslint-disable

    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-unsafe-argument,
    @stylistic/indent,
    @stylistic/indent-binary-ops
*/

/*
    `@typescript-eslint/no-explicit-any`: Used with array types in function types to avoid issues relating to variance
    `@typescript-eslint/no-unsafe-argument`: I dunno why eslint is getting s many false-positives for this rule
    `@stylistic/indent`: ESLint sucks at doing this correctly for ts types -> get disabled
    `@stylistic/indent-binary-ops`: ESLint sucks at doing this correctly for ts types -> get disabled
*/

/**
 * A reference to the `symbol` used for inheritance.
 *
 * ### Usage:
 * ```ts
 * const parent = {
 *     idString: "foo",
 *     bar: "baz",
 *     qux: "fop"
 * };
 *
 * const child = {
 *     [inheritFrom]: "foo",
 *     bar: "abc"
 * }
 * ```
 */
export const inheritFrom: unique symbol = Symbol("inherit from");

/**
 * Represents either a fully-fledged definition, or a definition
 * configured to inherit from another
 * @template Def The definition
 */
export type RawDefinition<Def extends object> = Def | (
    DeepPartial<Def> & {
        readonly idString: string
        readonly [inheritFrom]?: string | readonly string[]
    }
);

/**
 * A template which takes arguments. This is referred to as a "function template",
 * as opposed to an "object template", which is simply a partial object
 * @template Def The definition this template is for
 * @template Args This template's parameters
 */
type FunctionTemplate<
    Def extends object,
    Args extends any[] = any[]
> = (...args: Args) => DeepPartial<Def>;

/**
 * Given a definition, and a template, this type returns the missing members. In other
 * words, for some type `D` and base type `B` such that `B`'s members are a subset of
 * `D`'s members, `GetMissing<D, B>` returns a type assignable to `D - B`
 * (it includes `B`'s members as optionals)
 * @template Def The overarching definition at play
 * @template Base The partial version being used as a template
 */
export type GetMissing<
    Def extends object,
    Base extends DeepPartial<Def> | FunctionTemplate<Def>
> = Base extends (...args: any[]) => (infer Ret extends DeepPartial<Def>)
    ? GetMissing<Def, Ret>
    : [keyof Base] extends [never]
        ? Def
        : DeepPartial<{
            readonly [K in keyof Base & keyof Def]?: Def[K]
        }> & PreservingOmit<Def, keyof Base>;

type PreservingOmit<T extends object, RejectKeys extends keyof any> = Exclude<keyof T, RejectKeys> extends infer KeyDiff extends keyof T
    ? {
        readonly [
            K in ({
                readonly [K in KeyDiff]: undefined extends T[K] ? K : never
            })[KeyDiff]
        ]?: T[K]
    } & {
        readonly [
            K in ({
                readonly [K in KeyDiff]: undefined extends T[K] ? never : K
            })[KeyDiff]
        ]: T[K]
    }
    : never;

/**
 * Represents the function used to create an object from a template, whether it be
 * an object template or a functional
 * @template Def The type of definition produced by this template
 * @template Base The partial version being used as a template
 */
type TemplateApplier<
    Def extends object,
    Base extends DeepPartial<Def> | FunctionTemplate<Def>
> = <
    Override extends GetMissing<Def, Base>
>(...args: DetermineApplierArgs<Def, Base, Override>) => Def;

/**
 * Helper type used to determine the parameter types for a given template applier
 *
 * If used on a functional template, the parameter list will contain the function's
 * parameters as a tuple in its first argument (ex: `[[key: string, value: number], <…>]`)
 *
 * Overrides always appear last in the argument list. If the override corresponds to
 * an empty object, then it is optional
 *
 * @template Def The definition created by the template this type is being used for
 * @template Base The partial template used by the template
 * @template Override The missing members, as if by `GetMissing<Def, Base>`
 */
type DetermineApplierArgs<
    Def extends object,
    Base extends DeepPartial<Def> | FunctionTemplate<Def>,
    Override extends GetMissing<Def, Base>
> = Base extends (...args: infer Args) => unknown
    ? object extends Override
        ? [args: Args, overrides?: Override]
        : [args: Args, overrides: Override]
    : object extends Override
        ? [overrides?: Override]
        : [overrides: Override];

/**
 * A helper type used to extract the partial type from a template applier
 * @template Applier The template applier
 */
// respect the _ convention you stupid twat
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type GetTemplateBase<Applier extends TemplateApplier<any, object>> = Applier extends TemplateApplier<infer _Def, infer Base> ? Base : never;

/**
 * Creates a template which can be reused to more easily create types of objects while reducing repetition. Templates
 * come in two flavors: "object" templates and "function" templates. Object templates are the simplest, and simply
 * consist of a partially-constructed object of the target type, which is then supplemented by users of the template
 * (analogous to an abstract class). A function template takes arguments order to create its partial object, and can
 * take any number of any type.
 *
 * ## Example:
 * ```ts
 * // Let's make a definition list of colors
 * type Color = { // different color modes
 *     readonly type: "rgb",
 *     readonly r: number,
 *     readonly g: number,
 *     readonly b: number
 * } | {
 *     readonly type: "hsl",
 *     readonly h: number,
 *     readonly s: number,
 *     readonly l: number
 * } | {
 *     readonly type: "hex",
 *     readonly code: number
 * };
 *
 * // Object template for an RGB color
 * // This simply merges { type: "rgb" } with whatever else you give it
 * const rgb = createTemplate<Color>()({ type: "rgb" });
 * const red = rgb({ r: 255, g: 0, b: 0 });
 *
 * // You could also define it using a function template
 * const hsl = createTemplate<Color>()(
 *     (h: number, s: number, l: number) => ({
 *         type: "hsl",
 *         h, s, l
 *     })
 * );
 * const green = hsl(
 *    [120, 100, 50]
 * );
 *
 * // That one just passed the arguments one-to-one; here's a more useful template
 * const makeGray = createTemplate<Color>()((lightness: number) => ({
 *    type: "hsl",
 *    h: 0,
 *    s: 100,
 *    l: lightness
 * }));
 *
 * // inheritance
 * const hexToRgb = createTemplate<Color>()(rgb, (hex: number) => {
 *     const [r, g, b] = convertHexToRGB(hex);
 *     return { r, g, b };
 * });
 *
 * const blue = hexToRgb([0x0000FF]);
 * ```
 * @template Def The definitions created by this template
 * @returns A function that will accept the actual partial object and inheritance parent (if any)
 */
export const createTemplate = <
    Def extends object
>() => <
    Base extends DeepPartial<Def> | FunctionTemplate<Def>,
    Parent extends TemplateApplier<Def, object> | undefined = undefined,

    // don't overwrite the types below, they're here to avoid repetition/convenience/clarity
    ParentBaseType = Parent extends undefined ? unknown : GetTemplateBase<NonNullable<Parent>>,

    ArgsRet extends [any[], unknown] = Base extends (...args: infer Args) => infer Ret ? [Args, Ret] : never,
    PArgsRet extends [any[], unknown] = Parent extends (...args: infer PArgs) => infer PRet ? [PArgs, PRet] : never,

    BaseArgs extends any[] = ArgsRet[0],
    BaseRet = ArgsRet[1],
    ParentArgs extends any[] = PArgsRet[0],
    ParentRet = PArgsRet[1],

    FnFromFn extends FunctionTemplate<Def, [BaseArgs, ParentArgs]> = (...args: [BaseArgs, ParentArgs[0]]) => BaseRet & ParentRet,
    FnFromNorm extends FunctionTemplate<Def, BaseArgs> = (...args: BaseArgs) => BaseRet & ParentBaseType,
    NormFromFn extends FunctionTemplate<Def, ParentArgs> = (...args: ParentArgs) => Base & ParentRet,
    NormFromNorm = Base & ParentBaseType,

    Aggregate = (
        // using FnFromFn, FnFromNorm, NormFromFn, or NormFromNorm breaks
        // stuff and causes assignability errors for some reason
        Base extends (...args: infer BArgs) => infer BRet
            ? ParentBaseType extends (...args: infer PArgs) => infer PRet
                ? (...args: [BArgs, PArgs]) => BRet & PRet
                : (...args: BArgs) => BRet & ParentBaseType
            : ParentBaseType extends (...args: infer PArgs) => infer PRet
                ? (...args: PArgs) => Base & PRet
                : Base & ParentBaseType
    )
>(
    ...[arg0, arg1]: Parent extends undefined ? [Base] : [Parent, Base]
): TemplateApplier<Def, Aggregate> => {
    const [base, parent] = arg1 === undefined ? [arg0 as Base, undefined] : [arg1, arg0 as Parent];

    // attach a hidden tag to function templates
    type Tagged = typeof fn & { __functionTemplate__: boolean };

    const baseIsFunc = typeof base === "function";
    const parentIsFunc = (parent as Tagged | undefined)?.__functionTemplate__;
    const noParent = parent === undefined;

    // @ts-expect-error since the function we're returning will probably be called
    // often, we take the time to optimize it based on the three booleans above
    const fn: TemplateApplier<Def, Aggregate> = baseIsFunc
        ? parentIsFunc
            ? <
                Override extends GetMissing<Def, FnFromFn>
            >(
                // function template inheriting from other function template
                ...[[cArgs, pArgs], overrides]: DetermineApplierArgs<Def, FnFromFn, Override>
            ): Def => mergeDeep(
                {} as Def,
                (
                    parent as TemplateApplier<Def, FunctionTemplate<Def, ParentArgs>>
                )(pArgs, {} as GetMissing<Def, DeepPartial<Def>>) ?? {},
                base(...cArgs),
                overrides ?? {}
            )
            : noParent
                ? <
                    Override extends GetMissing<Def, FnFromNorm>
                >(
                    // function template with no parent
                    ...[args, overrides]: DetermineApplierArgs<Def, FnFromNorm, Override>
                ): Def => mergeDeep(
                    {} as Def,
                    base(...args),
                    overrides ?? {}
                )
                : <
                    Override extends GetMissing<Def, FnFromNorm>
                >(
                    // function template inheriting from object parent
                    ...[args, overrides]: DetermineApplierArgs<Def, FnFromNorm, Override>
                ): Def => mergeDeep(
                    {} as Def,
                    parent({} as Def) ?? {},
                    base(...args),
                    overrides ?? {}
                )
        : parentIsFunc
            ? <
                Override extends GetMissing<Def, NormFromFn>
            >(
                // object template inheriting from function template
                ...[args, overrides]: DetermineApplierArgs<Def, NormFromFn, Override>
            ): Def => mergeDeep(
                {} as Def,
                (
                    parent as TemplateApplier<Def, FunctionTemplate<Def, ParentArgs>>
                )(args, {} as GetMissing<Def, DeepPartial<Def>>) ?? {},
                base,
                overrides as Override ?? {}
            )
            : noParent
                ? <
                    Override extends GetMissing<Def, NormFromNorm>
                >(
                    // object template with no inheritance
                    ...[overrides/* , non_applicable */]: DetermineApplierArgs<Def, NormFromNorm, Override>
                ): Def => mergeDeep(
                    {} as Def,
                    base,
                    overrides as Override ?? {}
                )
                : <
                    Override extends GetMissing<Def, NormFromNorm>
                >(
                    // object template inheriting from object template
                    ...[overrides/* , non_applicable */]: DetermineApplierArgs<Def, NormFromNorm, Override>
                ): Def => mergeDeep(
                    {} as Def,
                    (parent({} as Def) ?? {}),
                    base,
                    overrides as Override ?? {}
                );

    (fn as Tagged).__functionTemplate__ = baseIsFunc;

    return fn;
};

/**
 * Error type indicating that something went wrong while resolving the inherited
 * fields of a definition used in an {@linkcode ObjectDefinitions} instance
 */
export class DefinitionInheritanceInitError extends Error {}

/**
 * A class representing a list of definitions
 * @template Def The specific type of `ObjectDefinition` this class holds
 */
export class ObjectDefinitions<Def extends ObjectDefinition = ObjectDefinition> {
    static withDefault<
        Def extends ObjectDefinition
    >() {
        return <
            const Default extends DeepPartial<Def>,

            // helper type, don't overwrite
            Missing extends DeepPartial<Def> = GetMissing<Def, Default>
        >(
            name: string,
            defaultValue: Default,
            creationCallback: (
                [
                    derive,
                    inherit,
                    createTemplateForMissing,
                    __helper_variable_to_get_Missing_type_dont_use_as_value_or_you_will_be_fired__
                ]: [
                    <
                        Base extends DeepPartial<Missing> | FunctionTemplate<Missing>
                    >(base: Base) => TemplateApplier<
                        Missing,
                        Base extends (...args: infer Args) => infer Ret
                            ? (...args: Args) => Ret & Default
                            : Base & Default
                    >,
                    typeof inheritFrom,
                    ReturnType<typeof createTemplate<Missing>>,
                    Missing
                ]
            ) => ReadonlyArray<RawDefinition<Missing>>
        ) => {
            const defaultTemplate = createTemplate<RawDefinition<Missing>>()(
                defaultValue
            ) as unknown as (...args: [RawDefinition<Missing>]) => RawDefinition<Def>;
            // SAFETY: defaultValue is not a function, thus the signature of the applier is (override: GetMissing<…>) => …

            const derive: <
                Base extends DeepPartial<Missing> | FunctionTemplate<Missing>
            >(base: Base) => TemplateApplier<
                Missing,
                Base extends (...args: infer Args) => infer Ret
                    ? (...args: Args) => Ret & Default
                    : Base & Default
                // ts is inconsistent about when it wants to accept/reject this
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore lol, is this the new ts2589
            > = createTemplate<Missing>().bind(null, defaultTemplate);

            return new ObjectDefinitions<Def>(
                name,
                creationCallback([derive, inheritFrom, createTemplate<Missing>(), undefined as any]) as ReadonlyArray<RawDefinition<Def>>,
                defaultValue
            );
        };
    }

    static create<Def extends ObjectDefinition>(
        name: string,
        defs: ReadonlyArray<RawDefinition<Def>>
    ): ObjectDefinitions<Def> {
        return new ObjectDefinitions(name, defs);
    }

    /**
     * Internal collection storing the definitions
     */
    readonly definitions: readonly Def[];

    /**
     * A private mapping between identification strings and the index in the definition array
     */
    protected readonly idStringToDef: Readonly<Record<string, Def>> = Object.create(null) as Record<string, Def>;
    // yes this is intentional, because we use 'in' somewhere else—don't want things like __proto__ creating false results

    /**
     * @param defs An array of definitions
     * @param defaultTemplate The default template to apply to all of them
     */
    protected constructor(
        readonly name: string,
        defs: ReadonlyArray<RawDefinition<Def>>,
        defaultTemplate?: DeepPartial<Def>,
        noRegister = false
    ) {
        function withTrace(
            def: RawDefinition<DeepPartial<Def>>,
            ...trace: readonly string[]
        ): Def {
            if (!(inheritFrom in def)) {
                return defaultTemplate === undefined
                    ? def as Def
                    : mergeDeep<Def>(
                        {} as Def,
                        defaultTemplate,
                        def
                    );
            }

            return mergeDeep<Def>(
                {} as Def,
                defaultTemplate ?? {},
                ...([def[inheritFrom]].flat() as ReadonlyArray<ReferenceTo<Def>>)
                    .map(targetName => {
                        const target = defs.find(def => def.idString === targetName);
                        if (!target) {
                            throw new DefinitionInheritanceInitError(
                                `Definition '${def.idString}' was configured to inherit from inexistent definition '${targetName}'`
                            );
                        }

                        if (trace.includes(targetName)) {
                            throw new DefinitionInheritanceInitError(
                                `Circular dependency found: ${[...trace, targetName].join(" -> ")}`
                            );
                        }

                        return withTrace(target, ...trace, target.idString);
                    }),
                def
            );
        }

        this.definitions = defs.map(def => {
            const obj = withTrace(def, def.idString);
            // @ts-expect-error init code
            this.idStringToDef[def.idString] = obj;
            return obj;
        });

        if (!noRegister) {
            GlobalRegistrar.register(this);
        }
    }

    reify<U extends Def = Def>(type: ReifiableDef<Def>): U {
        return typeof type === "string"
            ? this.fromString<U>(type)
            : type as U;
    }

    fromString<Spec extends Def = Def>(idString: ReferenceTo<Spec>): Spec {
        const def = this.idStringToDef[idString] as Spec | undefined;
        if (def === undefined) {
            throw new ReferenceError(`Unknown idString '${idString}' for this schema`);
        }

        return def;
    }

    fromStringSafe<Spec extends Def = Def>(idString: ReferenceTo<Spec>): Spec | undefined {
        return this.idStringToDef[idString] as Spec | undefined;
    }

    hasString(idString: string): boolean {
        return idString in this.idStringToDef;
    }

    /**
     * Convenience method for clarity purposes—proxy for {@link GlobalRegistrar.writeToStream}
     */
    writeToStream<S extends ByteStream>(stream: S, def: ReifiableDef<Def>): S {
        return GlobalRegistrar.writeToStream(stream, def);
    }

    /**
     * Convenience method for clarity purposes—proxy for {@link GlobalRegistrar.readFromStream}
     */
    readFromStream<Specific extends Def = Def>(stream: ByteStream): Specific {
        // safety: uncomment for debugging
        const obj = GlobalRegistrar.readFromStream<Specific>(stream);
        if (!(obj?.idString in this.idStringToDef)) {
            console.error(`Definition with idString '${obj?.idString}' does not belong to this schema ('${this.name}')`);
        }
        return obj;
        return GlobalRegistrar.readFromStream(stream);
    }

    [Symbol.iterator](): Iterator<Def> {
        return this.definitions[Symbol.iterator]();
    }
}

/**
 * Used to communicate that no idString matches or is applicable, can be used as a key and value
 */
export const NullString = Symbol("null idString");

export interface ObjectDefinition {
    readonly idString: string
    readonly name: string
}

/**
 * Semantically equivalent to `string`, this type is more to convey an intent
 */
export type ReferenceTo<T extends ObjectDefinition> = T["idString"];

/**
 * Either a normal reference or an object whose keys are random options and whose values are corresponding weights
 */
export type ReferenceOrRandom<T extends ObjectDefinition> = Record<ReferenceTo<T> | typeof NullString, number> | ReferenceTo<T>;

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
    Skin,
    Perk
}

export enum ObstacleSpecialRoles {
    Door,
    Wall,
    Window,
    Stair,
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
    Beach,
    Trail
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
    [ItemType.Skin]: 3,
    [ItemType.Perk]: 3
};

export type BaseBulletDefinition = {
    readonly damage: number
    readonly obstacleMultiplier: number
    readonly speed: number
    readonly range: number

    readonly tracer: {
        readonly opacity: number
        readonly width: number
        readonly length: number
        readonly image: string
        // used by the radio bullet
        // this will make it scale and fade in and out
        readonly particle: boolean
        readonly zIndex: ZIndexes
    } & ({
        readonly color?: undefined
        readonly saturatedColor?: never
    } | {
        /**
         * A value of `-1` causes a random color to be chosen
         */
        readonly color: number
        readonly saturatedColor: number
    })

    readonly trail?: {
        readonly interval: number
        readonly amount?: number
        readonly frame: string
        readonly scale: {
            readonly min: number
            readonly max: number
        }
        readonly alpha: {
            readonly min: number
            readonly max: number
        }
        readonly spreadSpeed: {
            readonly min: number
            readonly max: number
        }
        readonly lifetime: {
            readonly min: number
            readonly max: number
        }
        readonly tint: number
    }

    readonly rangeVariance?: number
    readonly shrapnel: boolean
    readonly allowRangeOverride: boolean
    readonly lastShotFX: boolean
    readonly noCollision: boolean
} & ({
    readonly onHitExplosion?: never
} | {
    readonly onHitExplosion: ReferenceTo<ExplosionDefinition>
    /**
     * When hitting a reflective surface:
     * - `true` causes the explosion to be spawned
     * - `false` causes the projectile to be reflected (default)
     */
    readonly explodeOnImpact?: boolean
});

export interface PlayerModifiers {
    // Multiplicative
    maxHealth: number
    maxAdrenaline: number
    baseSpeed: number
    size: number
    adrenDrain: number

    // Additive
    minAdrenaline: number
    hpRegen: number
}

export const defaultModifiers = (): PlayerModifiers => ({
    maxHealth: 1,
    maxAdrenaline: 1,
    baseSpeed: 1,
    size: 1,
    adrenDrain: 1,

    minAdrenaline: 0,
    hpRegen: 0
});

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
    /**
     * A number by which the player's size will be multiplied
     */
    readonly sizeMod?: number
    /**
     * A number by which the default adrenaline drain will be multiplied
     */
    readonly adrenDrain?: number
    /**
     * A number that will be added to the player's default health regen
     */
    readonly hpRegen?: number
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

export interface EventModifiers {
    /**
     * A set of attributes to applied whenever the player gets a kill
     */
    readonly kill: readonly ExtendedWearerAttributes[]
    /**
     * A set of attributes to applied whenever the player deals damage
     */
    readonly damageDealt: readonly ExtendedWearerAttributes[]
}

export interface ItemDefinition extends ObjectDefinition {
    readonly itemType: ItemType
    readonly noDrop: boolean
    readonly devItem?: boolean
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
        readonly on?: Partial<EventModifiers>
    }
}
