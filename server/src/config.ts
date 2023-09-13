import { type Vector } from "../../common/src/utils/vector";

export enum SpawnMode { Random, Fixed, Center, Radius }
export enum GasMode { Normal, Debug, Disabled }

export interface ConfigType {
    readonly host: string
    readonly port: number
    readonly regions: Record<string, string>
    readonly defaultRegion: string

    /**
     * The websocket region this server is running.
     * Used for the find game api.
     */
    readonly thisRegion: string

    /**
     * HTTPS/SSL options. Not necessary in most cases.
     */
    readonly ssl: {
        readonly enable: boolean
        readonly keyFile: string
        readonly certFile: string
    }

    readonly movementSpeed: number

    /**
     * There are 4 spawn modes: Random, Fixed, Center, and Radius.
     * SpawnMode.Random spawns the player at a random location, ignoring the position and radius.
     * SpawnMode.Fixed always spawns the player at the exact position given, ignoring the radius.
     * SpawnMode.Center always spawns the player in the center of the map.
     * SpawnMode.Radius spawns the player at a random location within the circle with the given position and radius.
     */
    readonly spawn: {
        readonly mode: SpawnMode.Random
    } | {
        readonly mode: SpawnMode.Fixed
        readonly position: Vector
    } | {
        readonly mode: SpawnMode.Center
    } | {
        readonly mode: SpawnMode.Radius
        readonly position: Vector
        readonly radius: number
    }

    /**
     * The maximum number of players allowed to join a game.
     */
    readonly playerLimit: number

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
     * The map name, must be a valid value from the server maps definitions
     * Example: "main" for the main map or "debug" for the debug map
     */
    readonly mapName: string

    /**
     * Temporarily bans IPs that attempt to make more than 5 simultaneous connections or attempt to join more than 5 times in 5 seconds.
     */
    readonly botProtection: boolean

    readonly ipBanListURL: string
    readonly ipBanListPassword: string

    /**
     * If set to true, the CF-Connecting-IP header is used to determine IP addresses.
     */
    readonly cloudflare: boolean

    /**
     * Roles. Each role has a different password and can give exclusive skins and cheats.
     * If noPrivileges is set to true for a role, cheats will be disabled for that role.
     * To use roles, add `?password=PASSWORD&role=ROLE` to the URL, for example: `http://127.0.0.1:3000/?password=dev&role=dev`
     * Dev cheats can be enabled using the `lobbyClearing` option: `http://127.0.0.1:3000/?password=dev&role=dev&lobbyClearing=true`
     */
    readonly roles: Record<string, { password: string, noPrivileges?: boolean }>

    /**
     * Disables the lobbyClearing option if set to true
     */
    readonly disableLobbyClearing: boolean
}

export const Config = {
    host: "127.0.0.1",
    port: 8000,

    regions: {
        dev: "ws://127.0.0.1:8000",
        na: "wss://suroi.io",
        eu: "wss://eu.suroi.io",
        sa: "wss://sa.suroi.io",
        as: "wss://as.suroi.io"
    },
    defaultRegion: "na",
    thisRegion: "dev",

    ssl: {
        enable: false,
        keyFile: "",
        certFile: ""
    },

    movementSpeed: 0.77,

    spawn: { mode: SpawnMode.Random },

    playerLimit: 80,

    gas: { mode: GasMode.Normal },

    censorUsernames: true,

    botProtection: false,
    ipBanListURL: "https://suroi.io/api/bannedIPs",
    ipBanListPassword: "password",

    cloudflare: false,

    mapName: "main",

    roles: {
        dev: { password: "dev" },
        artist: { password: "artist", noPrivileges: true },
        hasanger: { password: "hasanger" },
        leia: { password: "leia" },
        katie: { password: "katie" },
        eipi: { password: "eipi" },
        "123op": { password: "123op" },
        radians: { password: "radians" }
    },
    disableLobbyClearing: false
} satisfies ConfigType as ConfigType;
