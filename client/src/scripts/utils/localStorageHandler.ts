export const defaultConfig = {
    playerName: "",
    keybinds: null,
    masterVolume: 1,
    musicVolume: 1,
    muteAudio: false,
    language: "en",
    region: "na"
};

const configKey = "config";

const storedConfig = localStorage.getItem(configKey);

class LocalStorageConfig {
    private storage: typeof defaultConfig;

    constructor() {
        this.storage = storedConfig !== null ? JSON.parse(storedConfig) : defaultConfig;
    }

    get config(): typeof defaultConfig {
        return this.storage;
    }

    update(config: Partial<typeof defaultConfig>): void {
        this.storage = { ...this.storage, ...config };
        localStorage.setItem(configKey, JSON.stringify(this.storage));
    }
}

if (storedConfig === null) {
    localStorage.setItem("config", JSON.stringify(defaultConfig));
}

const localStorageInstance = new LocalStorageConfig();

export {
    localStorageInstance
};
