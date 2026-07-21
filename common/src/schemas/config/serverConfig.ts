import z from "zod";
import { Port } from "../misc";

export const ServerConfig = z.object({
    $schema: z.literal("config.schema.json"),
    /**
     * The hostname to host the servers on.
     */
    hostname: z.string().default("127.0.0.1"),
    /**
     * The port to host the main server on.
     */
    mainPort: Port.default(42084),
    /**
     * Range of ports to host the game servers on.
     * First number is minimum, second is maximum (inclusive).
     * This determines the maximum number of games.
     */
    gamePortRange: z.tuple([Port, Port])
        .refine(([min, max]) => min < max, { error: "Minimum port must be smaller than maximum" })
        .default([42085, 43085]),
    /**
     * Overrides the map if present.
     * Must be a valid value from the server map definitions (maps.ts).
     * Example: "normal" for the normal map or "debug" for the debug map.
     * Parameters can also be specified for certain maps, separated by colons (e.g. singleObstacle:rock).
     */
    map: z.string().optional(),
    /**
     * Options for player spawning. See the description of the "mode" property for more details.
     */
    spawn: z.object({
        /**
         * There are three spawn modes: `default`, `random`, and `fixed`.
         * `default` uses the spawn options specified in the map definition, falling back to `random` if no options are specified.
         * `random` spawns players randomly, spreading them out as much as possible.
         * `fixed` spawns players exactly at the specified position, or randomly within a circle with the specified radius. If no position is specified, it defaults to the center of the map.
         */
        mode: z.enum(["default", "random", "fixed"]),
        /**
         * The position to spawn players at.
         * The first, second, and third items in the array represent the X, Y, and Z coordinates respectively.
         * The Z coordinate is optional, defaulting to the ground layer if not present.
         * If a `radius` is not specified, players are spawned at the exact given position.
         * If a `radius` is specified, players are spawned randomly within a circle centered at the given position.
         * This property is ignored unless the spawn mode is set to `fixed`.
         */
        position: z.array(z.number()).min(2).max(3).optional(),
        /**
         * The radius of the circle within which players will be spawned randomly.
         * This property is ignored unless the spawn mode is set to `fixed`.
         */
        radius: z.number().positive().optional()
    }).optional(),
    /**
     * Options for the gas.
     */
    gas: z.object({
        /**
         * If set to `true`, the gas will be disabled.
         */
        disabled: z.boolean().default(false),
        /**
         * Forces the gas to shrink to a specific position.
         * If set to `true`, it will shrink to the center of the map.
         */
        forcePosition: z.union([z.literal(true), z.tuple([z.number(), z.number()])]),
        /**
         * Forces each stage of the gas to be a specific duration, in seconds.
         */
        forceDuration: z.number().optional()
    }).optional(),
    /**
     * The minimum number of teams (players in solo) that must join a game for it to start.
     */
    minTeamsToStart: z.int().positive().default(2).optional(),
    /**
     * The maximum number of players that can join a game.
     */
    maxPlayersPerGame: z.int().positive().default(80).optional(),
    /**
     * The maximum number of games that can exist at once.
     */
    maxGames: z.int().positive().default(10).optional(),
    /**
     * The number of game ticks that occur per second.
     * Overrides the value of GameConstants.tps.
     */
    tps: z.int().positive().optional(),
    /**
     * List of plugins to load.
     * Each item must correspond to the name of a file in server/src/plugins, minus the extension.
     */
    plugins: z.array(z.string()).default([]),
    /**
     * Options for the API server.
     */
    apiServer: z.object({
        url: z.url(),
        apiKey: z.string(),
        reportWebhookUrl: z.string()
    }).optional(),
    /**
     * If this option is specified, the given HTTP header will be used to determine IP addresses.
     * If using nginx with the sample config, set it to "X-Real-IP".
     * If using Cloudflare, set it to "CF-Connecting-IP".
     * If not using a reverse proxy, this option should be omitted.
     */
    ipHeader: z.string().optional(),
    /**
     * Limits the number of simultaneous connections from each IP address.
     */
    maxSimultaneousConnections: z.int().positive().optional(),
    /**
     * Limits the number of join attempts (`count`) within the given duration (`duration`, in milliseconds) from each IP address.
     */
    maxJoinAttempts: z.object({
        /**
         * The maximum number of join attempts to allow within the given `duration`.
         */
        count: z.int().positive(),
        /**
         * The amount of time (in milliseconds) during which the given number of join attempts (`count`) should be allowed.
         */
        duration: z.number().positive()
    }).optional(),
    /**
     * Limits the number of custom teams that can be created simultaneously by any one IP address.
     */
    maxCustomTeams: z.int().positive().optional(),
    /**
     * List of regexes to test usernames against.
     * If a player's username matches one of the regexes in this array, it will be replaced with the default username.
     */
    usernameFilters: z.array(z.string()).optional(),
    /**
     * Roles.
     * Each role has a different password and can give exclusive skins and cheats.
     * If `isDev` is set to true for a role, cheats will be enabled for that role.
     * To use roles, add "?password=PASSWORD&role=ROLE" (minus quotes) to the URL, for example: http://127.0.0.1:3000/?password=developr&role=developr
     * Dev cheats can be enabled using the "lobbyClearing" option (http://127.0.0.1:3000/?password=developr&role=developr&lobbyClearing=true),
     * but the server must also have it enabled (thru the \"allowLobbyClearing\" property).
     */
    roles: z.record(z.string(), z.object({
        password: z.string(),
        isDev: z.boolean().default(false).optional()
    })).optional(),
    /**
     * Determines whether dev cheats should be allowed.
     */
    allowLobbyClearing: z.boolean().optional(),
    /**
     * If true, allows things like scopes and flares to work in buildings.
     */
    disableBuildingCheck: z.boolean().optional(),
    /**
     * If true, any generated loot will be picked from a random table.
     */
    randomizeLootTables: z.boolean().optional(),
    /**
     * If present, every gun will be replaced with a random item from the given loot table.
     */
    overrideGunLootTable: z.string().optional()
});
export type ServerConfig = z.infer<typeof ServerConfig>;
