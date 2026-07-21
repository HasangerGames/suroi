import * as z from "zod";
import { Region, UrlNoTrailingSlash } from "../misc";

export const ClientConfig = z.strictObject({
    $schema: z.literal("config.schema.json"),
    forceMobile: z.boolean().default(false),
    uiDebugMode: z.boolean().default(false),
    defaultRegion: Region.default("dev"),
    regions: z.record(Region, z.strictObject({
        /**
         * An emoji flag to display alongside the region name.
         */
        flag: z.string(),
        /**
         * The address of the region's main server. May not end with a trailing slash.
         */
        mainAddress: UrlNoTrailingSlash,
        /**
         * The address of the region's game servers. May not end with a trailing slash.
         */
        gameAddress: UrlNoTrailingSlash
    })).default({
        "dev": {
            "flag": "🏠",
            "mainAddress": "http://127.0.0.1:42084",
            "gameAddress": "ws://127.0.0.1"
        },
        // "na": {
        //     "flag": "🇺🇸",
        //     "mainAddress": "https://na.suroi.io",
        //     "gameAddress": "wss://na.suroi.io"
        // },
        // "eu": {
        //     "flag": "🇩🇪",
        //     "mainAddress": "https://eu.suroi.io",
        //     "gameAddress": "wss://eu.suroi.io"
        // },
        // "sa": {
        //     "flag": "🇧🇷",
        //     "mainAddress": "https://sa.suroi.io",
        //     "gameAddress": "wss://sa.suroi.io"
        // },
        // "as": {
        //     "flag": "🇭🇰",
        //     "mainAddress": "https://as.suroi.io",
        //     "gameAddress": "wss://as.suroi.io"
        // }
    })
});

export type ClientConfig = z.infer<typeof ClientConfig>;
