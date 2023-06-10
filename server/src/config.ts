import { Vec2 } from "planck";

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
     * There are 3 spawn modes: "random", "radius", and "fixed".
     *
     * - "random" spawns the player at a random location, ignoring the position and radius.
     * - "radius" spawns the player at a random location within the circle with the given position and radius.
     * - "fixed" always spawns the player at the exact position given, ignoring the radius.
     */
    readonly spawn: {
        readonly mode: "random"
    } | {
        readonly mode: "fixed"
        readonly position: Vec2
    } | {
        readonly mode: "radius"
        readonly position: Vec2
        readonly radius: number
    }
    /**
     * There are 3 gas modes: "normal", "debug", and "disabled".
     *
     * - "normal": Default gas behavior. overrideDuration is ignored.
     * - "debug": The duration of each stage is always the duration specified by overrideDuration.
     * - "disabled": Gas is disabled.
     */
    readonly gas: {
        readonly mode: "disabled"
    } | {
        readonly mode: "normal"
    } | {
        readonly mode: "debug"
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
        mode: "radius",
        position: Vec2(360, 360),
        radius: 72
    },

    gas: {
        mode: "debug",
        overrideDuration: 10
    },

    switchMeleeWeapons: false,

    censorUsernames: true,

    botProtection: false,

    disableMapGeneration: false,
    stopServerAfter: -1
} satisfies ConfigType as ConfigType;
