import { TeamSize } from "@common/constants";
import { type Maps, SpawnMode, SpawnOptions } from "./data/maps";
import { type Game } from "./game";
import { type GamePlugin } from "./pluginManager";

export const Config = {
    host: "127.0.0.1",
    port: 8000,

    map: "normal",

    spawn: { mode: SpawnMode.Default },

    teamSize: TeamSize.Solo,

    maxPlayersPerGame: 80,
    maxGames: 5,

    gas: { mode: GasMode.Normal },

    tps: 40,

    plugins: [],

    disableLobbyClearing: true,

    roles: {
        developr: { password: "developr", isDev: true },
        dev_managr: { password: "dev_managr" },
        designr: { password: "designr" },
        vip_designr: { password: "vip_designr" },
        sound_designr: { password: "sound_designr" },
        moderatr: { password: "moderatr" },
        administratr: { password: "administratr" },
        content_creatr: { password: "content_creatr" },
        donatr: { password: "donatr" },

        hasanger: { password: "hasanger", isDev: true },
        error: { password: "error", isDev: true },
        pap: { password: "pap", isDev: true },
        zedaes: { password: "zedaes", isDev: true }
    }
} satisfies ConfigType as ConfigType;

export type MapWithParams = `${keyof typeof Maps}${string}`;

export const enum GasMode {
    Normal,
    Debug,
    Disabled
}

export type Switchable = string | number;
export interface Switched<T extends Switchable> {
    /**
     * List of items to rotate between.
     * When the end is reached, it will loop back to the beginning.
     */
    readonly rotation: T[]
    /**
     * Cron pattern to use for switching
     */
    readonly cron: string
}
export type StaticOrSwitched<T extends Switchable> = T | Switched<T>;

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
     * The map name. Must be a valid value from the server maps definitions (`maps.ts`).
     * Example: `"main"` for the main map or `"debug"` for the debug map.
     * Parameters can also be specified for certain maps, separated by colons (e.g. `singleObstacle:rock`)
     */
    readonly map: StaticOrSwitched<MapWithParams>

    /**
     * There are 5 spawn modes: `Normal`, `Radius`, `Fixed`, `Center`, and `Default`.
     * - `SpawnMode.Normal` spawns the player at a random location that is at least 50 units away from other players.
     * - `SpawnMode.Radius` spawns the player at a random location within the circle with the given position and radius.
     * - `SpawnMode.Fixed` always spawns the player at the exact position given.
     * - `SpawnMode.Center` always spawns the player in the center of the map.
     * - `SpawnMode.Default` uses the spawn options specified in the map definition, or `SpawnMode.Normal` if none are specified.
     */
    readonly spawn: SpawnOptions | { readonly mode: SpawnMode.Default }

    /**
     * The maximum number of players allowed to join a team.
     */
    readonly teamSize: StaticOrSwitched<TeamSize>

    /**
     * Whether to start the game as soon as joining (debug feature, also disables winning when 1 player is remaining for obvious reasons).
     */
    readonly startImmediately?: boolean

    /**
     * The maximum number of players allowed to join a game.
     */
    readonly maxPlayersPerGame: number

    /**
     * The maximum number of concurrent games.
     */
    readonly maxGames: number

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
    readonly plugins: ReadonlyArray<new (game: Game) => GamePlugin>

    /**
     * API server options.
     */
    readonly apiServer?: {
        readonly url: string
        readonly apiKey: string
        readonly reportWebhookURL?: string
    }

    /**
     * If this option is specified, the given HTTP header will be used to determine IP addresses.
     * If using nginx with the sample config, set it to `"X-Real-IP"`.
     * If using Cloudflare, set it to `"CF-Connecting-IP"`.
     * If not using a reverse proxy, this option should be omitted.
     */
    readonly ipHeader?: string

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
     * Limits the number of teams that can be created by any one IP address.
     */
    readonly maxTeams?: number

    /**
     * If a player's username matches one of the regexes in this array, it will be replaced with the default username.
     */
    readonly usernameFilters?: readonly RegExp[]

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
     * Disables the lobbyClearing option (i.e. dev cheats).
     */
    readonly disableLobbyClearing?: boolean

    /**
     * Allows scopes and radios to work in buildings.
     */
    readonly disableBuildingCheck?: boolean
}
