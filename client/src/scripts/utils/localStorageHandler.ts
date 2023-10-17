import { defaultBinds } from "./console/defaultClientCVars";
import { keybinds } from "./console/gameConsole";
import { consoleVariables, type CVarTypeMapping, type ExtractConVarValue } from "./console/variables";

/* eslint-disable @typescript-eslint/indent */
export type KeybindActions = Record<
    "moveUp" |
    "moveDown" |
    "moveLeft" |
    "moveRight" |
    "interact" |
    "slot1" |
    "slot2" |
    "slot3" |
    "lastEquippedItem" |
    "equipOtherGun" |
    "swapGunSlots" |
    "previousItem" |
    "nextItem" |
    "useItem" |
    "dropActiveItem" |
    "reload" |
    "previousScope" |
    "nextScope" |
    "useGauze" |
    "useMedikit" |
    "useCola" |
    "useTablets" |
    "cancelAction" |
    "toggleMap" |
    "toggleMiniMap" |
    "emoteWheel" |
    "toggleConsole",
    string[]
>;

export const actionNameToConsoleCommand: Record<keyof KeybindActions, string> = {
    moveUp: "+up",
    moveDown: "+down",
    moveLeft: "+left",
    moveRight: "+right",
    interact: "interact",
    slot1: "slot 0",
    slot2: "slot 1",
    slot3: "slot 2",
    lastEquippedItem: "last_item",
    equipOtherGun: "other_weapon",
    swapGunSlots: "swap_gun_slots",
    previousItem: "cycle_items -1",
    nextItem: "cycle_items 1",
    useItem: "+attack",
    dropActiveItem: "drop",
    reload: "reload",
    previousScope: "cycle_scopes -1",
    nextScope: "cycle_scopes 1",
    useGauze: "use_consumable gauze",
    useMedikit: "use_consumable medikit",
    useCola: "use_consumable cola",
    useTablets: "use_consumable tablets",
    cancelAction: "cancel_action",
    toggleMap: "toggle_map",
    toggleMiniMap: "toggle_minimap",
    emoteWheel: "+emote_wheel",
    toggleConsole: "toggle_console"
};

interface OldConfig {
    configVersion: string
    playerName: string
    rulesAcknowledged: boolean
    loadout: {
        skin: string
        topEmote: string
        rightEmote: string
        bottomEmote: string
        leftEmote: string
    }
    scopeLooping: boolean
    anonymousPlayers: boolean
    keybinds: KeybindActions
    masterVolume: number
    sfxVolume: number
    musicVolume: number
    muteAudio: boolean
    oldMenuMusic: boolean
    language: string
    region: string | undefined
    cameraShake: boolean
    showFPS: boolean
    showPing: boolean
    showCoordinates: boolean
    clientSidePrediction: boolean
    textKillFeed: boolean
    rotationSmoothing: boolean
    movementSmoothing: boolean
    mobileControls: boolean
    minimapMinimized: boolean
    leaveWarning: boolean
    joystickSize: number
    joystickTransparency: number
    minimapTransparency: number
    bigMapTransparency: number

    devPassword?: string
    role?: string
    nameColor?: string
    lobbyClearing?: boolean
}

export function portOldConfig(): void {
    const oldConfig = localStorage.getItem("config");

    if (oldConfig && localStorage.getItem("suroi_config") === null) {
        try {
            const config = JSON.parse(oldConfig) as OldConfig;

            if (config.configVersion && config.configVersion !== "1") {
                ([
                    ["cv_player_name", config.playerName],
                    ["cv_loadout_skin", config.loadout.skin],
                    ["cv_loadout_top_emote", config.loadout.topEmote],
                    ["cv_loadout_right_emote", config.loadout.rightEmote],
                    ["cv_loadout_bottom_emote", config.loadout.bottomEmote],
                    ["cv_loadout_left_emote", config.loadout.leftEmote],
                    ["cv_loop_scope_selection", config.scopeLooping],
                    ["cv_anonymize_player_names", config.anonymousPlayers],
                    ["cv_master_volume", config.masterVolume],
                    ["cv_music_volume", config.musicVolume],
                    ["cv_sfx_volume", config.sfxVolume],
                    ["cv_mute_audio", config.muteAudio],
                    ["cv_use_old_menu_music", config.oldMenuMusic],
                    ["cv_language", config.language],
                    ["cv_region", config.region],
                    ["cv_camera_shake_fx", config.cameraShake],
                    ["cv_animate_rotation", config.clientSidePrediction ? "client" : "wait_for_server"],
                    ["cv_killfeed_style", config.textKillFeed ? "text" : "icon"],
                    ["cv_rotation_smoothing", config.rotationSmoothing],
                    ["cv_movement_smoothing", config.movementSmoothing],
                    ["cv_minimap_minimized", config.minimapMinimized],
                    ["cv_leave_warning", config.leaveWarning],
                    ["cv_minimap_transparency", config.minimapTransparency],
                    ["cv_map_transparency", config.bigMapTransparency],
                    ["pf_show_fps", config.showFPS],
                    ["pf_show_ping", config.showPing],
                    ["pf_show_pos", config.showCoordinates],
                    ["mb_controls_enabled", config.mobileControls],
                    ["mb_joystick_size", config.joystickSize],
                    ["mb_joystick_transparency", config.joystickTransparency],
                    ["dv_password", config.devPassword],
                    ["dv_name_color", config.nameColor],
                    ["dv_lobby_clearing", config.lobbyClearing]
                ] as Array<[keyof CVarTypeMapping, ExtractConVarValue<CVarTypeMapping[keyof CVarTypeMapping]>]>)
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    .forEach(([key, value]) => { consoleVariables.set.builtIn(key, value); });
                keybinds.unbindAll();
                for (const [key, binds] of Object.entries(config.keybinds)) {
                    const action = actionNameToConsoleCommand[key as keyof KeybindActions];
                    if (action === undefined) continue;

                    for (const bind of binds) {
                        keybinds.addActionsToInput(bind, action);
                    }
                }
                keybinds.addActionsToInput(defaultBinds.toggle_console[0], "toggle_console");
            }
        } catch (error) {
            console.error(error);
        }
    }
}
