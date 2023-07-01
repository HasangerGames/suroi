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
    rotationSmoothing: boolean
    movementSmoothing: boolean
    mobileControls: boolean
    minimapMinimized: boolean
    leaveWarning: boolean
    joystickSize: number
    joystickTransparency: number
    minimapTransparency: number

    devPassword: string | undefined | null
    nameColor: string | undefined | null
}

export const defaultConfig: Config = {
    configVersion: "9",
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
        previousItem: ["MWheelDown", ""],
        nextItem: ["MWheelUp", ""],
        useItem: ["Mouse0", ""],
        dropActiveItem: ["", ""],
        reload: ["R", ""],
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
    rotationSmoothing: true,
    movementSmoothing: true,
    mobileControls: true,
    minimapMinimized: false,
    leaveWarning: true,
    joystickSize: 150,
    joystickTransparency: 0.8,
    minimapTransparency: 0.6,

    devPassword: "",
    nameColor: ""
};

const configKey = "config";
const storedConfig = localStorage.getItem(configKey);

let config: Config = storedConfig !== null ? JSON.parse(storedConfig) : defaultConfig;
let rewriteConfigToLS = storedConfig === null;

while (config.configVersion !== defaultConfig.configVersion) {
    rewriteConfigToLS = true;

    // Here, we can attempt to port the old configuration over
    // note: for each branch, it's also recommended to write down what changes are being made
    //! This switch uses fallthrough, and the omission of break is intended
    //! This is because if we're trying to adapt a config from version 2 to 4, we
    //! need to apply both the changes from 2 to 3 and those from 3 to 4. Thus, we
    //! use fallthrough.
    //! The only place a break is needed is before the default case, to avoid having our
    //! changes wiped.
    //! Thus, to whoever it may concern, when the time comes to update this switch, make sure
    //! that only the last branch before the default case has a break, and that none of the others do

    /* eslint-disable no-fallthrough */
    // noinspection FallThroughInSwitchStatementJS
    switch (config.configVersion) {
        case undefined: {
            // Configs lacking a version field also lack keybind fields, so take those from the default
            config.configVersion = "1";
            config.keybinds = { ...defaultConfig.keybinds };
        }
        case "1": {
            // Add cameraShake and sfxVolume options which were added in this update
            // As well, translate the single bind system to the double bind system
            config.configVersion = "2";

            type KeybindStruct<T> = Record<string, T | Record<string, T | Record<string, T>>>;
            type Version1Keybinds = KeybindStruct<string>;
            type Version2Keybinds = KeybindStruct<[string, string]>;

            // shut up, eslint
            // i don't know if swearing is allowed in this codebase, so i won't swear after eslint
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

            config.keybinds = convertAllBinds(config.keybinds as unknown as Version1Keybinds, {}) as unknown as Config["keybinds"];

            config.sfxVolume = defaultConfig.sfxVolume;
            config.cameraShake = defaultConfig.cameraShake;
        }
        case "2": {
            // Add other debug options added here
            config.configVersion = "3";
            config.showFPS = defaultConfig.showFPS;
            config.showPing = defaultConfig.showPing;
            config.rotationSmoothing = defaultConfig.rotationSmoothing;
            config.movementSmoothing = defaultConfig.movementSmoothing;
        }
        case "3": {
            // Version four just adds the toggleMap keybind, so just that needs porting
            config.configVersion = "4";
            config.keybinds.toggleMap = defaultConfig.keybinds.toggleMap;
            break;
        }
        case "4": {
            // Version 5: Added "Interact", "Equip Other Gun", and "Toggle Minimap" keybinds, and mobile controls toggle
            config.configVersion = "5";
            config.keybinds.interact = defaultConfig.keybinds.interact;
            config.keybinds.equipOtherGun = defaultConfig.keybinds.equipOtherGun;
            config.keybinds.toggleMiniMap = defaultConfig.keybinds.toggleMiniMap;
            config.mobileControls = defaultConfig.mobileControls;
            break;
        }
        case "5": {
            // Version 6: Added "Drop Active Item" keybind
            config.configVersion = "6";
            config.keybinds.dropActiveItem = defaultConfig.keybinds.dropActiveItem;
            break;
        }
        case "6": {
            // Version 7: Added "Swap Gun Slots" keybind
            config.configVersion = "7";
            config.keybinds.swapGunSlots = defaultConfig.keybinds.swapGunSlots;
            break;
        }
        case "7": {
            // Version 8: Added "Reload", "Cancel Action" keybind, and save the minimap minimized state
            config.configVersion = "8";
            config.keybinds.reload = defaultConfig.keybinds.reload;
            config.keybinds.cancelAction = defaultConfig.keybinds.cancelAction;
            config.minimapMinimized = defaultConfig.minimapMinimized;
            break;
        }
        case "8": {
            // Version 9: Added leave warning, joystick size, joystick and minimap transparecy settings
            config.configVersion = "9";
            config.leaveWarning = defaultConfig.leaveWarning;
            config.joystickSize = defaultConfig.joystickSize;
            config.joystickTransparency = defaultConfig.joystickTransparency;
            config.minimapTransparency = defaultConfig.minimapTransparency;
            break;
        }
        default: {
            // Otherwise, we just wipe it and replace it with the default
            config = defaultConfig;
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
