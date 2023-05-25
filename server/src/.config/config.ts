import { Vec2 } from "planck";

export const Config = {
    host: "127.0.0.1",
    port: 8000,
    webSocketAddress: "ws://127.0.0.1:8000",
    ssl: {
        keyFile: "",
        certFile: "",
        enable: false
    },
    movementSpeed: 0.032,
    get diagonalSpeed() { return this.movementSpeed / Math.SQRT2; },
    botProtection: false,
    randomUsernames: false,
    debug: {
        spawnLocation: Vec2(360, 360),
        fixedSpawnLocation: true,
        disableMapGeneration: false,
        stopServerAfter: -1
    }
};

export const Debug = Config.debug;
