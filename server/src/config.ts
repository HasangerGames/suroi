import { type Vector } from "../../common/src/utils/vector";
import { type Maps } from "./data/maps";

export enum SpawnMode {
    Normal,
    Random,
    Radius,
    Fixed,
    Center
}
export enum GasMode {
    Normal,
    Debug,
    Disabled
}

export const Config = {
    host: "127.0.0.1",
    port: 8000,

    mapName: "main",

    spawn: { mode: SpawnMode.Normal },

    maxPlayersPerGame: 80,
    maxGames: 3,
    preventJoinAfter: 60000,

    gas: { mode: GasMode.Normal },

    movementSpeed: 0.02655,

    censorUsernames: true,

    roles: {
        developr: { password: "developr" },
        designr: { password: "designr", noPrivileges: true },
        youtubr: { password: "youtubr", noPrivileges: true },
        hasanger: { password: "hasanger" },
        leia: { password: "leia" },
        katie: { password: "katie" },
        eipi: { password: "eipi" },
        radians: { password: "radians" },
        limenade: { password: "limenade" }
    }
} satisfies ConfigType as ConfigType;

export interface ConfigType {
    readonly host: string
    readonly port: number

    /**
     * HTTPS/SSL options. Not used if running locally or with nginx.
     */
    readonly ssl?: {
        readonly keyFile: string
        readonly certFile: string
    }

    /**
     * The map name. Must be a valid value from the server maps definitions (`maps.ts`).
     * Example: `"main"` for the main map or `"debug"` for the debug map
     */
    readonly mapName: keyof typeof Maps

    /**
     * There are 5 spawn modes: `Normal`, `Random`, `Radius`, `Fixed`, and `Center`.
     * - `SpawnMode.Normal` spawns the player at a random location with a minimum distance between players.
     * - `SpawnMode.Random` spawns the player at a random location.
     * - `SpawnMode.Radius` spawns the player at a random location within the circle with the given position and radius.
     * - `SpawnMode.Fixed` always spawns the player at the exact position given.
     * - `SpawnMode.Center` always spawns the player in the center of the map.
     */
    readonly spawn: {
        readonly mode: SpawnMode.Normal
    } | {
        readonly mode: SpawnMode.Random
    } | {
        readonly mode: SpawnMode.Radius
        readonly position: Vector
        readonly radius: number
    } | {
        readonly mode: SpawnMode.Fixed
        readonly position: Vector
    } | {
        readonly mode: SpawnMode.Center
    }

    /**
     * The maximum number of players allowed to join a game.
     */
    readonly maxPlayersPerGame: number

    /**
     * The maximum number of concurrent games.
     */
    readonly maxGames: number

    /**
     * The number of milliseconds after which players are prevented from joining a game.
     */
    readonly preventJoinAfter: number

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
        readonly overridePosition?: boolean
        readonly overrideDuration?: number
    }

    readonly movementSpeed: number

    /**
     * A basic filter that censors only the most extreme swearing.
     */
    readonly censorUsernames: boolean

    /**
     * If this option is present, various options to mitigate bots and cheaters are enabled.
     */
    readonly protection?: {
        /**
         * Limits the number of simultaneous connections from each IP address.
         * If the limit is exceeded, the IP is temporarily banned.
         */
        readonly maxSimultaneousConnections?: number

        /**
         * Limits the number of join attempts (`count`) within the given duration (`duration`, in milliseconds) from each IP address.
         * If the limit is exceeded, the IP is temporarily banned.
         */
        readonly maxJoinAttempts?: {
            readonly count: number
            readonly duration: number
        }

        /**
         * If this option is present, a list of punishments will be loaded, either from a local file or from a remote source.
         * If `url` is specified, the list is loaded from the specified URL (e.g. https://suroi.io). Trailing slash not allowed.
         * The specified `password` is sent in the `Password` header.
         * If `url` is not specified, the list is loaded from `punishments.json`, and it's accessible from `/api/punishments`.
         * To access the list, the specified `password` must be provided in the `Password` header.
         */
        readonly punishments?: {
            readonly password: string
            readonly url?: string
        }

        /**
         * Every `refreshDuration` milliseconds, rate limited IPs are cleared, and the list of punishments is reloaded if enabled.
         */
        readonly refreshDuration: number
    }

    /**
     * If this option is specified, the given HTTP header will be used to determine IP addresses.
     * If using nginx with the sample config, set it to `"X-Real-IP"`.
     * If using Cloudflare, set it to `"CF-Connecting-IP"`.
     */
    readonly ipHeader?: string

    /**
     * Roles. Each role has a different password and can give exclusive skins and cheats.
     * If noPrivileges is set to true for a role, cheats will be disabled for that role.
     * To use roles, add `?password=PASSWORD&role=ROLE` to the URL, for example: `http://127.0.0.1:3000/?password=dev&role=dev`
     * Dev cheats can be enabled using the `lobbyClearing` option: `http://127.0.0.1:3000/?password=dev&role=dev&lobbyClearing=true`
     */
    readonly roles: Record<string, {
        readonly password: string
        readonly noPrivileges?: boolean
    }>

    /**
     * Disables the lobbyClearing option if set to true
     */
    readonly disableLobbyClearing?: boolean
}
