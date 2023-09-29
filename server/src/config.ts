import { type Vector } from "../../common/src/utils/vector";

export enum SpawnMode { Random, Fixed, Center, Radius }
export enum GasMode { Normal, Debug, Disabled }

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
    readonly mapName: string

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
            count: number
            duration: number
        }

        /**
         * If this option is present, a list of banned IPs will be loaded, either from a local file or from a remote source.
         * If `url` is specified, the list is loaded from the specified URL (e.g. https://suroi.io/api/bannedIPs).
         * The specified `password` is sent in the `Password` header.
         * If `url` is not specified, the list is loaded from `bannedIPs.json`, and it's accessible from `/api/bannedIPs`.
         * To access the list, the specified `password` must be provided in the `Password` header.
         */
        readonly ipBanList?: {
            readonly password: string
            readonly url?: string
        }

        /**
         * Every `refreshDuration` milliseconds, the list of rate limited IPs is cleared, and the list of banned IPs is reloaded if enabled.
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
    readonly roles: Record<string, { password: string, noPrivileges?: boolean }>

    /**
     * Disables the lobbyClearing option if set to true
     */
    readonly disableLobbyClearing?: boolean
}

export const Config = {
    host: "127.0.0.1",
    port: 8000,

    mapName: "singleObstacle",

    spawn: { mode: SpawnMode.Center },

    playerLimit: 80,

    gas: { mode: GasMode.Normal },

    movementSpeed: 0.77,

    censorUsernames: true,

    roles: {
        dev: { password: "dev" },
        artist: { password: "artist", noPrivileges: true },
        hasanger: { password: "hasanger" },
        leia: { password: "leia" },
        katie: { password: "katie" },
        eipi: { password: "eipi" },
        "123op": { password: "123op" },
        radians: { password: "radians" }
    }
} satisfies ConfigType as ConfigType;
