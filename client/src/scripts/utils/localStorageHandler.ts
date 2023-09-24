import { mergeDeep } from "../../../../common/src/utils/misc";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type KeybindActions = {
    moveUp: [string, string]
    moveDown: [string, string]
    moveLeft: [string, string]
    moveRight: [string, string]
    interact: [string, string]
    slot1: [string, string]
    slot2: [string, string]
    slot3: [string, string]
    lastEquippedItem: [string, string]
    equipOtherGun: [string, string]
    swapGunSlots: [string, string]
    previousItem: [string, string]
    nextItem: [string, string]
    useItem: [string, string]
    dropActiveItem: [string, string]
    reload: [string, string]
    previousScope: [string, string]
    nextScope: [string, string]
    useGauze: [string, string]
    useMedikit: [string, string]
    useCola: [string, string]
    useTablets: [string, string]
    cancelAction: [string, string]
    toggleMap: [string, string]
    toggleMiniMap: [string, string]
    emoteWheel: [string, string]
};

export interface Config {
    // this needs to be updated every time the config changes, because old configs need to be invalidated/ported
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
    hideRulesButton: boolean
    joystickSize: number
    joystickTransparency: number
    minimapTransparency: number
    bigMapTransparency: number

    devPassword?: string
    role?: string
    nameColor?: string
    lobbyClearing?: boolean
}

export const defaultConfig: Config = {
    configVersion: "13",
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
        interact: ["F", ""],
        slot1: ["1", ""],
        slot2: ["2", ""],
        slot3: ["3", "E"],
        lastEquippedItem: ["Q", ""],
        equipOtherGun: ["Space", ""],
        swapGunSlots: ["T", ""],
        previousItem: ["MWheelUp", ""],
        nextItem: ["MWheelDown", ""],
        useItem: ["Mouse0", ""],
        dropActiveItem: ["", ""],
        reload: ["R", ""],
        previousScope: ["", ""],
        nextScope: ["", ""],
        useGauze: ["5", ""],
        useMedikit: ["6", ""],
        useCola: ["7", ""],
        useTablets: ["8", ""],
        cancelAction: ["X", ""],
        toggleMap: ["G", "M"],
        toggleMiniMap: ["N", ""],
        emoteWheel: ["Mouse2", ""]
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
    hideRulesButton: false,
    joystickSize: 150,
    joystickTransparency: 0.8,
    minimapTransparency: 0.8,
    bigMapTransparency: 0.9,

    devPassword: "",
    nameColor: "",
    lobbyClearing: false
};

const configKey = "config";
const storedConfig = localStorage.getItem(configKey);

// Do a deep merge to add new config keys
let config = storedConfig !== null ? mergeDeep(JSON.parse(JSON.stringify(defaultConfig)), JSON.parse(storedConfig)) as Config : defaultConfig;
let rewriteConfigToLS = storedConfig === null;

if (config.configVersion !== defaultConfig.configVersion) {
    rewriteConfigToLS = true;

    /*
        Here, we can attempt to port the old configuration over

        note: for each branch, it's also recommended to write down what changes are being made
        ! This switch uses fallthrough, and the omission of break is intended.
        ! This is because if we're trying to adapt a config from version 2 to 4, we
        ! need to apply both the changes from 2 to 3 and those from 3 to 4. Thus, we use fallthrough.
    */

    let mutated = false;
    /**
     * Whenever the config is mutated, the `mutated` variable is set
     * to true.
     *
     * In theory, we'd want to put a `break` before the switch's `default`
     * case, because we don't want to replace the config. However, since
     * the rest of the `switch` (intentionally) doesn't use `break`s, this
     * can be confusing. So instead, we use evil proxy magic to detect when
     * the config is mutated. If the config is mutated, then it must be due
     * to matching one of the `switch` cases; we thus shouldn't enter the
     * `default` case
     */
    let proxy = new Proxy(config, {
        set<K extends keyof Config>(target: Config, key: K, value: Config[K]) {
            mutated = true;

            // We don't need this proxy anymore
            proxy = config;
            target[key] = value;

            return true;
        }
    });

    // fkin linters always getting in the damn way
    /* eslint-disable no-fallthrough */
    // noinspection FallThroughInSwitchStatementJS
    switch (config.configVersion) {
        case "1": {
            // Version 2: cameraShake, sfxVolume and translate the single bind system to the double bind system
            proxy.configVersion = "2";

            type KeybindStruct<T> = Record<string, T | Record<string, T | Record<string, T>>>;
            type Version1Keybinds = KeybindStruct<string>;
            type Version2Keybinds = KeybindStruct<[string, string]>;

            // fk off eslint
            // eslint-disable-next-line no-inner-declarations
            function convertAllBinds(object: Version1Keybinds, target: Version2Keybinds): Version2Keybinds {
                for (const key in object) {
                    const value = object[key];

                    if (typeof value === "string") {
                        target[key] = [value, ""];
                    } else {
                        convertAllBinds(value, target[key] = {});
                    }
                }

                return target;
            }

            proxy.keybinds = convertAllBinds(config.keybinds as unknown as Version1Keybinds, {}) as unknown as Config["keybinds"];
        }
        // Skip old porting code that's not necessary
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8": {
            // Version 9: Added leave warning, joystick size, joystick and minimap transparency settings
            // And inverted the next and previous weapon keybinds
            proxy.configVersion = "9";
            proxy.keybinds.previousItem = defaultConfig.keybinds.previousItem;
            proxy.keybinds.nextItem = defaultConfig.keybinds.nextItem;
        }
        case "9":
        case "10":
        case "11":
        case "12": {
            proxy.configVersion = defaultConfig.configVersion;
        }
        default: {
            if (!mutated) {
                config = defaultConfig;
            }
        }
    }
}

export const localStorageInstance = {
    get config() { return config; },
    update(newConfig: Partial<Config> = {}) {
        config = { ...config, ...newConfig };
        localStorage.setItem(configKey, JSON.stringify(config));
    }
};

if (rewriteConfigToLS) {
    localStorageInstance.update();
}
