import { Vec2 } from "planck";

export enum SpawnMode { Random, Radius, Fixed}
export enum GasMode { Normal, Debug, Disabled }

export interface ConfigType {
    readonly host: string
    readonly port: number
    readonly regions: Record<string, string>
    readonly defaultRegion: string
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
     * A basic filter that censors only the most extreme swearing.
     */
    readonly censorUsernames: boolean
    /**
     * Temporarily bans IPs that attempt to make more than 5 simultaneous connections or attempt to join more than 5 times in 5 seconds.
     */
    readonly botProtection: boolean
    readonly disableMapGeneration: boolean

    /**
     * Dev mode password, this gives dev cheats, for now it only spawns the player with some weapons and 100% adrenaline. \
     * To use it add `?devPassword=PASSWORD` on the website url, example: `127.0.0.1:3000/?devPassword=fooBar`. \
     * If its `undefined` you won't be able to get dev mode
     */
    readonly devPassword?: string
}

export const Config = {
    host: "127.0.0.1",
    port: 8000,

    regions: {
        dev: "ws://127.0.0.1:8000",
        na: "wss://suroi.io",
        eu: "wss://eu.suroi.io",
        as: "wss://as.suroi.io"
    },
    defaultRegion: "na",

    ssl: {
        keyFile: "",
        certFile: "",
        enable: false
    },

    movementSpeed: 0.031,
    get diagonalSpeed() { return this.movementSpeed / Math.SQRT2; },

    spawn: {
        mode: SpawnMode.Fixed,
        position: Vec2(360, 360)
    },

    gas: { mode: GasMode.Normal },

    censorUsernames: true,

    botProtection: false,

    disableMapGeneration: false,

    devPassword: "dev"
} satisfies ConfigType as ConfigType;
