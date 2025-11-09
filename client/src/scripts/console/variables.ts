import { ExtendedMap, type Result, type ResultRes } from "@common/utils/misc";
import { stringify } from "../utils/misc";
import { GameConsole, type GameSettings, type PossibleError, type Stringable } from "./gameConsole";
import { GameConstants } from "@common/constants";
import { isMobile } from "pixi.js";

// TODO figure out what flags we're gonna actually use and how we're gonna use them kekw
//       expect breaking changes to this api (again)
// Basically, use a bitfield when all flags are known,
// and use the `Partial`-ized interface when "unset" is a possibility

export const enum CVarFlagsEnum {
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
    return (+flags.archive & CVarFlagsEnum.archive)
        | (+flags.readonly & CVarFlagsEnum.readonly)
        | (+flags.cheat & CVarFlagsEnum.cheat)
        | (+flags.replicated & CVarFlagsEnum.replicated);
}

export function flagBitfieldToInterface(flags: number): CVarFlags {
    return {
        archive: !!(flags & CVarFlagsEnum.archive),
        readonly: !!(flags & CVarFlagsEnum.readonly),
        cheat: !!(flags & CVarFlagsEnum.cheat),
        replicated: !!(flags & CVarFlagsEnum.replicated)
    };
}

export type ExtractConVarValue<CVar extends ConVar<Stringable>> = CVar extends ConVar<infer V> ? V : never;

export type CVarChangeListener<Value> = (
    newValue: Value,
    oldValue: Value,
    cvar: ConVar<Value>
) => void;

export interface JSONCVar<Value extends Stringable> {
    readonly value: Value
    readonly flags: Partial<CVarFlags>
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
    generateUnionCaster: (<const T extends string | number>(options: readonly T[]) => {
        const errorStr = options.map((v, i, a) => `${i === a.length - 1 ? "or " : ""}'${v}'`).join(", ");
        const isNumeric = typeof options[0] === "number";

        return (val: string): Result<T, string> => {
            const v = (isNumeric ? +val : val) as T;
            if (options.includes(v)) return { res: v };

            return {
                err: `Value must be either ${errorStr}; received ${val}`
            };
        };
    }) as {
        // silly workaround to have overloaded object literal methods
        <const T extends number>(options: readonly T[]): (val: string) => Result<T, string>
        <const T extends string>(options: readonly T[]): (val: string) => Result<T, string>
    }
});

// ! don't use "uv_" as a prefix, cause that's reserved for custom cvars

export const CVarCasters = Object.freeze({
    cv_player_name: Casters.toString,

    cv_loadout_skin: Casters.toString,
    cv_loadout_badge: Casters.toString,
    cv_loadout_crosshair: Casters.toInt,
    cv_loadout_top_emote: Casters.toString,
    cv_loadout_right_emote: Casters.toString,
    cv_loadout_bottom_emote: Casters.toString,
    cv_loadout_left_emote: Casters.toString,
    cv_loadout_extra1_emote: Casters.toString,
    cv_loadout_extra2_emote: Casters.toString,
    cv_loadout_death_emote: Casters.toString,
    cv_loadout_win_emote: Casters.toString,
    cv_master_volume: Casters.toNumber,
    cv_sfx_volume: Casters.toNumber,
    cv_ambience_volume: Casters.toNumber,
    cv_music_volume: Casters.toNumber,

    cv_loop_scope_selection: Casters.toBoolean,
    cv_anonymize_player_names: Casters.toBoolean,
    cv_hide_emotes: Casters.toBoolean,
    cv_use_old_menu_music: Casters.toBoolean,
    cv_region: Casters.toString,
    cv_camera_shake_fx: Casters.toBoolean,
    cv_killfeed_style: Casters.generateUnionCaster(["icon", "text"]),
    cv_weapon_slot_style: Casters.generateUnionCaster(["simple", "colored"]),
    cv_movement_smoothing: Casters.toBoolean,
    cv_responsive_rotation: Casters.toBoolean,

    cv_antialias: Casters.toBoolean,
    cv_renderer: Casters.generateUnionCaster(["webgl1", "webgl2", "webgpu"]),
    cv_renderer_res: Casters.generateUnionCaster(["auto", "0.5", "1", "2", "3"]),
    cv_high_res_textures: Casters.toBoolean,
    cv_alt_texture_loading: Casters.toBoolean,
    cv_cooler_graphics: Casters.toBoolean,
    cv_ambient_particles: Casters.toBoolean,
    cv_blur_splash: Casters.toBoolean,
    cv_record_res: Casters.generateUnionCaster(["480p", "720p", "1080p", "maximum"]),

    cv_rules_acknowledged: Casters.toBoolean,
    cv_hide_rules_button: Casters.toBoolean,
    cv_leave_warning: Casters.toBoolean,
    cv_ui_scale: Casters.toNumber,
    cv_draw_hud: Casters.toBoolean,

    cv_map_expanded: Casters.toBoolean,
    cv_minimap_minimized: Casters.toBoolean,
    cv_minimap_transparency: Casters.toNumber,
    cv_map_transparency: Casters.toNumber,

    cv_console_width: Casters.toNumber,
    cv_console_height: Casters.toNumber,
    cv_console_left: Casters.toNumber,
    cv_console_top: Casters.toNumber,
    cv_console_open: Casters.toBoolean,

    cv_crosshair_color: Casters.toString,
    cv_crosshair_size: Casters.toNumber,
    cv_crosshair_stroke_color: Casters.toString,
    cv_crosshair_stroke_size: Casters.toNumber,

    cv_autopickup: Casters.toBoolean,
    cv_autopickup_dual_guns: Casters.toBoolean,
    cv_language: Casters.toString,

    cv_mute_audio: Casters.toBoolean,

    pf_show_fps: Casters.toBoolean,
    pf_show_ping: Casters.toBoolean,
    pf_show_pos: Casters.toBoolean,
    pf_show_inout: Casters.toBoolean,
    pf_net_graph: Casters.generateUnionCaster([0, 1, 2]),
    // 0: off
    // 1: label only
    // 2: graph & label
    db_show_hitboxes: Casters.toBoolean,

    mb_controls_enabled: Casters.toBoolean,
    mb_joystick_size: Casters.toNumber,
    mb_joystick_transparency: Casters.toNumber,
    mb_switch_joysticks: Casters.toBoolean,
    mb_left_joystick_color: Casters.toString,
    mb_right_joystick_color: Casters.toString,
    mb_joystick_lock: Casters.toBoolean,
    mb_gyro_angle: Casters.toNumber,
    mb_haptics: Casters.toBoolean,
    mb_shake_to_reload: Casters.toBoolean,
    mb_shake_count: Casters.toNumber,
    mb_shake_force: Casters.toNumber,
    mb_shake_delay: Casters.toNumber,
    mb_high_res_textures: Casters.toBoolean,
    mb_antialias: Casters.toBoolean,

    dv_password: Casters.toString,
    dv_role: Casters.toString,
    dv_name_color: Casters.toString,
    dv_lobby_clearing: Casters.toBoolean,
    dv_weapon_preset: Casters.toString
} satisfies Record<string, (val: string) => Result<unknown, string>>);

type GetRes<R extends Result<unknown, unknown>> = R extends ResultRes<infer Res> ? Res : never;

export type CVarTypeMapping = {
    [K in keyof typeof CVarCasters]: ConVar<GetRes<ReturnType<(typeof CVarCasters)[K]>>>
};

type SimpleCVarMapping = {
    [K in keyof typeof CVarCasters]: ExtractConVarValue<CVarTypeMapping[K]> extends infer Val
        ? Val | (
            {
                readonly value: Val
            } & (
                {
                    readonly changeListeners: CVarChangeListener<Val> | CVarChangeListener<Val>[]
                } |
                {
                    readonly changeListeners?: never
                }
            ) & (
                {
                    readonly flags: Partial<CVarFlags>
                } |
                {
                    readonly flags?: never
                }
            )
        )
        : never
};

export const defaultClientCVars: SimpleCVarMapping = Object.freeze({
    cv_player_name: "",

    cv_loadout_skin: GameConstants.player.defaultSkin,
    cv_loadout_badge: "",
    cv_loadout_crosshair: 0,
    cv_loadout_top_emote: "happy_face",
    cv_loadout_right_emote: "thumbs_up",
    cv_loadout_bottom_emote: "suroi_logo",
    cv_loadout_left_emote: "sad_face",
    cv_loadout_extra1_emote: "",
    cv_loadout_extra2_emote: "",
    cv_loadout_death_emote: "",
    cv_loadout_win_emote: "",
    cv_master_volume: 1,
    cv_sfx_volume: 1,
    cv_ambience_volume: 1,
    cv_music_volume: 1,

    cv_loop_scope_selection: false,
    cv_anonymize_player_names: false,
    cv_hide_emotes: false,
    cv_use_old_menu_music: false,
    cv_region: "",
    cv_camera_shake_fx: true,
    cv_killfeed_style: "text",
    cv_weapon_slot_style: "colored",
    cv_movement_smoothing: true,
    cv_responsive_rotation: true,

    cv_antialias: true,
    cv_renderer: "webgl2",
    cv_renderer_res: "auto",
    cv_high_res_textures: true,
    cv_alt_texture_loading: false,
    cv_cooler_graphics: false,
    cv_ambient_particles: true,
    cv_record_res: "720p",
    cv_blur_splash: !isMobile.any, // blur kills splash screen performance on phones from my testing

    cv_rules_acknowledged: false,
    cv_hide_rules_button: false,
    cv_leave_warning: true,
    cv_ui_scale: 1,
    cv_draw_hud: true,

    cv_map_expanded: {
        value: false,
        flags: {
            archive: false
        }
    },
    cv_minimap_minimized: {
        value: false,
        flags: {
            archive: false
        }
    },
    cv_minimap_transparency: 0.8,
    cv_map_transparency: 0.9,

    cv_console_width: window.innerWidth / 2,
    cv_console_height: window.innerWidth / 2,
    cv_console_left: window.innerWidth / 4,
    cv_console_top: window.innerWidth / 4,
    cv_console_open: {
        value: false,
        flags: {
            archive: false
        }
    },

    cv_crosshair_color: "#000000",
    cv_crosshair_size: 1.5,
    cv_crosshair_stroke_color: "#000000",
    cv_crosshair_stroke_size: 0,

    cv_autopickup: true,
    cv_autopickup_dual_guns: true,
    cv_language: "en",

    // unused for now
    cv_mute_audio: false,
    //

    pf_show_fps: false,
    pf_show_ping: false,
    pf_show_pos: false,
    pf_show_inout: false,
    pf_net_graph: 1,

    db_show_hitboxes: false,

    mb_switch_joysticks: false,
    mb_controls_enabled: true,
    mb_joystick_size: 150,
    mb_joystick_transparency: 0.8,
    mb_left_joystick_color: "#FFFFFF",
    mb_right_joystick_color: "#FFFFFF",
    mb_joystick_lock: false,
    mb_gyro_angle: 0,
    mb_haptics: true,
    mb_shake_to_reload: true,
    mb_shake_count: 3,
    mb_shake_force: 10,
    mb_shake_delay: 100,
    mb_high_res_textures: false,
    mb_antialias: false,

    dv_password: "",
    dv_role: "",
    dv_name_color: "",
    dv_lobby_clearing: false,
    dv_weapon_preset: ""
} satisfies SimpleCVarMapping);

export const defaultBinds = Object.freeze({
    "+up": ["W", "ArrowUp"],
    "+down": ["S", "ArrowDown"],
    "+left": ["A", "ArrowLeft"],
    "+right": ["D", "ArrowRight"],
    "interact": ["F"],
    "loot": [],
    "slot 0": ["1"],
    "slot 1": ["2"],
    "slot 2": ["3", "E"],
    "equip_or_cycle_throwables 1": ["4"],
    "last_item": ["Q"],
    "other_weapon": ["Space"],
    "swap_gun_slots": ["T"],
    "cycle_items -1": ["MWheelUp"],
    "cycle_items 1": ["MWheelDown"],
    "+attack": ["Mouse0"],
    "drop": [],
    "reload": ["R"],
    "explode_c4": ["Z"],
    "cycle_scopes -1": [],
    "cycle_scopes 1": [],
    "use_consumable gauze": ["7"],
    "use_consumable medikit": ["8"],
    "use_consumable cola": ["9"],
    "use_consumable tablets": ["0"],
    "use_consumable vaccine_syringe": ["6"],
    "cancel_action": ["X"],
    "+view_map": [],
    "toggle_map": ["G", "M"],
    "toggle_minimap": ["N"],
    "toggle_hud": [],
    "+emote_wheel": ["Mouse2"],
    "+map_ping_wheel": ["C"],
    "fullscreen": [],
    "toggle_console": [],
    "+map_ping": [],
    "toggle_slot_lock": ["L"],
    "screen_record": [],
    "toggle pf_net_graph 0 1 2": []
} as Record<string, string[]>);

export class ConVar<Value = string> {
    readonly name: string;
    readonly flags: CVarFlags;
    private readonly _typeCaster: (value: string) => Result<Value, string>;

    private _value: Value;
    get value(): Value { return this._value; }

    constructor(
        name: string,
        value: Value,
        typeCaster: (value: string) => Result<Value, string>,
        flags?: Partial<CVarFlags>
    ) {
        this.name = name;
        this._value = value;

        this.flags = {
            archive: flags?.archive ?? false,
            readonly: flags?.readonly ?? false,
            cheat: flags?.cheat ?? false,
            replicated: flags?.replicated ?? false
        };

        this._typeCaster = typeCaster;
    }

    /**
     * **Warning**: Does not call any change listeners; for that to happen, call {@linkcode ConsoleVariables.set}
     */
    setValue(value: Stringable, writeToLS = true): PossibleError<string> {
        switch (true) {
            case this.flags.readonly: {
                return { err: `Cannot set value of readonly CVar '${this.name}'` };
            }
            case this.flags.replicated: {
                // TODO allow server operators to modify replicated cvars
                return { err: `Value of replicated CVar '${this.name}' can only be modified by server operators` };
            }
            case this.flags.cheat: {
                // TODO allow modification of value when cheats are enabled
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
            GameConsole.writeToLocalStorage();
        }
    }
}

export class ConsoleVariables {
    private readonly _userCVars = new Map<string, ConVar<Stringable>>();
    private readonly _builtInCVars: CVarTypeMapping = {} as unknown as CVarTypeMapping;

    private static _instantiated = false;
    constructor() {
        if (ConsoleVariables._instantiated) {
            throw new Error("Class 'ConsoleVariables' has already been instantiated");
        }
        ConsoleVariables._instantiated = true;

        const varExists = this.has.bind(this);

        const vars: Record<string, ConVar<Stringable>> = {};

        for (const v in defaultClientCVars) {
            const variable = v as keyof CVarTypeMapping;

            if (varExists(variable)) continue;

            const name = v as keyof CVarTypeMapping;

            const defaultVar = defaultClientCVars[name];
            const defaultValue = typeof defaultVar === "object" ? defaultVar.value : defaultVar;
            const changeListeners = typeof defaultVar === "object" && defaultVar.changeListeners
                ? [defaultVar.changeListeners].flat() as unknown as CVarChangeListener<Stringable>[]
                : [];
            const flags = typeof defaultVar === "object" && defaultVar.flags
                ? defaultVar.flags
                : {};

            vars[name] = new ConVar(
                name,
                defaultValue,
                CVarCasters[variable],
                {
                    archive: true,
                    readonly: false,
                    cheat: false,
                    ...flags
                }
            );

            this._changeListeners.set(name, changeListeners);
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
        type Setter = (<K extends string>(key: K, value: GoofyParameterType<K>, writeToLS?: boolean) => PossibleError<string>) & {
            builtIn: <K extends keyof CVarTypeMapping>(key: K, value: CVarTypeMapping[K]["value"], writeToLS?: boolean) => void
            custom: (key: string, value: Stringable, writeToLS?: boolean) => PossibleError<string>
        };

        const setBuiltIn = <K extends keyof CVarTypeMapping>(key: K, value: CVarTypeMapping[K]["value"], writeToLS = true): PossibleError<string> => {
            const cvar = this._builtInCVars[key] as ConVar<CVarTypeMapping[K]["value"]>;
            const oldValue = cvar.value;
            const res = cvar.setValue(value, writeToLS);
            const newValue = cvar.value;

            if (res === undefined && oldValue !== newValue) {
                for (const listener of this._changeListeners.get(key) ?? []) {
                    listener(newValue, oldValue, cvar);
                }
            }

            return res;
        };

        const setCustom = (key: string, value: Stringable, writeToLS = true): PossibleError<string> => {
            const cvar = this._userCVars.get(key);

            if (cvar === undefined) {
                return { err: `Could not find console variable '${key}'` };
            }

            return cvar.setValue(value, writeToLS);
        };
        const fn: Setter = <K extends string>(key: K, value: GoofyParameterType<K>, writeToLS = false): PossibleError<string> => {
            if (key in this._builtInCVars) {
                return setBuiltIn(key as keyof CVarTypeMapping, value as ExtractConVarValue<CVarTypeMapping[keyof CVarTypeMapping]>, writeToLS);
            }

            return setCustom(key, value, writeToLS);
        };

        fn.builtIn = setBuiltIn;
        fn.custom = setCustom;

        return fn;
    })();

    readonly has = (() => {
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

    private readonly _changeListeners = new ExtendedMap<
        keyof CVarTypeMapping,
        CVarChangeListener<Stringable>[]
    >();

    addChangeListener<K extends keyof CVarTypeMapping>(
        cvar: K,
        callback: CVarChangeListener<ExtractConVarValue<CVarTypeMapping[K]>>
    ): void {
        this._changeListeners
            .getAndSetIfAbsent(cvar, [])
            .push(callback as unknown as CVarChangeListener<Stringable>);
        //                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        //                 this cast is technically unsafe and unsound,
        //                 but we have total control over insertion, deletion,
        //                 and access of these listeners, so it's fine
    }

    removeChangeListener<K extends keyof CVarTypeMapping>(
        cvar: K,
        callback: CVarChangeListener<Stringable>
    ): void {
        const listeners = this._changeListeners.get(cvar);

        if (!listeners) return;

        this._changeListeners.set(cvar, listeners.filter(l => l !== callback));
    }

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

    getAll(
        {
            defaults = false,
            noArchive = false
        }: {
            readonly defaults?: boolean
            readonly noArchive?: boolean
        } = {}
    ): GameSettings["variables"] {
        const variables: GameSettings["variables"] = {};

        for (const [varName, cvar] of this._userCVars.entries()) {
            if (cvar.flags.archive || !noArchive) {
                variables[varName] = { value: cvar.value, flags: flagInterfaceToBitfield(cvar.flags) };
            }
        }

        for (const varName in this._builtInCVars) {
            const cvarName = varName as keyof CVarTypeMapping;
            const cvar = this._builtInCVars[cvarName];

            let defaultVar: (typeof defaultClientCVars)[keyof CVarTypeMapping];

            if (
                (
                    !defaults
                    || cvar.value !== (typeof (defaultVar = defaultClientCVars[cvarName]) === "object" ? defaultVar.value : defaultVar)
                ) && (
                    cvar.flags.archive || !noArchive
                )
            ) {
                variables[varName] = cvar.value;
            }
        }

        return variables;
    }

    dump(): string {
        return [...Object.entries(this._builtInCVars), ...this._userCVars.entries()]
            .map(([key, { flags, value }]) =>
                `<tr>
                ${[
                    [
                        `<span class="cvar-detail-archived${flags.archive ? "" : " cvar-inactive-flag"}" title="Archived CVar">A</span>`,
                        `<span class="cvar-detail-cheat${flags.cheat ? "" : " cvar-inactive-flag"}" title="Cheat CVar">C</span>`,
                        `<span class="cvar-detail-readonly${flags.readonly ? "" : " cvar-inactive-flag"}" title="Readonly CVar">R</span>`,
                        `<span class="cvar-detail-replicated${flags.replicated ? "" : " cvar-inactive-flag"}" title="Replicated CVar">S</span>`
                    ].join(""),
                    `<code>${key}</code>`,
                    `<code class="cvar-value-${value === null ? "null" : typeof value}">${stringify(value)}</code>`
                ].map((v, i) => `<td${i === 0 ? " style=\"text-align: center\"" : ""}>${v}</td>`).join("")}
                </tr>`
            ).join("");
    }
}
