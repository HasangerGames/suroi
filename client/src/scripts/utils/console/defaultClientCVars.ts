import { type Stringable } from "./gameConsole";
import { type CVarFlags, type ConVar, type ExtractConVarValue } from "./variables";

export interface JSONCVar<Value extends Stringable> {
    readonly value: Value
    readonly flags: Partial<CVarFlags>
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

type SimpleCVarMapping = {
    [K in keyof CVarTypeMapping]: ExtractConVarValue<CVarTypeMapping[K]> | JSONCVar<ExtractConVarValue<CVarTypeMapping[K]>>
};

export const defaultClientCVars: SimpleCVarMapping = Object.freeze({
    cv_player_name: "",
    cv_loadout_skin: "hazel_jumpsuit",
    cv_loadout_crosshair: 0,
    cv_loadout_top_emote: "happy_face",
    cv_loadout_right_emote: "thumbs_up",
    cv_loadout_bottom_emote: "suroi_logo",
    cv_loadout_left_emote: "sad_face",
    cv_loop_scope_selection: false,
    cv_anonymize_player_names: false,
    cv_master_volume: 1,
    cv_music_volume: 1,
    cv_sfx_volume: 1,
    cv_use_old_menu_music: false,
    cv_region: undefined,
    cv_camera_shake_fx: true,
    cv_killfeed_style: "text",
    cv_movement_smoothing: true,
    cv_responsive_rotation: true,
    cv_antialias: true,
    cv_minimap_minimized: false,
    cv_leave_warning: true,
    cv_minimap_transparency: 0.8,
    cv_map_transparency: 0.9,
    cv_rules_acknowledged: false,
    cv_hide_rules_button: false,
    cv_console_width: window.innerWidth / 2,
    cv_console_height: window.innerWidth / 2,
    cv_console_left: window.innerWidth / 4,
    cv_console_top: window.innerWidth / 4,
    cv_crosshair_color: "#000000",
    cv_crosshair_size: 30,
    cv_crosshair_stroke_color: "#000000",
    cv_crosshair_stroke_size: 0,

    // unused for now
    cv_draw_hud: true,
    cv_language: "en",
    cv_mute_audio: false,
    //

    pf_show_fps: false,
    pf_show_ping: false,
    pf_show_pos: false,

    mb_controls_enabled: true,
    mb_joystick_size: 150,
    mb_joystick_transparency: 0.8,

    dv_password: "",
    dv_role: "",
    dv_name_color: "",
    dv_lobby_clearing: false
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
    "equip_or_cycle_throwables 1": ["4"],
    last_item: ["Q"],
    other_weapon: ["Space"],
    swap_gun_slots: ["T"],
    "cycle_items -1": ["MWheelUp"],
    "cycle_items 1": ["MWheelDown"],
    "+attack": ["Mouse0"],
    drop: [],
    reload: ["R"],
    "cycle_scopes -1": [],
    "cycle_scopes 1": [],
    "use_consumable gauze": ["7"],
    "use_consumable medikit": ["8"],
    "use_consumable cola": ["9"],
    "use_consumable tablets": ["0"],
    cancel_action: ["X"],
    toggle_map: ["G", "M"],
    toggle_minimap: ["N"],
    toggle_hud: [],
    "+emote_wheel": ["Mouse2"],
    toggle_console: []
} satisfies Record<string, string[]>);
