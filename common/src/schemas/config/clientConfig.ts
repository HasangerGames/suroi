import z from "zod";
import { Region, UrlNoTrailingSlash } from "../misc";

export const ClientConfig = z.object({
    forceMobile: z.boolean(),
    uiDebugMode: z.boolean(),
    defaultRegion: Region,
    regions: z.record(Region, z.object({
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
    })),
    /**
     * Limits the number of custom teams that can be created simultaneously by any one IP address.
     */
    maxCustomTeams: z.int().positive().optional(),
});
export type ClientConfig = z.infer<typeof ClientConfig>;
