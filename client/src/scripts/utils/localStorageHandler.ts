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
    useGauze: [string, string]
    useMedikit: [string, string]
    useCola: [string, string]
    useTablets: [string, string]
    cancelAction: [string, string]
    toggleMap: [string, string]
    toggleMiniMap: [string, string]
};

export interface Config {
    // this needs to be updated every time the config changes, because old configs need to be invalidated/ported
    configVersion: string
    playerName: string
    keybinds: KeybindActions
    masterVolume: number
    sfxVolume: number
    musicVolume: number
    muteAudio: boolean
    language: string
    region: string
    cameraShake: boolean
    showFPS: boolean
    showPing: boolean
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
    nameColor?: string
}

export const defaultConfig: Config = {
    configVersion: "12",
    playerName: "",
    keybinds: {
        moveUp: ["W", "ArrowUp"],
        moveDown: ["S", "ArrowDown"],
        moveLeft: ["A", "ArrowLeft"],
        moveRight: ["D", "ArrowRight"],
        interact: ["F", ""],
        slot1: ["1", ""],
        slot2: ["2", ""],
        slot3: ["3", ""],
        lastEquippedItem: ["Q", ""],
        equipOtherGun: ["Space", ""],
        swapGunSlots: ["T", ""],
        previousItem: ["MWheelUp", ""],
        nextItem: ["MWheelDown", ""],
        useItem: ["Mouse0", ""],
        dropActiveItem: ["", ""],
        reload: ["R", ""],
        useGauze: ["5", ""],
        useMedikit: ["6", ""],
        useCola: ["7", ""],
        useTablets: ["8", ""],
        cancelAction: ["X", ""],
        toggleMap: ["G", "M"],
        toggleMiniMap: ["N", ""]
    },
    masterVolume: 1,
    musicVolume: 1,
    sfxVolume: 1,
    muteAudio: false,
    language: "en",
    region: "na",
    cameraShake: true,
    showFPS: false,
    showPing: false,
    textKillFeed: false,
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
    nameColor: ""
};

const configKey = "config";
const storedConfig = localStorage.getItem(configKey);

let config: Config = storedConfig !== null ? JSON.parse(storedConfig) : defaultConfig;
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
        set() {
            mutated = true;

            // We don't need this proxy anymore
            proxy = config;

            return true;
        }
    });

    // fkin linters always getting in the damn way
    /* eslint-disable no-fallthrough */
    // noinspection FallThroughInSwitchStatementJS
    switch (config.configVersion) {
        case undefined: {
            // Version 1: Keybinds and versioning
            proxy.configVersion = "1";
            proxy.keybinds = { ...defaultConfig.keybinds };
        }
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

            proxy.sfxVolume = defaultConfig.sfxVolume;
            proxy.cameraShake = defaultConfig.cameraShake;
        }
        case "2": {
            // Version 3: More debug options
            proxy.configVersion = "3";
            proxy.showFPS = defaultConfig.showFPS;
            proxy.showPing = defaultConfig.showPing;
            proxy.rotationSmoothing = defaultConfig.rotationSmoothing;
            proxy.movementSmoothing = defaultConfig.movementSmoothing;
        }
        case "3": {
            // Version 4: toggleMap keybind
            proxy.configVersion = "4";
            proxy.keybinds.toggleMap = defaultConfig.keybinds.toggleMap;
        }
        case "4": {
            // Version 5: Added "Interact", "Equip Other Gun", and "Toggle Minimap" keybinds, and mobile controls toggle
            proxy.configVersion = "5";
            proxy.keybinds.interact = defaultConfig.keybinds.interact;
            proxy.keybinds.equipOtherGun = defaultConfig.keybinds.equipOtherGun;
            proxy.keybinds.toggleMiniMap = defaultConfig.keybinds.toggleMiniMap;
            proxy.mobileControls = defaultConfig.mobileControls;
        }
        case "5": {
            // Version 6: Added "Drop Active Item" keybind
            proxy.configVersion = "6";
            proxy.keybinds.dropActiveItem = defaultConfig.keybinds.dropActiveItem;
        }
        case "6": {
            // Version 7: Added "Swap Gun Slots" keybind
            proxy.configVersion = "7";
            proxy.keybinds.swapGunSlots = defaultConfig.keybinds.swapGunSlots;
        }
        case "7": {
            // Version 8: Added "Reload", "Cancel Action" keybind, and save the minimap minimized state
            proxy.configVersion = "8";
            proxy.keybinds.reload = defaultConfig.keybinds.reload;
            proxy.keybinds.cancelAction = defaultConfig.keybinds.cancelAction;
            proxy.minimapMinimized = defaultConfig.minimapMinimized;
        }
        case "8": {
            // Version 9: Added leave warning, joystick size, joystick and minimap transparency settings
            // And inverted the next and previous weapon keybinds
            proxy.configVersion = "9";
            proxy.leaveWarning = defaultConfig.leaveWarning;
            proxy.joystickSize = defaultConfig.joystickSize;
            proxy.joystickTransparency = defaultConfig.joystickTransparency;
            proxy.minimapTransparency = defaultConfig.minimapTransparency;
            proxy.keybinds.previousItem = defaultConfig.keybinds.previousItem;
            proxy.keybinds.nextItem = defaultConfig.keybinds.nextItem;
        }
        case "9": {
            // Version 10: Added big map transparency setting
            proxy.configVersion = "10";
            proxy.bigMapTransparency = defaultConfig.bigMapTransparency;
        }
        case "10": {
            // Version 11: Added keybinds to use Healing Items
            proxy.configVersion = "11";
            proxy.keybinds.useGauze = defaultConfig.keybinds.useGauze;
            proxy.keybinds.useMedikit = defaultConfig.keybinds.useMedikit;
            proxy.keybinds.useCola = defaultConfig.keybinds.useCola;
            proxy.keybinds.useTablets = defaultConfig.keybinds.useTablets;
        }
        case "11": {
            // Version 12: Developer password and color stuff
            proxy.configVersion = "12";
            if (proxy.devPassword === undefined) proxy.devPassword = defaultConfig.devPassword;
            if (proxy.nameColor === undefined) proxy.nameColor = defaultConfig.nameColor;
        }
        case "12": {
            // Version 13: Added text-based kill feed option
            proxy.configVersion = "13";
            proxy.textKillFeed = defaultConfig.textKillFeed;
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
