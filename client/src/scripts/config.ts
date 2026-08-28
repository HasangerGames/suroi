import { type TeamMode } from "@common/constants";
import type { ModeName } from "@common/definitions/modes";

export const Config = {
    regions: {
        dev: {
            name: "Local Server",
            mainAddress: "http://127.0.0.1:8000",
            gameAddress: "ws://127.0.0.1:<gameID>",
            offset: 8001
        }/* ,
        na: {
            name: "North America",
            flag: "🇺🇸 ",
            mainAddress: "https://na.suroi.io",
            gameAddress: "wss://na.suroi.io/game/<gameID>",
            offset: 1
        },
        eu: {
            name: "Europe",
            flag: "🇩🇪 ",
            mainAddress: "https://eu.suroi.io",
            gameAddress: "wss://eu.suroi.io/game/<gameID>",
            offset: 1
        },
        sa: {
            name: "South America",
            flag: "🇧🇷 ",
            mainAddress: "https://sa.suroi.io",
            gameAddress: "wss://sa.suroi.io/game/<gameID>",
            offset: 1
        },
        as: {
            name: "Asia",
            flag: "🇭🇰 ",
            mainAddress: "https://as.suroi.io",
            gameAddress: "wss://as.suroi.io/game/<gameID>",
            offset: 1
        },
        oc: {
            name: "Oceania",
            flag: "🇦🇺 ",
            mainAddress: "https://oc.suroi.io",
            gameAddress: "wss://oc.suroi.io/game/<gameID>",
            offset: 1
        } */
    },
    defaultRegion: "dev"
} satisfies ConfigType as ConfigType;

export interface ConfigType {
    readonly regions: Record<string, Region>
    readonly defaultRegion: string
}

export interface Region {
    /**
     * The human-readable name of the region, displayed in the server selector.
     */
    readonly name: string

    /**
     * An emoji flag to display alongside the region name.
     */
    readonly flag?: string

    /**
     * The address of the region's main server.
     */
    readonly mainAddress: string

    /**
     * Pattern used to determine the address of the region's game servers.
     * The string `<gameID>` is replaced by the `gameID` given by the /getGame API, plus {@linkcode offset}.
     * For example, if `gameID` is 0, `gameAddress` is `"wss://na.suroi.io/game/<gameID>"`, and `offset` is 1, the resulting address will be wss://na.suroi.io/game/1.
     */
    readonly gameAddress: string

    /**
     * Number to increment `gameID` by when determining the game address. See {@linkcode gameAddress} for more info.
     */
    readonly offset: number
}

export interface ServerInfo {
    readonly protocolVersion: number
    readonly playerCount: number
    readonly teamMode: TeamMode
    readonly teamModeSwitchTime: number
    readonly mode: ModeName
    readonly modeSwitchTime: number
}

export interface ClientConfig {
    readonly regions: Record<string, Region>
    readonly defaultRegion: string
}

/**
 * Loads an optional external config (`clientConfig.json`, served alongside the static files)
 * so region/server addresses can be changed without rebuilding the client.
 * Falls back to the bundled defaults on any failure.
 */
export async function loadClientConfig(): Promise<void> {
    try {
        const response = await fetch("/clientConfig.json", { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
            console.warn(`loadClientConfig: clientConfig.json responded with status ${response.status}; using bundled default config.`);
            return;
        }

        const clientConfig = await response.json() as Partial<ClientConfig>;
        if (!clientConfig.regions || typeof clientConfig.regions !== "object") {
            console.warn("loadClientConfig: clientConfig.json contains no valid 'regions'; using bundled default config.");
            return;
        }

        // Update the shared Config object in place so existing references
        // (e.g. `regionInfo` in ui.ts) stay valid.
        const merged: Record<string, Region> = { ...Config.regions, ...clientConfig.regions };
        const regions = Config.regions as { [k: string]: Region | undefined };
        for (const key of Object.keys(regions)) {
            if (Object.hasOwn(merged, key)) regions[key] = merged[key];
            else delete regions[key];
        }

        if (clientConfig.defaultRegion) {
            (Config as ConfigType & { defaultRegion: string }).defaultRegion = clientConfig.defaultRegion;
        }
    } catch (e) {
        console.warn("loadClientConfig: failed to load clientConfig.json; using bundled default config.", e);
    }
}
