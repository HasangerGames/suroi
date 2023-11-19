import { type GameConsole, type GameSettings, type PossibleError, type Stringable } from "./gameConsole";
import { defaultClientCVars, type JSONCVar } from "./defaultClientCVars";

export interface CVarFlags {
    readonly archive: boolean
    readonly readonly: boolean
    readonly cheat: boolean
    readonly replicated: boolean
}

export type ExtractConVarValue<CVar extends ConVar<Stringable>> = CVar extends ConVar<infer V> ? V : never;
export class ConVar<Value = string> {
    readonly name: string;
    readonly flags: CVarFlags;
    private _value: Value;
    readonly console: GameConsole;
    get value(): Value { return this._value; }

    static from<Value extends Stringable>(json: JSONCVar<Value>, console: GameConsole): ConVar<Value> {
        return new ConVar<Value>(json.name, json.value, console, json.flags);
    }

    constructor(name: string, value: Value, console: GameConsole, flags?: Partial<CVarFlags>) {
        this.name = name;
        this._value = value;
        this.console = console;
        this.flags = {
            archive: flags?.archive ?? false,
            readonly: flags?.readonly ?? true,
            cheat: flags?.cheat ?? true,
            replicated: flags?.replicated ?? false
        };
    }

    setValue(value: Value, writeToLS = true): PossibleError<string> {
        switch (true) {
            case this.flags.readonly: {
                return { err: `Cannot set value of readonly CVar '${this.name}'` };
            }
            case this.flags.replicated: {
                //todo allow server operators to modify replicated cvars
                return { err: `Value of replicated CVar '${this.name}' can only be modified by server operators.` };
            }
            case this.flags.cheat: {
                //todo allow modification of value when cheats are enabled
                return { err: `Cannot set value of cheat CVar '${this.name}' because cheats are disabled.` };
            }
        }

        if (this.value === value) return;
        this._value = value;
        // to not write built in cvars again when they are being loaded
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
        for (const [name, value] of Object.entries(defaultClientCVars)) {
            if (varExists(name)) continue;

            //@ts-expect-error This is init code, so shove it
            this._builtInCVars[name as keyof CVarTypeMapping] = ConVar.from<Stringable>(value, console);
        }
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
        type Setter = (<K extends string>(key: K, value: GoofyParameterType<K>) => void) & {
            builtIn: <K extends keyof CVarTypeMapping>(key: K, value: CVarTypeMapping[K]["value"], writeToLS?: boolean) => void
            custom: (key: string, value: Stringable) => PossibleError<string>
        };

        const setBuiltIn = <K extends keyof CVarTypeMapping>(key: K, value: CVarTypeMapping[K]["value"], writeToLS = true): void => {
            (this._builtInCVars[key] as ConVar<CVarTypeMapping[K]["value"]>).setValue(value, writeToLS);
        };
        const setCustom = (key: string, value: Stringable): PossibleError<string> => {
            const cvar = this._userCVars.get(key);

            if (cvar === undefined) {
                return { err: `Could not find console variable '${key}'` };
            }

            cvar.setValue(value);
        };
        const fn: Setter = <K extends string>(key: K, value: GoofyParameterType<K>, writeToLs = false): void => {
            if (key in this._builtInCVars) {
                setBuiltIn(key as keyof CVarTypeMapping, value as ExtractConVarValue<CVarTypeMapping[keyof CVarTypeMapping]>, writeToLs);
                return;
            }

            setCustom(key, value);
        };

        fn.builtIn = setBuiltIn;
        fn.custom = setCustom;

        return fn;
    })();

    readonly has = (() => {
        type HasChecker = (<K extends string>(key: K) => boolean) & {
            builtIn: (key: keyof CVarTypeMapping) => boolean
            custom: (key: string) => boolean
        };

        const hasBuiltIn = (key: keyof CVarTypeMapping): boolean => key in this._builtInCVars;
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
            return { err: `CVar ${cvar.name} has already been declared.` };
        }

        this._userCVars.set(cvar.name, cvar);
    }

    getAll(): GameSettings["variables"] {
        const variables: GameSettings["variables"] = {};

        for (const varName in this._userCVars.entries()) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const cvar = this._userCVars.get(varName)!;
            variables[varName] = { value: cvar.value, flags: cvar.flags };
        }
        for (const varName in this._builtInCVars) {
            const cvarName = varName as keyof CVarTypeMapping;
            const cvar = this._builtInCVars[cvarName];

            if (cvar.value !== defaultClientCVars[cvarName].value) {
                variables[varName] = { value: cvar.value };
            }
        }

        return variables;
    }

    dump(): string {
        return [...Object.entries(this._builtInCVars), ...this._userCVars.entries()]
            .map(([key, cvar]) =>
                `<li>'${key}' ${[
                    `${cvar.flags.archive ? "<span class=\"cvar-detail-archived\">A</span>" : ""}`,
                    `${cvar.flags.cheat ? "<span class=\"cvar-detail-cheat\">C</span>" : ""}`,
                    `${cvar.flags.readonly ? "<span class=\"cvar-detail-readonly\">R</span>" : ""}`,
                    `${cvar.flags.replicated ? "<span class=\"cvar-detail-replicated\">S</span>" : ""}`
                ].join(" ")} => ${cvar.value}</li>`
            ).join("");
    }
}

export interface CVarTypeMapping {
    readonly cv_player_name: ConVar<string>
    readonly cv_loadout_skin: ConVar<string>
    readonly cv_loadout_crosshair: ConVar<number>
    readonly cv_loadout_top_emote: ConVar<string>
    readonly cv_loadout_right_emote: ConVar<string>
    readonly cv_loadout_bottom_emote: ConVar<string>
    readonly cv_loadout_left_emote: ConVar<string>
    readonly cv_loop_scope_selection: ConVar<boolean>
    readonly cv_anonymize_player_names: ConVar<boolean>
    readonly cv_master_volume: ConVar<number>
    readonly cv_music_volume: ConVar<number>
    readonly cv_sfx_volume: ConVar<number>
    readonly cv_mute_audio: ConVar<boolean>
    readonly cv_use_old_menu_music: ConVar<boolean>
    readonly cv_language: ConVar<string>
    readonly cv_region: ConVar<string | undefined>
    readonly cv_camera_shake_fx: ConVar<boolean>
    readonly cv_killfeed_style: ConVar<"text" | "icon">
    readonly cv_movement_smoothing: ConVar<boolean>
    readonly cv_responsive_rotation: ConVar<boolean>
    readonly cv_antialias: ConVar<boolean>
    readonly cv_minimap_minimized: ConVar<boolean>
    readonly cv_leave_warning: ConVar<boolean>
    readonly cv_minimap_transparency: ConVar<number>
    readonly cv_map_transparency: ConVar<number>
    readonly cv_draw_hud: ConVar<boolean>
    readonly cv_rules_acknowledged: ConVar<boolean>
    readonly cv_hide_rules_button: ConVar<boolean>
    readonly cv_console_width: ConVar<number>
    readonly cv_console_height: ConVar<number>
    readonly cv_console_left: ConVar<number>
    readonly cv_console_top: ConVar<number>
    readonly cv_crosshair_color: ConVar<string>
    readonly cv_crosshair_size: ConVar<number>
    readonly cv_crosshair_stroke_color: ConVar<string>
    readonly cv_crosshair_stroke_size: ConVar<number>

    readonly pf_show_fps: ConVar<boolean>
    readonly pf_show_ping: ConVar<boolean>
    readonly pf_show_pos: ConVar<boolean>

    readonly mb_controls_enabled: ConVar<boolean>
    readonly mb_joystick_size: ConVar<number>
    readonly mb_joystick_transparency: ConVar<number>

    readonly dv_password: ConVar<string>
    readonly dv_role: ConVar<string>
    readonly dv_name_color: ConVar<string>
    readonly dv_lobby_clearing: ConVar<boolean>
}
