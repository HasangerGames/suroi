import type { TranslationMap } from "../translations";

export const ENGLISH_TRANSLATIONS: TranslationMap = {
    "name": "English",
    "flag": "🇬🇧",

    "msg_rotate": "For a better experience, please rotate your device to landscape.",
    "msg_loading": "Connecting",
    "msg_err_joining": "Error joining game.",
    "msg_err_finding": "Error finding game.",
    "msg_spectating": "Spectating",
    "msg_enter_team_code": "Enter a team code:",
    "msg_lost_team_connection": "Lost connection to team.",
    "msg_error_joining_team": "Error joining team.<br>It may not exist or it is full.", // <br> here is an HTML break-line element. DO NOT TOUCH OR MOVE.
    "msg_try_again": "Please try again.",
    "msg_warning": "You have been warned!",
    "msg_warning_msg": "You have received a warning by the moderators for reason: <reason>",
    "msg_temp_ban": "You have been temporarily banned!",
    "msg_temp_ban_msg": "You have been banned for reason: <reason>",
    "msg_perma_ban": "You have been permanently banned!",
    "msg_perma_ban_msg": "You have been banned for reason: <reason>",
    "msg_no_reason": "No reason provided.",

    "play_solo": "Play Solo",
    "play_duo": "Play Duos",
    "play_squad": "Play Squads",
    "join_team": "Join Team",
    "msg_locked_tooltip": "The game switches between solos and duos every 24 hours, as there aren't enough players for both.",
    "rules_and_tutorial": "Rules & Tutorial",
    "news": "News",
    "loadout": "Loadout",
    "settings": "Settings",
    "fullscreen": "Fullscreen",
    "resume": "Resume",
    "quit": "Quit",
    "none": "None",
    "copy": "Copy",
    "copied": "Copied",

    "health": "health",
    "adrenaline": "adrenaline",

    "settings_volume": "Volume",
    "settings_keybinds": "Keybinds",
    "settings_graphics": "Graphics",
    "settings_interface": "Interface",
    "settings_save_load": "Save/Load",
    "settings_mobile": "Mobile",
    "settings_require_reload": "* Changing these settings requires reloading the page",
    "settings_performance_warning": "* This setting can cause issues on some devices. Disable if you're unable to join the game.",

    "settings_master_volume": "Master volume",
    "settings_sfx_volume": "SFX volume",
    "settings_music_volume": "Music volume",
    "settings_old_menu_music": "Old menu music",

    "settings_render_mode": "Render mode",
    "settings_render_resolution": "Render resolution",
    "settings_render_resolution_auto": "Auto",
    "settings_hires_textures": "High resolution textures",
    "settings_cooler_graphics": "Cooler graphics",
    "settings_antialias": "Anti-aliasing",
    "settings_movement_smoothing": "Movement smoothing",
    "settings_responsive_rotation": "Responsive rotation",
    "settings_camera_shake": "Camera shake",

    "settings_interface_scale": "Interface scale",
    "settings_minimap_opacity": "Minimap opacity",
    "settings_fs_map_opacity": "Fullscreen map opacity",
    "settings_hide_minimap": "Hide minimap",
    "settings_blur_splash": "Blur splash screen",
    "settings_hide_rules": "Hide rules button",
    "settings_warn_before_leaving": "Warn before leaving",
    "settings_show_fps": "Show FPS",
    "settings_show_ping": "Show ping",
    "settings_show_coordinates": "Show coordinates",
    "settings_anon_names": "Anonymous player names",
    "settings_hide_emotes": "Hide emotes",
    "settings_text_killfeed": "Text-based killfeed",
    "settings_colored_weapon_slots": "Colored weapon slots",
    "settings_scope_looping": "Loop scope selection",
    "settings_draw_hud": "Draw HUD",
    "settings_autopickup": "Enable autopickup",
    "settings_autopickup_dual_guns": "Autopickup dual guns",

    "settings_load_settings": "Load settings",
    "settings_copy_settings": "Copy settings to clipboard",
    "settings_reset_settings": "Reset settings",

    "settings_reload": "Reload",
    "settings_mobile_controls": "Enable mobile controls",
    "settings_joystick_size": "Joystick size",
    "settings_joystick_opacity": "Joystick opacity",

    "loadout_skins": "Skins",
    "loadout_emotes": "Emotes",
    "loadout_crosshairs": "Crosshairs",
    "loadout_badges": "Badges",
    "loadout_special": "Special",
    "loadout_crosshairs_default": "System default",
    "loadout_crosshairs_size": "Size:",
    "loadout_crosshairs_color": "Color:",
    "loadout_crosshairs_stroke_size": "Stroke Size:",
    "loadout_crosshairs_stroke_color": "Stroke Color:",

    "emotes_category_People": "People",
    "emotes_category_Text": "Text",
    "emotes_category_Memes": "Memes",
    "emotes_category_Icons": "Icons",
    "emotes_category_Misc": "Misc",

    "featured_youtubr": "Featured Youtubr",
    "featured_streamr": "Featured Streamr",

    "btn_report": "Report",
    "btn_spectate_kill_leader": "Spectate Kill Leader",
    "btn_spectate": "Spectate",
    "btn_play_again": "Play Again",
    "btn_menu": "Menu",

    "msg_waiting_for_leader": "Waiting for leader",
    "msg_you_died": "You died.",
    "msg_player_died": "<player> died.",
    "msg_win": "Winner winner chicken dinner!",
    "msg_your_rank": "Rank",

    "msg_kills": "Kills: <kills>",

    "gas_waiting": "Toxic gas advances in <time>",
    "gas_advancing": "Toxic gas is advancing! Move to the safe zone",
    "gas_inactive": "Waiting for players...",

    "action_open_door": "Open Door",
    "action_close_door": "Close Door",
    "action_revive": "Revive <player>",
    "action_cancel": "Cancel",
    "action_reloading": "Reloading...",
    "action_reviving": "Reviving...",
    "action_being_revived": "Being revived...",
    "action_gauze_use": "Applying <item>",
    "action_medikit_use": "Using <item>",
    "action_cola_use": "Drinking <item>",
    "action_tablets_use": "Taking <item>",

    "interact_airdrop_crate_locked": "Open Airdrop",
    "interact_control_panel": "Activate Control Panel",
    "interact_generator": "Activate Generator",
    "interact_button": "Press Button",

    "loading_spritesheets": "Loading Spritesheets <progress>",
    "loading_connecting": "Connecting",
    "loading_joining_game": "Joining Game",
    "loading_fetching_data": "Fetching Server Data...",
    "loading_finding_game": "Finding Game",

    "keybind_clear_tooltip": "To remove a keybind, press the keybind and then press either <kbd>Escape</kbd> or <kbd>Backspace</kbd>.",
    "keybind_reset": "Reset to defaults",
    "bindings_+up": "Move Up",
    "bindings_+down": "Move Down",
    "bindings_+left": "Move Left",
    "bindings_+right": "Move Right",
    "bindings_interact": "Interact",
    "bindings_loot": "Loot",
    "bindings_slot 0": "Equip Primary",
    "bindings_slot 1": "Equip Secondary",
    "bindings_slot 2": "Equip Melee",
    "bindings_equip_or_cycle_throwables 1": "Equip/Cycle Throwable",
    "bindings_last_item": "Equip Last Weapon",
    "bindings_other_weapon": "Equip Other Gun",
    "bindings_swap_gun_slots": "Swap Gun Slots",
    "bindings_cycle_items -1": "Equip Previous Weapon",
    "bindings_cycle_items 1": "Equip Next Weapon",
    "bindings_+attack": "Use Weapon",
    "bindings_drop": "Drop Active Weapon",
    "bindings_reload": "Reload",
    "bindings_cycle_scopes -1": "Previous Scope",
    "bindings_cycle_scopes 1": "Next Scope",
    "bindings_use_consumable gauze": "Use Gauze",
    "bindings_use_consumable medikit": "Use Medikit",
    "bindings_use_consumable cola": "Use Cola",
    "bindings_use_consumable tablets": "Use Tablets",
    "bindings_cancel_action": "Cancel Action",
    "bindings_+view_map": "View Map",
    "bindings_toggle_map": "Toggle Fullscreen Map",
    "bindings_toggle_minimap": "Toggle Minimap",
    "bindings_toggle_hud": "Toggle HUD",
    "bindings_+emote_wheel": "Emote Wheel",
    "bindings_+map_ping_wheel": "Switch to Map Ping",
    "bindings_+map_ping": "Map Ping Wheel",
    "bindings_toggle_console": "Toggle Console",
    "bindings_toggle_slot_lock": "Toggle Slot Lock",

    "kf_suicide_kill": "<player> committed suicide",
    "kf_suicide_down": "<player> knocked themselves out",

    "kf_bleed_out_kill": "<player> bled out",
    "kf_bleed_out_down": "<player> bled out non-lethally",

    "kf_finished_off_kill": "<player> finished off <victim>",
    "kf_finished_off_down": "<player> gently finished off <victim>",

    "kf_finally_died": "<player> finally died",
    "kf_finally_ended_themselves": "<player> finally ended themselves",

    "kf_finally_killed": "<player> was finally killed",
    "kf_finally_down": "<player> was finally knocked out",

    "kf_gas_kill": "<player> died to the gas",
    "kf_gas_down": "<player> was knocked out by the gas",

    "kf_airdrop_kill": "<player> was fatally crushed by an airdrop",
    "kf_airdrop_down": "<player> was knocked out by an airdrop",

    // ------------------------------------------------------------------
    "finally": "finally",
    "with": "with",

    // Kill modal only
    "you": "You",
    "yourself": "yourself",
    "km_killed": "killed",
    "km_knocked": "knocked out",

    "km_message": "<you> <finally> <event> <victim> <with> <weapon>",

    // Killfeed.
    "kf_killed": "killed",
    "kf_knocked": "knocked out",
    "kf_finished_off": "finished off",
    "themselves": "themselves",

    "kf_message": "<player> <finally> <event> <victim> <with> <weapon>",
    // ------------------------------------------------------------------

    // Kill Leader stuff
    "kf_kl_promotion": "<player> is promoted to the Kill Leader!",
    "kf_kl_killed": "<player> killed the Kill Leader",
    "kf_kl_dead": "The Kill Leader is dead!",
    "kf_kl_suicide": "The Kill Leader killed themselves!",

    "tt_restores": "<item> restores <amount> <type>",
    "tt_reduces": "<item> reduces <percent>% damage",

    "go_kills": "Kills:",
    "go_damage_done": "Damage Done:",
    "go_damage_taken": "Damage Taken:",
    "go_time_alive": "Time Alive:",

    "create_team": "Create Team",
    "create_team_autofill": "Auto Fill",
    "create_team_lock": "Lock Team",
    "create_team_waiting": "Waiting...",
    "create_team_play": "Start Game",

    "report_reporting": "Reporting",
    "report_id": "Report ID:",
    "report_instructions": `
      <p><strong>Please follow the instructions below!</strong> If you don't, your report will be ignored.</p>
      <h4>How to Submit a Report</h4>
      <ol>
        <li>Join the <a href="https://discord.suroi.io">Discord server.</a></li>
        <li>Go to the <a href="https://discord.com/channels/1077043833621184563/1135288369526607973">#cheater-reports
            channel.</a></li>
        <li>Read the report guidelines in the pinned post.</li>
        <li>Submit your report as a post.</li>
      </ol>`,

    "languages": "Languages",

    // loot

    "gauze": "Gauze",
    "medikit": "Medikit",
    "cola": "Cola",
    "tablets": "Tablets",

    "basic_vest": "Basic Vest",
    "regular_vest": "Regular Vest",
    "tactical_vest": "Tactical Vest",
    "basic_helmet": "Basic Helmet",
    "regular_helmet": "Regular Helmet",
    "tactical_helmet": "Tactical Helmet",
    "bag": "Bag", // This shouldn't show up in game
    "basic_pack": "Basic Pack",
    "regular_pack": "Regular Pack",
    "tactical_pack": "Tactical Pack",

    "1x_scope": "1x Scope", // This shouldn't show up in game
    "2x_scope": "2x Scope",
    "4x_scope": "4x Scope",
    "8x_scope": "8x Scope",
    "15x_scope": "15x Scope",

    "fists": "Fists",
    "baseball_bat": "Baseball Bat",
    "hatchet": "Hatchet",
    "kbar": "K-bar",
    "maul": "Maul",
    "gas_can": "Gas Can",
    "heap_sword": "HE-AP Sword",
    "steelfang": "Steelfang",
    "ice_pick": "Ice Pick",
    "seax": "Seax",
    "crowbar": "Crowbar",
    "sickle": "Sickle",

    "mosin": "Mosin-Nagant",
    "radio": "Radio",
    "lewis_gun": "Lewis Gun",
    "hp18": "HP-18",
    "acr": "ACR",
    "saf_200": "SAF-200",
    "deathray": "Death Ray",
    "usas12": "USAS-12",
    "firework_launcher": "Firework Launcher",
    "arena_closer": "Destroyer Of Worlds",
    "revitalizer": "Revitalizer",
    "s_g17": "G17 (Scoped)",
    "vss": "VSS",
    "aug": "AUG",
    "pp19": "PP-19",
    "vepr12": "Vepr-12",
    "flues": "Flues",
    "cz75a": "CZ-75A",
    "g19": "G19",
    "mp40": "MP40",
    "m1895": "M1895",
    "ak47": "AK-47",
    "vector": "Vector",
    "mini14": "Mini-14",
    "model_37": "Model 37",
    "model_89": "Model 89",
    "negev": "Negev",
    "sr25": "SR-25",
    "tango_51": "Tango 51",
    "barrett": "Barrett M95",
    "stoner_63": "Stoner 63",
    "m1_garand": "M1 Garand",
    "micro_uzi": "Micro Uzi",
    "m3k": "M3K",
    "arx160": "ARX-160",
    "m16a4": "M16A4",
    "mg36": "MG-36",
    "mcx_spear": "MCX Spear",

    "frag_grenade": "Frag Grenade",
    "smoke_grenade": "Smoke Grenade",
    "confetti_grenade": "Confetti Grenade",

    // For dual guns
    "dual_template": "Dual <gun>",

    // regions
    "region_dev": "Localhost Server",
    "region_na": "North America",
    "region_eu": "Europe",
    "region_sa": "South America",
    "region_as": "Asia"
};
