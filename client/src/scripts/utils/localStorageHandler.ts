// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type KeybindActions = {
    moveUp: [string, string]
    moveDown: [string, string]
    moveLeft: [string, string]
    moveRight: [string, string]
    slot1: [string, string]
    slot2: [string, string]
    slot3: [string, string]
    lastEquippedItem: [string, string]
    previousItem: [string, string]
    nextItem: [string, string]
    useItem: [string, string]
    toggleMap: [string, string]
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
}

export const defaultConfig: Config = {
    configVersion: "4",
    playerName: "",
    keybinds: {
        moveUp: ["W", "ArrowUp"],
        moveDown: ["S", "ArrowDown"],
        moveLeft: ["A", "ArrowLeft"],
        moveRight: ["D", "ArrowRight"],
        slot1: ["1", ""],
        slot2: ["2", ""],
        slot3: ["3", ""],
        lastEquippedItem: ["Q", ""],
        previousItem: ["MWheelDown", ""],
        nextItem: ["MWheelUp", ""],
        useItem: ["Mouse0", ""],
        toggleMap: ["G", "M"]
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
    movementSmoothing: true
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
    switch (config.configVersion) {
        case undefined: {
            // Configs lacking a version field also lack keybind fields, so take those from the default
            config.configVersion = "1";
            config.keybinds = { ...defaultConfig.keybinds };
        }
        case "1": {
            // Add cameraShake and sfxVolume options which were added in this update
            config.configVersion = "2";
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
