import { Vec2 } from "planck";

export enum SpawnMode { Random, Radius, Fixed}
export enum GasMode { Normal, Debug, Disabled }

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
     * There are 3 spawn modes: SpawnMode.Random, SpawnMode.Radius, and SpawnMode.Fixed.
     * SpawnMode.Random spawns the player at a random location, ignoring the position and radius.
     * SpawnMode.Radius spawns the player at a random location within the circle with the given position and radius.
     * SpawnMode.Fixed always spawns the player at the exact position given, ignoring the radius.
     */
    spawn: {
        mode: SpawnMode.Random,
        position: Vec2(360, 360),
        radius: 72
    },

    /*
     * There are 3 gas modes: GasMode.Normal, GasMode.Debug, and GasMode.Disabled.
     * GasMode.Normal: Default gas behavior. overrideDuration is ignored.
     * GasMode.Debug: The duration of each stage is always the duration specified by overrideDuration.
     * GasMode.Disabled: Gas is disabled.
     */
    gas: {
        mode: GasMode.Debug,
        overrideDuration: 10
    },

    // Experimental: Set to true to give players melee weapons when certain obstacles are destroyed.
    switchMeleeWeapons: false,

    // A basic filter that censors only the most extreme swearing.
    censorUsernames: true,

    // Temporarily bans IPs that attempt to make more than 5 simultaneous connections or attempt to join more than 5 times in 5 seconds.
    botProtection: false,

    disableMapGeneration: false,
    stopServerAfter: -1
};
