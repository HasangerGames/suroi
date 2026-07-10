import * as z from "zod";

export const ClientConfig = z.strictObject({
    $schema: z.literal("config.schema.json"),
    forceMobile: z.boolean().default(false),
    uiDebugMode: z.boolean().default(false),
    defaultRegion: z.string().default("dev"),
    regions: z.record(z.string(), z.strictObject({
        /**
         * An emoji flag to display alongside the region name.
         */
        flag: z.string(),
        /**
         * The address of the region's main server.
         */
        mainAddress: z.url(),
        /**
         * Pattern used to determine the address of the region's game servers.
         * The string `<gameID>` is replaced by the `gameID` given by the /getGame API, plus `offset`.
         * For example, if `gameID` is 0, `gameAddress` is `"wss://na.suroi.io/game/<gameID>"`, and `offset` is 1, the resulting address will be wss://na.suroi.io/game/1.
         */
        gameAddress: z.url(),
        /**
         * Number to increment `gameID` by when determining the game address. See `gameAddress` for more info.
         */
        offset: z.number()
    })).default({
        "dev": {
            "flag": "🏠",
            "mainAddress": "http://127.0.0.1:8000",
            "gameAddress": "ws://127.0.0.1:<gameID>",
            "offset": 8001
        },
        "na": {
            "flag": "🇺🇸",
            "mainAddress": "https://na.suroi.io",
            "gameAddress": "wss://na.suroi.io/game/<gameID>",
            "offset": 1
        },
        "eu": {
            "flag": "🇩🇪",
            "mainAddress": "https://eu.suroi.io",
            "gameAddress": "wss://eu.suroi.io/game/<gameID>",
            "offset": 1
        },
        "sa": {
            "flag": "🇧🇷",
            "mainAddress": "https://sa.suroi.io",
            "gameAddress": "wss://sa.suroi.io/game/<gameID>",
            "offset": 1
        },
        "as": {
            "flag": "🇭🇰",
            "mainAddress": "https://as.suroi.io",
            "gameAddress": "wss://as.suroi.io/game/<gameID>",
            "offset": 1
        },
        "oc": {
            "flag": "🇦🇺",
            "mainAddress": "https://oc.suroi.io",
            "gameAddress": "wss://oc.suroi.io/game/<gameID>",
            "offset": 1
        }
    })
});

export type ClientConfig = z.infer<typeof ClientConfig>;
