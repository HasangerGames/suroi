import { GameConstants } from "@common/constants";
import { type Result, type ResultRes } from "@common/utils/misc";
import { isMobile } from "pixi.js";
import { type Stringable } from "./gameConsole";
import { Casters, type CVarChangeListener, type CVarFlags, type ConVar, type ExtractConVarValue } from "./variables";

/*
    eslint-disable
    @stylistic/indent-binary-ops
*/

/*
    `@stylistic/indent-binary-ops`: ESLint sucks at indenting types correctly
*/
export interface JSONCVar<Value extends Stringable> {
    readonly value: Value
    readonly flags: Partial<CVarFlags>
}

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
    cv_cooler_graphics: Casters.toBoolean,
    cv_ambient_particles: Casters.toBoolean,
    cv_blur_splash: Casters.toBoolean,

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

    mb_controls_enabled: Casters.toBoolean,
    mb_joystick_size: Casters.toNumber,
    mb_joystick_transparency: Casters.toNumber,
    mb_high_res_textures: Casters.toBoolean,

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
                    readonly changeListeners: CVarChangeListener<Val> | Array<CVarChangeListener<Val>>
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
    cv_cooler_graphics: false,
    cv_ambient_particles: true,
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

    mb_controls_enabled: true,
    mb_joystick_size: 150,
    mb_joystick_transparency: 0.8,
    mb_high_res_textures: false,

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
    "cancel_action": ["X"],
    "+view_map": [],
    "toggle_map": ["G", "M"],
    "toggle_minimap": ["N"],
    "toggle_hud": [],
    "+emote_wheel": ["Mouse2"],
    "+map_ping_wheel": ["C"],
    "toggle_console": [],
    "+map_ping": [],
    "toggle_slot_lock": []
} as Record<string, string[]>);
