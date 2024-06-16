import { type ZIndexes } from "../constants";
import { type ExplosionDefinition } from "../definitions/explosions";
import { mergeDeep, type DeepPartial } from "./misc";
import { type SuroiBitStream } from "./suroiBitStream";
import { type Vector } from "./vector";

/**
 * A file-wide reference to the `symbol` used for inheritance.
 * Exported through {@linkcode ObjectDefinitions.inheritFromSymbol}
 */
const _inheritFromSymbol: unique symbol = Symbol("inherit from");

/**
 * A file-wide reference to the `symbol` used for defining a default template
 * from which definitions inherit by default, unless they specify `noDefaultInherit`.
 * Exported through {@linkcode ObjectDefinitions.defaultTemplateSymbol}
 */
const _defaultTemplateSymbol: unique symbol = Symbol("default template");

/**
 * A file-wide reference to the `symbol` used to declare that a definition
 * should not inherit from that definition type's default template.
 * Exported through {@linkcode ObjectDefinitions.noDefaultInherit}
 */
const _noDefaultInheritSymbol: unique symbol = Symbol("no default inherit");

/**
 * A function producing a partial version of a given object definition
 * @template Def The definition that will partially be constructed by this function
 */
// It's a function whose argument types are narrowed if needed, and `unknown` causes false errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TemplateFn<Def extends ObjectDefinition> = (...args: readonly any[]) => DeepPartial<Def>;

/**
 * Represents the types of keys allowed for a template declaration
 */
type AllowedTemplateKeys = string | typeof _defaultTemplateSymbol;

/**
 * A declaration of a template that extends another template
 * @template Keys The names of the other templates that can be extended
 * @template Def The definition that will be partially constructed by this template
 */
type TemplateExtension<Keys extends string, Def extends ObjectDefinition> = {
    /**
     * The name of the template that this template should extend
     */
    readonly extends: Keys
    /**
     * @see {@linkcode TemplateFn}
     */
    readonly applier: TemplateFn<Def>
};

/**
 * Either a {@linkcode TemplateFn} or a {@linkcode TemplateExtension}
 * @template Keys The names of the other templates in the collection this declaration belongs to
 * @template Def The definition that will be partially constructed
 */
type TemplateDecl<
    Keys extends AllowedTemplateKeys,
    Def extends ObjectDefinition
> = TemplateFn<Def> | TemplateExtension<Keys & string, Def>;

/**
 * A record of strings associated with templates. Each template can then be extended to form a complete definition
 * @template Keys The specific keys in this record. Stricter typings works best
 * @template Def The type of definition that the templates are templates of
 */
type Template<
    Keys extends AllowedTemplateKeys,
    Def extends ObjectDefinition
> = Readonly<
    Record<Keys & string, TemplateDecl<Keys, Def>> & (
        { [K in Keys & typeof _defaultTemplateSymbol]?: () => DeepPartial<Omit<Def, "idString">> }
    )
>;

/**
 * Gets the function type associated with a certain template. If `TemplatesDecl[Key]` is already a function, then it's
 * returned as-is; otherwise, it's inheriting from another template, and the appropriate typing for the overall function
 * is calculated
 *
 * **API note**: Function arguments for inherited templates are somewhat messily assembled; the first argument is
 * the arguments for the extension (aka the template doing the extending), and the second argument is the arguments
 * for the inherited template (aka the template being inherited from). *This schema applies recursively*, somewhat
 * unfortunately.
 *
 * For example, take the template A, whose function has parameters `[number, number]`; and the template B, whose
 * parameters are `[string, string]`. If B extends A, then the resulting function returned by this type will
 * have parameters of type `[[string, string], [number, number]]`
 *
 * If template C then extends B, with C having parameters `[boolean, boolean]`, then the function returned by
 * this type will have parameters of type `[[boolean, boolean], [[string, string], [number, number]]]`
 *
 * @template Def The type of definitions the templates construct
 * @template Keys The specific keys in the templates record. Stricter typings work best
 * @template TemplatesDecl The template record to search through when resolving inherited templates
 * @template Key The specific id of the template whose function type is desired
 */
type GetPartialDeclFn<
    Def extends ObjectDefinition,
    Keys extends AllowedTemplateKeys,
    TemplatesDecl extends Template<Keys, Def>,
    Key extends Keys
> = ((...args: readonly unknown[]) => unknown) & (
    TemplatesDecl[Key] extends TemplateExtension<Keys & string, Def>
        /**
         * @param extensionArgs The arguments to pass to the extended template's (aka the one doing the inheriting) function
         * @param inheritArgs The arguments to pass to the inherited template's (aka the one being inherited from) function.
         * See the API note for more information regarding the format these are passed in
         * @returns The result of combining the inherited definition with the extended definition. (_**WARNING**: This is currently
         * set to be `Def` because setting it to the more correct type leads to type instantiation considered "excessively deep". See
         * the comment accompanying this type's definition for more info_)
         */
        ? (
            extensionArgs: Parameters<TemplatesDecl[Key]["applier"]>,
            inheritArgs: Parameters<GetPartialDeclFn<Def, Keys, TemplatesDecl, TemplatesDecl[Key]["extends"]>>
        ) => /* ReturnType<ApplierFn> & ReturnType<PDeclFn> */ Def
        /*
            ! WARNING !
            This return type is INTENTIONALLY INCORRECT and was chosen to be too lenient instead of too restrictive.
            The correct return type has been left as a comment. Using it causes TS2589 ("Type instantiation is excessively deep"),
            and so for now, it has been simplified.

            This means that the API is technically unsound, however any abusive usage should result in a definition validation failure.
        */
        : TemplatesDecl[Key]
);

/**
 * Represents a definition even "raw-er" than {@linkcode RawDefinition}; more specifically, a definition that hasn't yet
 * had the default template applied. It differs from {@linkcode RawDefinition} in that the latter is the typing of a definition
 * which has had the default template applied but has not had any inheritance applied.
 *
 * @template Def The type of definition
 * @template TemplateDecl The template declaration from which to extract the default template
 */
export type StageZeroDefinition<
    Def extends ObjectDefinition,
    DefaultTemplate extends ((...args: readonly unknown[]) => unknown) | undefined
> = DefaultTemplate extends (...args: readonly unknown[]) => unknown
    // eslint-disable-next-line @stylistic/indent-binary-ops
    ? Omit<Def, keyof ReturnType<DefaultTemplate>> & {
        readonly idString: string
    } & {
        readonly [K in Extract<keyof Def, keyof ReturnType<DefaultTemplate>>]?: DeepPartial<Def[K]>
        //                                                                      ^^^^^^^^^^^^^^^^^^^
        // ! unsafe, but makes the api easier to use + the dv will catch any mistakes
    }
    : Def;

/**
 * Either a complete stand-alone definition or a definition configured to inherit
 * from another. Note that here, "inherit" refers not to the set of templates used by
 * {@linkcode Template} *et. al.*, but rather to another definition in the same list
 *
 * **Note**: Mixing this inheritance mechanism with the factory pattern is perfectly
 * fine and works as expected.
 * @template Def The type of definition
 */
export type RawDefinition<Def extends ObjectDefinition> = Def | (
    Partial<Def> & {
        /**
         * @see {@linkcode ObjectDefinition.idString}
         */
        readonly idString: string
        /**
         * A collection of `idString`s pointing to the definitions which should be
         * inherited from. If an array is provided, the definitions are applied from
         * first to last, with fields in later parents overriding those from earlier ones
         */
        readonly [_inheritFromSymbol]: ReferenceTo<Def> | Array<ReferenceTo<Def>>
    }
);

/**
 * Error type indicating that something went wrong while creating the templates
 * for an {@linkcode ObjectDefinitions} instance
 */
export class DefinitionFactoryInitError extends Error {}

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
    /**
     * A reference to the symbol used for inheritance
     *
     * Allows one to assemble a list of {@linkcode RawDefinition}s without having
     * to call {@linkcode ObjectDefinitions.create()}
     */
    static get inheritFromSymbol(): typeof _inheritFromSymbol { return _inheritFromSymbol; }

    /**
     * A reference to the symbol used for defining a default template
     * from which definitions inherit by default, unless they specify `noDefaultInherit`
     */
    static get defaultTemplateSymbol(): typeof _defaultTemplateSymbol { return _defaultTemplateSymbol; }

    /**
     * A reference to the symbol used to declare that a definition
     * should not inherit from that definition type's default template
     *
     * Allows one to assemble a list of {@linkcode RawDefinition}s without having
     * to call {@linkcode ObjectDefinitions.create()}
     */
    static get noDefaultInheritSymbol(): typeof _noDefaultInheritSymbol { return _noDefaultInheritSymbol; }

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
     * Sets up the creation of a new object definition list utilizing template definitions
     * @template Def The specific type of `ObjectDefinition` that this list will contain
     * @returns A function accepting a set of templates to be used in the definitions
     */
    static create<Def extends ObjectDefinition = ObjectDefinition>(): <
        const TemplateDecl extends Template<AllowedTemplateKeys, Def>
    >(
        templatesSupplier: (defaultTemplate: typeof _defaultTemplateSymbol) => TemplateDecl
    ) => (
        definitionsDecl: (
            /**
             * A function with two custom properties containing two functions for invoking a factory;
             * `apply` is the "normal" function and used to both invoke a factory and provide overrides.
             * If the factory is invoked and no overrides are needed, then the `simple` function can be used.
             * Note that the `apply` property is identical to the function it is defined on (that is,
             * `appliers === appliers.apply`)
             */
            appliers: {
                /**
                 * A function used to create a definition that inherits from a previously-declared template
                 * definition.
                 *
                 * @template Key The specific name of the template to inherit from
                 * @template Overrides The specific type of the provided overrides
                 * @param name The name of the template from which this definition should inherit
                 * @param overrides A set of overrides to apply to the contents of the template
                 * @param args A collection of arguments to pass to the inherited template's function.
                 * See {@linkcode GetInheritedDef} for more info
                 */
                <
                    Key extends keyof TemplateDecl & AllowedTemplateKeys,
                    Overrides extends DeepPartial<Def>
                >(
                    name: Key,
                    overrides: Overrides,
                    ...args: Parameters<GetPartialDeclFn<Def, keyof TemplateDecl & AllowedTemplateKeys, TemplateDecl, Key>>
                ): ReturnType<GetPartialDeclFn<Def, keyof TemplateDecl & AllowedTemplateKeys, TemplateDecl, Key>> & Overrides

                /**
                 * A function used to create a definition that inherits from a previously-declared template
                 * definition.
                 *
                 * @template Key The specific name of the template to inherit from
                 * @template Overrides The specific type of the provided overrides
                 * @param name The name of the template from which this definition should inherit
                 * @param overrides A set of overrides to apply to the contents of the template
                 * @param args A collection of arguments to pass to the inherited template's function.
                 * See {@linkcode GetPartialDeclFn} for more info
                 */
                readonly apply: <
                    Key extends keyof TemplateDecl & AllowedTemplateKeys,
                    Overrides extends DeepPartial<Def>
                >(
                    name: Key,
                    overrides: Overrides,
                    ...args: Parameters<GetPartialDeclFn<Def, keyof TemplateDecl & AllowedTemplateKeys, TemplateDecl, Key>>
                ) => ReturnType<GetPartialDeclFn<Def, keyof TemplateDecl & AllowedTemplateKeys, TemplateDecl, Key>> & Overrides

                /**
                 * A function used to create a definition that inherits from a previously-declared template
                 * definition.
                 *
                 * @template Key The specific name of the template to inherit from
                 * @param name The name of the template from which this definition should inherit
                 * @param args A collection of arguments to pass to the inherited template's function.
                 * See {@linkcode GetPartialDeclFn} for more info
                 */
                readonly simple: <
                    Key extends keyof TemplateDecl & AllowedTemplateKeys
                >(
                    name: Key,
                    ...args: Parameters<GetPartialDeclFn<Def, keyof TemplateDecl & AllowedTemplateKeys, TemplateDecl, Key>>
                ) => ReturnType<GetPartialDeclFn<Def, keyof TemplateDecl & AllowedTemplateKeys, TemplateDecl, Key>>
            },
            /**
             * An object used to provide convenient access to both {@linkcode _inheritFromSymbol}
             * and {@linkcode _noDefaultInheritSymbol}
             */
            symbols: {
                /**
                 * @see {@linkcode _inheritFromSymbol}
                 */
                readonly inheritFrom: typeof _inheritFromSymbol
                /**
                 * @see {@linkcode _noDefaultInheritSymbol}
                 */
                readonly noDefaultInherit: typeof _noDefaultInheritSymbol
            }
        ) => ReadonlyArray<StageZeroDefinition<Def, TemplateDecl[typeof _defaultTemplateSymbol]>>
    ) => ObjectDefinitions<Def>;

    /**
     * Creates a new instance of `ObjectDefinitions`. Can be used to bypass the factory system if such
     * functionalities aren't needed
     * @param definitions An array of definitions to store within this object
     */
    static create<Def extends ObjectDefinition = ObjectDefinition>(definitions: ReadonlyArray<RawDefinition<Def>>): ObjectDefinitions<Def>;

    // you're inane for making me write out the return type once, you're fucking delusional if you think i'm doing it twice
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    static create<Def extends ObjectDefinition = ObjectDefinition>(definitions?: ReadonlyArray<RawDefinition<Def>>) {
        if (Array.isArray(definitions)) {
            return new ObjectDefinitions(undefined, definitions);
        }

        /**
         * A function to declare the templates to be used in this definition set.
         *
         * @template TemplatesDecl The specific subtype of `Templates` used for `templatesDecl`.
         * @param templatesSupplier A function returning an object whose keys are identifiers for
         * template definitions and whose values are the templates in question. Receives
         * {@linkcode ObjectDefinitions.defaultTemplateSymbol} as argument for convenience
         * @returns Another function to declare the actual definitions used by this definition list. In this function,
         * the templates created here will be available for use.
         * @see {@linkcode Template}
         */
        return <const TemplateDecl extends Template<AllowedTemplateKeys, Def>>(
            templatesSupplier: (defaultTemplate: typeof _defaultTemplateSymbol) => TemplateDecl
        ) => {
            /**
             * Helper type, self-explanatory
             */
            type Keys = keyof TemplateDecl & AllowedTemplateKeys;

            type PartialDeclFn<
                Key extends keyof TemplateDecl & AllowedTemplateKeys
            > = GetPartialDeclFn<Def, keyof TemplateDecl & AllowedTemplateKeys, TemplateDecl, Key>;

            type ApplyFn = <
                Key extends keyof TemplateDecl & AllowedTemplateKeys,
                Overrides extends DeepPartial<Def>
            >(
                name: Key,
                overrides: Overrides,
                ...args: Parameters<PartialDeclFn<Key>>
            ) => ReturnType<PartialDeclFn<Key>> & Overrides;

            type SimpleApplyFn = <
                Key extends keyof TemplateDecl & AllowedTemplateKeys
            >(
                name: Key,
                ...args: Parameters<PartialDeclFn<Key>>
            ) => ReturnType<PartialDeclFn<Key>>;

            /**
             * A function used to declare the definitions to use inside this definition list.
             *
             * @param definitionsDecl A function responsible for providing the list of definitions to be used
             * inside this list. It receives another function, known as the applier, which is used to invoke
             * the inheritance mechanism by passing the name of the desired template, followed by any necessary
             * argument for that template's function.
             * @param inheritFrom A reference to and shorthand for the unique `symbol` used to indicate that a
             * definition should inherit from another.
             */
            return (
                definitionsDecl: (
                    appliers: ApplyFn & {
                        readonly apply: ApplyFn
                        readonly simple: SimpleApplyFn
                    },
                    symbols: {
                        readonly inheritFrom: typeof _inheritFromSymbol
                        readonly noDefaultInherit: typeof _noDefaultInheritSymbol
                    }
                ) => ReadonlyArray<StageZeroDefinition<Def, TemplateDecl[typeof _defaultTemplateSymbol]>>
            ) => {
                type ObjectEntries = <O extends object>(obj: O) => Array<readonly [keyof O & string, O[keyof O & string]]>;

                const templatesDecl = templatesSupplier(_defaultTemplateSymbol);

                function resolveTemplates<K extends Keys>(key: K, ...trace: readonly Keys[]): TemplateFn<Def> {
                    const value = templatesDecl[key];

                    const isDefaultTemplate = key === _defaultTemplateSymbol;

                    if (typeof value === "function") {
                        if (isDefaultTemplate && value.length !== 0) {
                            // FIXME change this?
                            // probably not…
                            throw new DefinitionFactoryInitError("Default template must be a no-parameter factory");
                        }

                        return value as TemplateFn<Def>;
                    }

                    if (value === undefined) {
                        console.warn("Did you really explicitly specify 'undefined' for the default template?");
                        return () => ({});
                    }

                    if (isDefaultTemplate) {
                        throw new DefinitionFactoryInitError("Default template must not inherit from another factory");
                    }

                    const inheritTargetName = value.extends;
                    // @ts-expect-error technically impossible, but i'm going to strong-arm this
                    // in case someone decides to be stupid and bypasses the type system
                    if (inheritTargetName === _defaultTemplateSymbol) {
                        throw new DefinitionFactoryInitError("Explicit extension of the default template is forbidden");
                    }

                    if (!(inheritTargetName in templatesDecl)) {
                        throw new DefinitionFactoryInitError(`Template '${String(key)}' tried to extend non-existent template '${inheritTargetName}'`);
                    }

                    if (trace.includes(inheritTargetName)) {
                        throw new DefinitionFactoryInitError(`Circular dependency found: ${[...trace, inheritTargetName].join(" -> ")}`);
                    }

                    const inheritTarget = resolveTemplates(inheritTargetName, ...trace, inheritTargetName);
                    // documentation comment below is p much copied from `GetPartialDeclFn`, with some modifications
                    /**
                     * @param extensionArgs The arguments to pass to the extended template's (aka the one doing the inheriting) function
                     * @param inheritArgs The arguments to pass to the inherited template's (aka the one being inherited from) function.
                     * See the API note on {@linkcode GetPartialDeclFn} for more information regarding the format these are passed in
                     * @returns The result of combining the inherited definition with the extended definition. (_**WARNING**: This is currently
                     * set to be `Def` because setting it to the more correct type leads to type instantiation considered "excessively deep". See
                     * the comment accompanying {@linkcode GetPartialDeclFn}'s definition for more info_)
                     */
                    return (
                        extensionArgs: Parameters<typeof value.applier>,
                        inheritArgs: Parameters<typeof inheritTarget>
                    ) => mergeDeep({} as Def, inheritTarget(...inheritArgs), value.applier(...extensionArgs));
                }

                const templates = (
                    <O extends object>(obj: O) => (
                        (Object.entries as ObjectEntries)(obj) as Array<readonly [string | symbol, O[keyof O]]>
                    ).concat(
                        Object.getOwnPropertySymbols(obj).map(
                            sym => [sym, (obj as Record<symbol, O[keyof O & symbol]>)[sym]] as const
                        )
                    ) as Array<readonly [keyof O, O[keyof O]]>
                )(templatesDecl)
                    .map(([key]) => [key, resolveTemplates(key as Keys, key as Keys)] as const)
                    .reduce(
                        (acc, [key, fn]) => {
                            acc[key as Keys] = fn;
                            return acc;
                        },
                        {} as Record<Keys, TemplateFn<Def>>
                    );

                const applier = ((name, overrides, ...args) => {
                    type GoofySillyHelper = ReturnType<GetPartialDeclFn<Def, Keys, TemplateDecl, typeof name>> & typeof overrides;

                    return mergeDeep<GoofySillyHelper>(
                        {} as GoofySillyHelper,
                        templates[name](...args) as DeepPartial<GoofySillyHelper>,
                        overrides as DeepPartial<GoofySillyHelper>
                    );
                }) as Parameters<typeof definitionsDecl>[0];

                // @ts-expect-error init code
                applier.apply = applier;

                // @ts-expect-error init code
                applier.simple = (name, ...args: unknown[]) => applier(name, {}, ...args);

                return new ObjectDefinitions<Def>(
                    templates[_defaultTemplateSymbol]?.() ?? {},
                    definitionsDecl(
                        applier,
                        {
                            inheritFrom: _inheritFromSymbol,
                            noDefaultInherit: _noDefaultInheritSymbol
                        }
                    )
                );
            };
        };
    }

    protected constructor(
        defaultTemplate: DeepPartial<Omit<Def, "idString">> | undefined,
        definitions: ReadonlyArray<StageZeroDefinition<Def, () => typeof defaultTemplate & object>>
    ) {
        this.bitCount = Math.ceil(Math.log2(definitions.length));

        this.definitions = definitions.map(
            def => (
                function withTrace(
                    def: StageZeroDefinition<Def, () => typeof defaultTemplate & object>,
                    ...trace: readonly string[]
                ): Def {
                    if (_noDefaultInheritSymbol in def) {
                        console.warn("noDefaultInherit does nothing right now, and will probably be removed eventually. so don't use it");
                    }

                    if (!(_inheritFromSymbol in def)) {
                        return defaultTemplate !== undefined
                            ? mergeDeep<Def>(
                                {} as Def,
                                defaultTemplate as DeepPartial<Def>,
                                def
                            )
                            : def as Def;
                    }

                    return mergeDeep<Def>(
                        {} as Def,
                        (defaultTemplate ?? {}) as DeepPartial<Def>,
                        ...([def[_inheritFromSymbol]].flat() as ReadonlyArray<ReferenceTo<Def>>)
                            .map(targetName => {
                                const target = definitions.find(def => def.idString === targetName);
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
            )(def, def.idString)
        );

        for (let i = 0, defLength = this.definitions.length; i < defLength; i++) {
            const idString = this.definitions[i].idString;

            if (idString in this.idStringToNumber) {
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
        return this.fromStringSafe(idString) ?? (() => {
            throw new ReferenceError(`Unknown idString '${idString}'`);
        })();
    }

    fromStringSafe<U extends Def = Def>(idString: ReferenceTo<U>): U | undefined {
        const id = this.idStringToNumber[idString];
        if (id === undefined) return undefined;

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

    writeOptional(stream: SuroiBitStream, type?: ReifiableDef<Def>): void {
        const isPresent = type !== undefined;

        stream.writeBoolean(isPresent);
        if (isPresent) this.writeToStream(stream, type);
    }

    readOptional<U extends Def = Def>(stream: SuroiBitStream): U | undefined {
        return stream.readBoolean()
            ? this.readFromStream<U>(stream)
            : undefined;
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

export type BaseBulletDefinition = {
    readonly damage: number
    readonly obstacleMultiplier: number
    readonly speed: number
    readonly range: number
    readonly penetration: {
        readonly players: boolean
        readonly obstacles: boolean
    }

    readonly tracer: {
        readonly opacity: number
        readonly width: number
        readonly length: number
        /**
         * A value of `-1` causes a random color to be chosen
         */
        readonly color?: number
        readonly image: string
        // used by the radio bullet
        // this will make it scale and fade in and out
        readonly particle: boolean
        readonly zIndex: ZIndexes
    }

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
     * - `false` causes the projectile to be reflected
     */
    readonly explodeOnImpact?: boolean
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
    readonly noDrop: boolean
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
            readonly kill?: readonly ExtendedWearerAttributes[]
            /**
             * These attributs are applied whenever the player deals damage
             */
            readonly damageDealt?: readonly ExtendedWearerAttributes[]
        }
    }
}

export const ContainerTints = {
    White: 0xc0c0c0,
    Red: 0xa32900,
    Green: 0x00a30e,
    Blue: 0x005fa3,
    Yellow: 0xcccc00
};
