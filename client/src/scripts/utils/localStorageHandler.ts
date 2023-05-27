// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type KeybindActions = {
    move: {
        up: string
        down: string
        left: string
        right: string
    }
    inventory: {
        // expand as needed
        slot1: string
        slot2: string
        slot3: string

        lastEquippedItem: string
        previousItem: string
        nextItem: string
    }
    useItem: string
};

export interface Config {
    // this needs to be updated every time the config changes, because old configs need to be invalidated/ported
    configVersion: string
    playerName: string
    keybinds: KeybindActions
    masterVolume: number
    musicVolume: number
    muteAudio: boolean
    language: string
    region: string
}

export const defaultConfig: Config = {
    configVersion: "1",
    playerName: "",
    keybinds: {
        move: {
            up: "W",
            down: "S",
            left: "A",
            right: "D"
        },
        inventory: {
            slot1: "1",
            slot2: "2",
            slot3: "3",

            lastEquippedItem: "Q",
            previousItem: "",
            nextItem: ""
        },
        useItem: "Mouse0"
    },
    masterVolume: 1,
    musicVolume: 1,
    muteAudio: false,
    language: "en",
    region: "na"
};

const configKey = "config";
const storedConfig = localStorage.getItem(configKey);

let config: Config = storedConfig !== null ? JSON.parse(storedConfig) : defaultConfig;
let rewriteConfigToLS = storedConfig === null;

if (config.configVersion !== defaultConfig.configVersion) {
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
