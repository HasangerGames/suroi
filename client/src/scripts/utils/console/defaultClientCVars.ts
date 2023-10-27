import { type Stringable } from "./gameConsole";
import { type CVarFlags, type CVarTypeMapping } from "./variables";

export interface JSONCVar<Value extends Stringable> {
    readonly name: string
    readonly value: Value
    readonly flags: Partial<CVarFlags>
}

export const defaultClientCVars: { [K in keyof CVarTypeMapping]: CVarTypeMapping[K]["value"] } = Object.freeze({
    cv_player_name: "",
    cv_loadout_skin: "forest_camo",
    cv_loadout_crosshair: "default",
    cv_loadout_top_emote: "happy_face",
    cv_loadout_right_emote: "thumbs_up",
    cv_loadout_bottom_emote: "suroi_logo",
    cv_loadout_left_emote: "sad_face",
    cv_loop_scope_selection: false,
    cv_anonymize_player_names: false,
    cv_master_volume: 1,
    cv_music_volume: 1,
    cv_sfx_volume: 1,
    cv_mute_audio: false,
    cv_use_old_menu_music: false,
    cv_language: "en",
    cv_region: undefined,
    cv_camera_shake_fx: true,
    cv_killfeed_style: "text",
    cv_movement_smoothing: true,
    cv_minimap_minimized: false,
    cv_leave_warning: true,
    cv_minimap_transparency: 0.8,
    cv_map_transparency: 0.9,
    cv_draw_hud: true,
    cv_rules_acknowledged: true,
    cv_hide_rules_button: true,
    cv_console_width: window.innerWidth / 2,
    cv_console_height: window.innerWidth / 2,
    cv_console_left: window.innerWidth / 4,
    cv_console_top: window.innerWidth / 4,
    cv_crosshair_color: "#000000",
    cv_crosshair_size: 30,
    cv_crosshair_stroke_color: "#000000",
    cv_crosshair_stroke_size: 0,

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
});

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
    toggle_console: ["`"]
});
