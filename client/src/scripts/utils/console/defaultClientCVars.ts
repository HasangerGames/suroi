import { type Stringable } from "./gameConsole";
import { type CVarFlags, type CVarTypeMapping, type ExtractConVarValue } from "./variables";

export interface JSONCVar<Value extends Stringable> {
    readonly name: string
    readonly value: Value
    readonly flags: Partial<CVarFlags>
}

type SimpleCVarMapping = { [K in keyof CVarTypeMapping]: JSONCVar<ExtractConVarValue<CVarTypeMapping[K]>> };
export const defaultClientCVars: SimpleCVarMapping = Object.freeze({
    cv_player_name: {
        name: "cv_player_name",
        value: "",
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_loadout_skin: {
        name: "cv_loadout_skin",
        value: "hazel_jumpsuit",
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_loadout_crosshair: {
        name: "cv_loadout_crosshair",
        value: 0,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_loadout_top_emote: {
        name: "cv_loadout_top_emote",
        value: "happy_face",
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_loadout_right_emote: {
        name: "cv_loadout_right_emote",
        value: "thumbs_up",
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_loadout_bottom_emote: {
        name: "cv_loadout_bottom_emote",
        value: "suroi_logo",
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_loadout_left_emote: {
        name: "cv_loadout_left_emote",
        value: "sad_face",
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_loop_scope_selection: {
        name: "cv_loop_scope_selection",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_anonymize_player_names: {
        name: "cv_anonymize_player_names",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_master_volume: {
        name: "cv_master_volume",
        value: 1,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_music_volume: {
        name: "cv_music_volume",
        value: 1,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_sfx_volume: {
        name: "cv_sfx_volume",
        value: 1,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_mute_audio: {
        name: "cv_mute_audio",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_use_old_menu_music: {
        name: "cv_use_old_menu_music",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_language: {
        name: "cv_language",
        value: "en",
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_region: {
        name: "cv_region",
        value: undefined,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_camera_shake_fx: {
        name: "cv_camera_shake_fx",
        value: true,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_killfeed_style: {
        name: "cv_killfeed_style",
        value: "text",
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_movement_smoothing: {
        name: "cv_movement_smoothing",
        value: true,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_antialias: {
        name: "cv_antialias",
        value: true,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_minimap_minimized: {
        name: "cv_minimap_minimized",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_leave_warning: {
        name: "cv_leave_warning",
        value: true,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_minimap_transparency: {
        name: "cv_minimap_transparency",
        value: 0.8,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_map_transparency: {
        name: "cv_map_transparency",
        value: 0.9,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_draw_hud: {
        name: "cv_draw_hud",
        value: true,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_rules_acknowledged: {
        name: "cv_rules_acknowledged",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_hide_rules_button: {
        name: "cv_hide_rules_button",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_console_width: {
        name: "cv_console_width",
        value: window.innerWidth / 2,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_console_height: {
        name: "cv_console_height",
        value: window.innerWidth / 2,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_console_left: {
        name: "cv_console_left",
        value: window.innerWidth / 4,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_console_top: {
        name: "cv_console_top",
        value: window.innerWidth / 4,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_crosshair_color: {
        name: "cv_crosshair_color",
        value: "#000000",
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_crosshair_size: {
        name: "cv_crosshair_size",
        value: 30,
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_crosshair_stroke_color: {
        name: "cv_crosshair_stroke_color",
        value: "#000000",
        flags: { archive: true, readonly: false, cheat: false }
    },
    cv_crosshair_stroke_size: {
        name: "cv_crosshair_stroke_size",
        value: 0,
        flags: { archive: true, readonly: false, cheat: false }
    },

    pf_show_fps: {
        name: "pf_show_fps",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    },
    pf_show_ping: {
        name: "pf_show_ping",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    },
    pf_show_pos: {
        name: "pf_show_pos",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    },

    mb_controls_enabled: {
        name: "mb_controls_enabled",
        value: true,
        flags: { archive: true, readonly: false, cheat: false }
    },
    mb_joystick_size: {
        name: "mb_joystick_size",
        value: 150,
        flags: { archive: true, readonly: false, cheat: false }
    },
    mb_joystick_transparency: {
        name: "mb_joystick_transparency",
        value: 0.8,
        flags: { archive: true, readonly: false, cheat: false }
    },

    dv_password: {
        name: "dv_password",
        value: "",
        flags: { archive: true, readonly: false, cheat: false }
    },
    dv_role: {
        name: "dv_role",
        value: "",
        flags: { archive: true, readonly: false, cheat: false }
    },
    dv_name_color: {
        name: "dv_name_color",
        value: "",
        flags: { archive: true, readonly: false, cheat: false }
    },
    dv_lobby_clearing: {
        name: "dv_lobby_clearing",
        value: false,
        flags: { archive: true, readonly: false, cheat: false }
    }
} satisfies SimpleCVarMapping);

export const defaultBinds = Object.freeze({
    "+up": ["W", "ArrowUp"],
    "+down": ["S", "ArrowDown"],
    "+left": ["A", "ArrowLeft"],
    "+right": ["D", "ArrowRight"],
    interact: ["F"],
    "slot 0": ["1"],
    "slot 1": ["2"],
    "slot 2": ["3", "E"],
    last_item: ["Q"],
    other_weapon: ["Space"],
    swap_gun_slots: ["T"],
    "cycle_items -1": ["MWheelUp"],
    "cycle_items 1": ["MWheelDown"],
    "+attack": ["Mouse0"],
    drop: [] as string[],
    reload: ["R"],
    "cycle_scopes -1": [] as string[],
    "cycle_scopes +1": [] as string[],
    "use_consumable gauze": ["5"],
    "use_consumable medikit": ["6"],
    "use_consumable cola": ["7"],
    "use_consumable tablets": ["8"],
    cancel_action: ["X"],
    toggle_map: ["G", "M"],
    toggle_minimap: ["N"],
    "+emote_wheel": ["Mouse2"],
    toggle_console: [] as string[]
});
