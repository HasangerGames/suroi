import { Vec2 } from "planck";

export const Config = {
    host: "127.0.0.1",
    port: 8000,
    address: "ws://127.0.0.1:8000",
    ssl: {
        keyFile: "",
        certFile: "",
        enable: false
    },

    movementSpeed: 0.032,
    get diagonalSpeed() { return this.movementSpeed / Math.SQRT2; },

    /*
     * There are 3 spawn modes: "random", "radius", and "fixed".
     * "random" spawns the player at a random location, ignoring the position and radius.
     * "radius" spawns the player at a random location within the circle with the given position and radius.
     * "fixed" always spawns the player at the exact position given, ignoring the radius.
     */
    spawn: {
        mode: "fixed",
        position: Vec2(10, 10),
        radius: 72
    },

    /*
     * There are 3 gas modes: "normal", "debug", and "disabled".
     * "normal": Default gas behavior. overrideDuration is ignored.
     * "debug": The duration of each stage is always the duration specified by overrideDuration.
     * "disabled": Gas is disabled.
     */
    gas: {
        mode: "normal",
        overrideDuration: 10
    },

    // A basic filter that censors only the most extreme swearing.
    censorUsernames: true,

    // Temporarily bans IPs that attempt to make more than 5 simultaneous connections or attempt to join more than 5 times in 5 seconds.
    botProtection: false,

    disableMapGeneration: false,
    stopServerAfter: -1
};
