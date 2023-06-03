// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type KeybindActions = {
    moveUp: string[]
    moveDown: string[]
    moveLeft: string[]
    moveRight: string[]
    slot1: string[]
    slot2: string[]
    slot3: string[]
    lastEquippedItem: string[]
    previousItem: string[]
    nextItem: string[]
    useItem: string[]
    toggleMap: string[]
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
        toggleMap: ["G", ""]
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
    switch (config.configVersion) {
        case undefined: {
            // Configs lacking a version field also lack keybind fields, so take those from the default
            config.configVersion = "1";
            config.keybinds = { ...defaultConfig.keybinds };
            break;
        }
        case "1":
            config.configVersion = "2";
            config.keybinds = { ...defaultConfig.keybinds };
            config.sfxVolume = defaultConfig.sfxVolume;
            config.cameraShake = defaultConfig.cameraShake;
            break;
        case "2":
            config.configVersion = "4";
            config.showFPS = defaultConfig.showFPS;
            config.showPing = defaultConfig.showPing;
            config.rotationSmoothing = defaultConfig.rotationSmoothing;
            config.movementSmoothing = defaultConfig.movementSmoothing;
            break;
        default: {
            // Otherwise, we just wipe it and replace it with the default
            config = defaultConfig;
        }
    }
}

export const localStorageInstance = {
    get config() {
        return config;
    },
    update(newConfig?: Partial<Config>) {
        config = { ...config, ...(newConfig ?? {}) };
        localStorage.setItem(configKey, JSON.stringify(config));
    }
};

if (rewriteConfigToLS) {
    localStorageInstance.update();
}
