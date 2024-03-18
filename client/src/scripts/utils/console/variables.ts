import { type Result, type ResultRes } from "../../../../../common/src/utils/misc";
import { CVarCasters, defaultClientCVars, type CVarTypeMapping } from "./defaultClientCVars";
import { type GameConsole, type GameSettings, type PossibleError, type Stringable } from "./gameConsole";

// todo figure out what flags we're gonna actually use and how we're gonna use them kekw
// todo expect breaking changes to this api (again)
// Basically, use a bitfield when all flags are known,
// and use the `Partial`-ized interface when "unset" is a possibility

export enum CVarFlagsEnum {
    archive = 1 >> 0,
    readonly = 1 >> 1,
    cheat = 1 >> 2,
    replicated = 1 >> 3
}

export interface CVarFlags {
    readonly archive: boolean
    readonly readonly: boolean
    readonly cheat: boolean
    readonly replicated: boolean
}

export function flagInterfaceToBitfield(flags: CVarFlags): number {
    return (+flags.archive & CVarFlagsEnum.archive) |
        (+flags.readonly & CVarFlagsEnum.readonly) |
        (+flags.cheat & CVarFlagsEnum.cheat) |
        (+flags.replicated & CVarFlagsEnum.replicated);
}

export function flagBitfieldToInterface(flags: number): CVarFlags {
    return {
        archive: !!(flags & CVarFlagsEnum.archive),
        readonly: !!(flags & CVarFlagsEnum.readonly),
        cheat: !!(flags & CVarFlagsEnum.cheat),
        replicated: !!(flags & CVarFlagsEnum.replicated)
    };
}

export const Casters = Object.freeze({
    toString<T extends string>(val: T): ResultRes<T> {
        return { res: val };
    },
    toNumber(val: string): Result<number, string> {
        const num = +val;

        if (Number.isNaN(num)) {
            return { err: `'${val}' is not a valid numeric value` };
        }

        return { res: num };
    },
    toInt(val: string): Result<number, string> {
        const num = Casters.toNumber(val);

        if ("err" in num) return num;

        if (num.res % 1) {
            return { err: `'${val}' is not an integer value` };
        }

        return num;
    },
    toBoolean(val: string): Result<boolean, string> {
        val = val.toLowerCase();

        switch (true) {
            case ["1", "t", "true", "y", "yes"].includes(val): return { res: true };
            case ["0", "f", "false", "n", "no"].includes(val): return { res: false };
            default: {
                return { err: `'${val}' is not a valid boolean value` };
            }
        }
    },
    generateUnionCaster<const T extends string>(options: readonly T[]) {
        return (val: string): Result<T, string> => {
            if (options.includes(val as T)) return { res: val as T };

            return {
                err: `Value must be either ${
                    options.map((v, i, a) => `${i === a.length - 1 ? "or " : ""}'${v}'`).join(", ")
                }; received ${val}`
            };
        };
    }
});

export type ExtractConVarValue<CVar extends ConVar<Stringable>> = CVar extends ConVar<infer V> ? V : never;
export class ConVar<Value = string> {
    readonly name: string;
    readonly flags: CVarFlags;
    private readonly _typeCaster: (value: string) => Result<Value, string>;

    private _value: Value;
    get value(): Value { return this._value; }

    readonly console: GameConsole;

    constructor(
        name: string,
        value: Value,
        console: GameConsole,
        typeCaster: (value: string) => Result<Value, string>,
        flags?: Partial<CVarFlags>
    ) {
        this.name = name;
        this._value = value;
        this.console = console;

        this.flags = {
            archive: flags?.archive ?? false,
            readonly: flags?.readonly ?? false,
            cheat: flags?.cheat ?? false,
            replicated: flags?.replicated ?? false
        };

        this._typeCaster = typeCaster;
    }

    setValue(value: Stringable, writeToLS = true): PossibleError<string> {
        switch (true) {
            case this.flags.readonly: {
                return { err: `Cannot set value of readonly CVar '${this.name}'` };
            }
            case this.flags.replicated: {
                // todo allow server operators to modify replicated cvars
                return { err: `Value of replicated CVar '${this.name}' can only be modified by server operators` };
            }
            case this.flags.cheat: {
                // todo allow modification of value when cheats are enabled
                return { err: `Cannot set value of cheat CVar '${this.name}' because cheats are disabled` };
            }
        }

        const cast = this._typeCaster(String(value));
        if ("err" in cast) {
            return cast;
        }

        const casted = cast.res;
        if (this._value === casted) return;

        this._value = casted;

        // To not write built-in cvars again when they are being loaded
        if (this.flags.archive && writeToLS) {
            this.console.writeToLocalStorage();
        }
    }
}

export class ConsoleVariables {
    private readonly _userCVars = new Map<string, ConVar<Stringable>>();
    private readonly _builtInCVars: CVarTypeMapping = {} as unknown as CVarTypeMapping;

    readonly console: GameConsole;

    constructor(console: GameConsole) {
        const varExists = this.has.bind(this);
        this.console = console;

        const vars: Record<string, ConVar<Stringable>> = {};

        for (const v in defaultClientCVars) {
            const variable = v as keyof CVarTypeMapping;

            if (varExists(variable)) continue;

            const name = v as keyof CVarTypeMapping;

            const defaultVar = defaultClientCVars[name];
            const defaultValue = typeof defaultVar === "object" ? defaultVar.value : defaultVar;
            const flags = typeof defaultVar === "object" ? defaultVar.flags : {};

            vars[name] = new ConVar(
                name,
                defaultValue,
                console,
                CVarCasters[variable],
                {
                    archive: true,
                    readonly: false,
                    cheat: false,
                    ...flags
                }
            );
        }

        this._builtInCVars = vars as unknown as CVarTypeMapping;
    }

    readonly get = (() => {
        type GoofyReturnType<K extends string> = K extends keyof CVarTypeMapping ? CVarTypeMapping[K] : ConVar<Stringable> | undefined;
        type Getter = (<K extends string>(key: K) => GoofyReturnType<K>) & {
            builtIn: <K extends keyof CVarTypeMapping>(key: K) => CVarTypeMapping[K]
            custom: (key: string) => ConVar<Stringable> | undefined
        };

        const getBuiltIn = <K extends keyof CVarTypeMapping>(key: K): CVarTypeMapping[K] => this._builtInCVars[key];
        const getCustom = (key: string): ConVar<Stringable> | undefined => this._userCVars.get(key);
        const fn: Getter = <K extends string>(key: K): GoofyReturnType<K> => {
            if (key in this._builtInCVars) {
                return getBuiltIn(key as keyof CVarTypeMapping) as unknown as GoofyReturnType<K>;
            }

            return getCustom(key) as GoofyReturnType<K>;
        };

        fn.builtIn = getBuiltIn;
        fn.custom = getCustom;

        return fn;
    })();

    readonly set = (() => {
        type GoofyParameterType<K extends string> = K extends keyof CVarTypeMapping ? ExtractConVarValue<CVarTypeMapping[K]> : Stringable;
        type Setter = (<K extends string>(key: K, value: GoofyParameterType<K>) => PossibleError<string>) & {
            builtIn: <K extends keyof CVarTypeMapping>(key: K, value: CVarTypeMapping[K]["value"], writeToLS?: boolean) => void
            custom: (key: string, value: Stringable) => PossibleError<string>
        };

        const setBuiltIn = <K extends keyof CVarTypeMapping>(key: K, value: CVarTypeMapping[K]["value"], writeToLS = true): PossibleError<string> => {
            return (this._builtInCVars[key] as ConVar<CVarTypeMapping[K]["value"]>).setValue(value, writeToLS);
        };
        const setCustom = (key: string, value: Stringable): PossibleError<string> => {
            const cvar = this._userCVars.get(key);

            if (cvar === undefined) {
                return { err: `Could not find console variable '${key}'` };
            }

            return cvar.setValue(value);
        };
        const fn: Setter = <K extends string>(key: K, value: GoofyParameterType<K>, writeToLs = false): PossibleError<string> => {
            if (key in this._builtInCVars) {
                setBuiltIn(key as keyof CVarTypeMapping, value as ExtractConVarValue<CVarTypeMapping[keyof CVarTypeMapping]>, writeToLs);
                return;
            }

            return setCustom(key, value);
        };

        fn.builtIn = setBuiltIn;
        fn.custom = setCustom;

        return fn;
    })();

    readonly has = (() => {
        // There's a way to do overloading while using function properties, but it's fugly
        /* eslint-disable @typescript-eslint/method-signature-style */
        type HasChecker = (<K extends string>(key: K) => boolean) & {
            builtIn(key: keyof CVarTypeMapping): true
            builtIn(key: string): boolean

            custom: (key: string) => boolean
        };

        const hasBuiltIn = ((key: string): boolean => key in this._builtInCVars) as HasChecker["builtIn"];
        const hasCustom = (key: string): boolean => this._userCVars.has(key);
        const fn: HasChecker = <K extends string>(key: K): boolean => {
            if (key in this._builtInCVars) {
                return hasBuiltIn(key as keyof CVarTypeMapping);
            }

            return hasCustom(key);
        };

        fn.builtIn = hasBuiltIn;
        fn.custom = hasCustom;

        return fn;
    })();

    /**
     * Do **not** call this yourself! This is an internal method,
     * but it can't be marked private cuz a console command accesses
     * it.
     */
    declareCVar(cvar: ConVar<Stringable>): PossibleError<string> {
        if (this._userCVars.has(cvar.name)) {
            return { err: `CVar ${cvar.name} has already been declared` };
        }

        this._userCVars.set(cvar.name, cvar);
    }

    removeCVar(name: string): PossibleError<string> {
        if (!this._userCVars.delete(name)) {
            return { err: `CVar ${name} doesn't exist` };
        }
    }

    getAll(omitDefaults = false): GameSettings["variables"] {
        const variables: GameSettings["variables"] = {};

        for (const [varName, cvar] of this._userCVars.entries()) {
            variables[varName] = { value: cvar.value, flags: flagInterfaceToBitfield(cvar.flags) };
        }

        for (const varName in this._builtInCVars) {
            const cvarName = varName as keyof CVarTypeMapping;
            const cvar = this._builtInCVars[cvarName];

            const defaultVar = defaultClientCVars[cvarName];
            const defaultValue = typeof defaultVar === "object" ? defaultVar.value : defaultVar;

            if (!omitDefaults || cvar.value !== defaultValue) {
                variables[varName] = cvar.value;
            }
        }

        return variables;
    }

    dump(): string {
        return [...Object.entries(this._builtInCVars), ...this._userCVars.entries()]
            .map(([key, cvar]) =>
                `<li><code>${key}</code> ${[
                    `${cvar.flags.archive ? "<span class=\"cvar-detail-archived\" title=\"Archived CVar\">A</span>" : ""}`,
                    `${cvar.flags.cheat ? "<span class=\"cvar-detail-cheat\" title=\"Cheat CVar\">C</span>" : ""}`,
                    `${cvar.flags.readonly ? "<span class=\"cvar-detail-readonly\" title=\"Readonly CVar\">R</span>" : ""}`,
                    `${cvar.flags.replicated ? "<span class=\"cvar-detail-replicated\" title=\"Replicated CVar\">S</span>" : ""}`
                ].join(" ")} =>&nbsp;<code>${cvar.value}</code></li>`
            ).join("");
    }
}
