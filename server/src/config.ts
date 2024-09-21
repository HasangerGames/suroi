import { Layer, TeamSize } from "@common/constants";
import { Vec, type Vector } from "@common/utils/vector";

import { type Maps } from "./data/maps";
import { type Game } from "./game";
import { type GamePlugin } from "./pluginManager";

export enum SpawnMode {
    Normal,
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

    map: "singleBuilding:headquarters",

    spawn: { mode: SpawnMode.Fixed, position: Vec.create(447, 411), layer: 1 },

    maxTeamSize: TeamSize.Solo,

    maxPlayersPerGame: 80,
    maxGames: 4,
    gameJoinTime: 60,

    gas: { mode: GasMode.Normal },

    tps: 40,

    plugins: [],

    roles: {
        "developr": { password: "developr", isDev: true },
        "moderatr": { password: "moderatr", isDev: true },
        "trial_moderatr": { password: "trial_moderatr" },
        "designr": { password: "designr" },
        "lead_designr": { password: "lead_designr" },
        "vip_designr": { password: "vip_designr" },
        "studio_managr": { password: "studio_managr" },
        "composr": { password: "composr" },
        "lead_composr": { password: "lead_composr" },
        "youtubr": { password: "youtubr" },
        "boostr": { password: "boostr" },

        "hasanger": { password: "hasanger", isDev: true },
        "leia": { password: "leia", isDev: true },
        "katie": { password: "katie", isDev: true },
        "eipi": { password: "eipi", isDev: true },
        "error": { password: "error", isDev: true },
        "kenos": { password: "kenos", isDev: true },
        "radians": { password: "radians", isDev: true },
        "limenade": { password: "limenade", isDev: true },
        "123op": { password: "123op" }
    },

    authServer: {
        address: "http://localhost:8080"
    }
} satisfies ConfigType as ConfigType;

export interface ConfigType {
    /**
     * The hostname to host the server on.
     */
    readonly host: string

    /**
     * The port to host the server on.
     * The main server is hosted on the specified port, while game servers are hosted on the ports following it.
     * For example, if it's 8000, the main server is hosted on port 8000, the first game server is on 8001, the second is on 8002, and so on.
     */
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
     * Example: `"main"` for the main map or `"debug"` for the debug map.
     * Parameters can also be specified for certain maps, separated by colons (e.g. `singleObstacle:rock`)
     */
    readonly map: `${keyof typeof Maps}${string}`

    /**
     * There are 4 spawn modes: `Normal`, `Radius`, `Fixed`, and `Center`.
     * - `SpawnMode.Normal` spawns the player at a random location that is at least 50 units away from other players.
     * - `SpawnMode.Radius` spawns the player at a random location within the circle with the given position and radius.
     * - `SpawnMode.Fixed` always spawns the player at the exact position given.
     * - `SpawnMode.Center` always spawns the player in the center of the map.
     */
    readonly spawn:
        | { readonly mode: SpawnMode.Normal }
        | {
            readonly mode: SpawnMode.Radius
            readonly position: Vector
            readonly radius: number
        }
        | {
            readonly mode: SpawnMode.Fixed
            readonly position: Vector
            readonly layer?: Layer
        }
        | { readonly mode: SpawnMode.Center }

    /**
     * The maximum number of players allowed to join a team.
     *
     * Specifying a {@link TeamSize} causes the team size to
     * simply remain at that value indefinitely; alternatively,
     * specifying a cron pattern and an array of team sizes
     * allows for team sizes to change periodically
     */
    readonly maxTeamSize: TeamSize | {
        /**
         * The duration between switches. Must be a cron pattern.
         */
        readonly switchSchedule: string
        /**
         * The team sizes to switch between.
         */
        readonly rotation: TeamSize[]
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
     * The number of seconds after which players are prevented from joining a game.
     */
    readonly gameJoinTime: number

    /**
     * There are 3 gas modes: GasMode.Normal, GasMode.Debug, and GasMode.Disabled.
     * GasMode.Normal: Default gas behavior. overrideDuration is ignored.
     * GasMode.Debug: The duration of each stage is always the duration specified by overrideDuration.
     * GasMode.Disabled: Gas is disabled.
     */
    readonly gas:
        | { readonly mode: GasMode.Disabled }
        | { readonly mode: GasMode.Normal }
        | {
            readonly mode: GasMode.Debug
            readonly overridePosition?: boolean
            readonly overrideDuration?: number
        }

    /**
     * The number of game ticks that occur per second.
     */
    readonly tps: number

    /**
     * List of plugin classes to load.
     */
    readonly plugins: Array<new (game: Game) => GamePlugin>

    /**
     * Allows scopes and radios to work in buildings.
     */
    readonly disableBuildingCheck?: boolean

    /**
     * Disables the username filter.
     * The filter is very basic, censoring only the most extreme slurs and the like.
     */
    readonly disableUsernameFilter?: boolean

    /**
     * If this option is present, various options to mitigate bots and cheaters are enabled.
     */
    readonly protection?: {
        /**
         * Limits the number of simultaneous connections from each IP address.
         */
        readonly maxSimultaneousConnections?: number

        /**
         * Limits the number of join attempts (`count`) within the given duration (`duration`, in milliseconds) from each IP address.
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

        /**
         * If `true`, a list of blocked IPs will be downloaded from the given URL on server startup. The IPs must be separated by newlines.
         * The list is only reloaded on server startup.
         */
        readonly ipBlocklistURL?: string
    }

    /**
     * If this option is specified, the given HTTP header will be used to determine IP addresses.
     * If using nginx with the sample config, set it to `"X-Real-IP"`.
     * If using Cloudflare, set it to `"CF-Connecting-IP"`.
     */
    readonly ipHeader?: string

    /**
     * Roles. Each role has a different password and can give exclusive skins and cheats.
     * If `isDev` is set to `true` for a role, cheats will be enabled for that role.
     * To use roles, add `?password=PASSWORD&role=ROLE` to the URL, for example: `http://127.0.0.1:3000/?password=dev&role=dev`
     * Dev cheats can be enabled using the `lobbyClearing` option (`http://127.0.0.1:3000/?password=dev&role=dev&lobbyClearing=true`),
     * but the server must also have it enabled (thru {@link ConfigType.disableLobbyClearing})
     */
    readonly roles: Record<string, {
        readonly password: string
        readonly isDev?: boolean
    }>

    /**
     * Disables the lobbyClearing option if set to `true`
     */
    readonly disableLobbyClearing?: boolean

    /**
     * Options for the authentication server
     *
     * Optional; If not specified, the server will not use an authentication server
     */
    readonly authServer?: {
        readonly address: string
    }
}
