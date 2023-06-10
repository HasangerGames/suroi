import { Vec2 } from "planck";

export enum SpawnMode { Random, Radius, Fixed}
export enum GasMode { Normal, Debug, Disabled }

export interface ConfigType {
    readonly host: string
    readonly port: number
    readonly address: string
    readonly ssl: {
        readonly keyFile: string
        readonly certFile: string
        readonly enable: boolean
    }
    readonly movementSpeed: number
    get diagonalSpeed(): number
    /**
     * There are 3 spawn modes: SpawnMode.Random, SpawnMode.Radius, and SpawnMode.Fixed.
     * SpawnMode.Random spawns the player at a random location, ignoring the position and radius.
     * SpawnMode.Radius spawns the player at a random location within the circle with the given position and radius.
     * SpawnMode.Fixed always spawns the player at the exact position given, ignoring the radius.
     */
    readonly spawn: {
        readonly mode: SpawnMode.Random
    } | {
        readonly mode: SpawnMode.Fixed
        readonly position: Vec2
    } | {
        readonly mode: SpawnMode.Radius
        readonly position: Vec2
        readonly radius: number
    }
    /**
     * There are 3 gas modes: GasMode.Normal, GasMode.Debug, and GasMode.Disabled.
     * GasMode.Normal: Default gas behavior. overrideDuration is ignored.
     * GasMode.Debug: The duration of each stage is always the duration specified by overrideDuration.
     * GasMode.Disabled: Gas is disabled.
     */
    readonly gas: {
        readonly mode: GasMode.Disabled
    } | {
        readonly mode: GasMode.Normal
    } | {
        readonly mode: GasMode.Debug
        readonly overrideDuration: number
    }
    /**
     * Experimental: Set to true to give players melee weapons when certain obstacles are destroyed.
     */
    readonly switchMeleeWeapons: boolean
    /**
     * A basic filter that censors only the most extreme swearing.
     */
    readonly censorUsernames: boolean
    /**
     * Temporarily bans IPs that attempt to make more than 5 simultaneous connections or attempt to join more than 5 times in 5 seconds.
     */
    readonly botProtection: boolean
    readonly disableMapGeneration: boolean
    readonly stopServerAfter: number
}

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

    spawn: {
        mode: SpawnMode.Radius,
        position: Vec2(360, 360),
        radius: 72
    },

    gas: {
        mode: GasMode.Debug,
        overrideDuration: 10
    },

    switchMeleeWeapons: false,

    censorUsernames: true,

    botProtection: false,

    disableMapGeneration: false,
    stopServerAfter: -1
} satisfies ConfigType as ConfigType;
