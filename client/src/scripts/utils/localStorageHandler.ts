import { mergeDeep } from "../../../../common/src/utils/misc";
import { consoleVariables, gameConsole, keybinds, type CVarTypeMapping, type ExtractConVarValue } from "./console/gameConsole";

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

const storedConfig = localStorage.getItem("config");

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

if (typeof storedConfig === "string") {
    // autoexec config, we're happy
    gameConsole.addReadyCallback(() => { gameConsole.handleQuery(storedConfig); });
} else {
    // ughhhhh porting time

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

        consoleSettings?: {
            left?: number
            top?: number
            width?: number
            height?: number
        }
    }

    const defaultConfig: OldConfig = {
        configVersion: "14",
        playerName: "",
        rulesAcknowledged: false,
        loadout: {
            skin: "forest_camo",
            topEmote: "happy_face",
            rightEmote: "thumbs_up",
            bottomEmote: "suroi_logo",
            leftEmote: "sad_face"
        },
        keybinds: {
            moveUp: ["W", "ArrowUp"],
            moveDown: ["S", "ArrowDown"],
            moveLeft: ["A", "ArrowLeft"],
            moveRight: ["D", "ArrowRight"],
            interact: ["F"],
            slot1: ["1"],
            slot2: ["2"],
            slot3: ["3", "E"],
            lastEquippedItem: ["Q"],
            equipOtherGun: ["Space"],
            swapGunSlots: ["T"],
            previousItem: ["MWheelUp"],
            nextItem: ["MWheelDown"],
            useItem: ["Mouse0"],
            dropActiveItem: [],
            reload: ["R"],
            previousScope: [],
            nextScope: [],
            useGauze: ["5"],
            useMedikit: ["6"],
            useCola: ["7"],
            useTablets: ["8"],
            cancelAction: ["X"],
            toggleMap: ["G", "M"],
            toggleMiniMap: ["N"],
            emoteWheel: ["Mouse2"],
            toggleConsole: ["§"]
        },
        scopeLooping: false,
        anonymousPlayers: false,
        masterVolume: 1,
        musicVolume: 1,
        sfxVolume: 1,
        muteAudio: false,
        oldMenuMusic: false,
        language: "en",
        region: undefined,
        cameraShake: true,
        showFPS: false,
        showPing: false,
        showCoordinates: false,
        clientSidePrediction: true,
        textKillFeed: true,
        rotationSmoothing: true,
        movementSmoothing: true,
        mobileControls: true,
        minimapMinimized: false,
        leaveWarning: true,
        joystickSize: 150,
        joystickTransparency: 0.8,
        minimapTransparency: 0.8,
        bigMapTransparency: 0.9,

        devPassword: "",
        nameColor: "",
        lobbyClearing: false
    };

    const config = storedConfig !== null ? mergeDeep(JSON.parse(JSON.stringify(defaultConfig)), JSON.parse(storedConfig)) as OldConfig : defaultConfig;

    /* eslint-disable no-fallthrough */
    // noinspection FallThroughInSwitchStatementJS
    switch (config.configVersion) {
        case "1": {
            config.configVersion = "2";

            type KeybindStruct<T> = Record<string, T | Record<string, T | Record<string, T>>>;
            type Version1Keybinds = KeybindStruct<string>;
            type Version2Keybinds = KeybindStruct<[string, string]>;

            // eslint-disable-next-line no-inner-declarations
            function convertAllBinds(object: Version1Keybinds, target: Version2Keybinds): Version2Keybinds {
                for (const key in object) {
                    const value = object[key];

                    if (typeof value === "string") {
                        target[key] = [value, ""];
                    } else {
                        convertAllBinds(value, (target[key] = {}));
                    }
                }

                return target;
            }

            config.keybinds = convertAllBinds(config.keybinds as unknown as Version1Keybinds, {}) as unknown as OldConfig["keybinds"];
        }
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8": {
            config.configVersion = "9";
            config.keybinds.previousItem = defaultConfig.keybinds.previousItem;
            config.keybinds.nextItem = defaultConfig.keybinds.nextItem;
        }
        case "9":
        case "10":
        case "11":
        case "12":
        case "13":
        case "14":
        default: {
            (
                [
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
                ] as Array<[keyof CVarTypeMapping, ExtractConVarValue<CVarTypeMapping[keyof CVarTypeMapping]>]>
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            ).forEach(([key, value]) => { consoleVariables.set.builtIn(key, value); });

            for (const [key, binds] of Object.entries(config.keybinds)) {
                const action = actionNameToConsoleCommand[key as keyof KeybindActions];
                if (action === undefined) continue;

                for (const bind of binds) {
                    keybinds.addActionsToInput(bind, action);
                }
            }
        }
    }
}
