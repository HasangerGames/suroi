import { Vec2 } from "planck";

export const Config = {
    host: "127.0.0.1",
    port: 8000,
    domain: "",
    ssl: {
        keyFile: "",
        certFile: "",
        enable: false
    },
    movementSpeed: 0.032,
    diagonalSpeed: 0, // Assigned below
    debug: {
        spawnLocation: Vec2(360, 360),
        fixedSpawnLocation: false,
        disableMapGeneration: false,
        disableStaticFileCache: true
    }
};
export const Debug = Config.debug;
Config.diagonalSpeed = Config.movementSpeed / Math.SQRT2;
