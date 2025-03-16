import { type TeamSize } from "@common/constants";
import type { Mode } from "@common/definitions/modes";

export const Config = {
    regions: {
        dev: {
            name: "Local Server",
            mainAddress: "http://127.0.0.1:8000",
            gameAddress: "ws://127.0.0.1:800<ID>"
        }/* ,
        na: {
            name: "North America",
            mainAddress: "https://na.suroi.io",
            gameAddress: "wss://na.suroi.io/game/<ID>"
        },
        eu: {
            name: "Europe",
            mainAddress: "https://eu.suroi.io",
            gameAddress: "wss://eu.suroi.io/game/<ID>"
        },
        sa: {
            name: "South America",
            mainAddress: "https://sa.suroi.io",
            gameAddress: "wss://sa.suroi.io/game/<ID>"
        },
        as: {
            name: "Asia",
            mainAddress: "https://as.suroi.io",
            gameAddress: "wss://as.suroi.io/game/<ID>"
        },
        oc: {
            name: "Oceania",
            mainAddress: "https://oc.suroi.io",
            gameAddress: "wss://oc.suroi.io/game/<ID>"
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
     * The address of the region's main server.
     */
    readonly mainAddress: string

    /**
     * Pattern used to determine the address of the region's game servers.
     * The string <ID> is replaced by the gameID given by the /getGame API, plus one.
     * For example, if gameID is 0, and gameAddress is "ws://127.0.0.1:800<ID>", the resulting address will be ws://127.0.0.1:8001.
     */
    readonly gameAddress: string
}

export interface ServerInfo {
    readonly protocolVersion: number
    readonly playerCount: number
    readonly teamSize: TeamSize
    readonly teamSizeSwitchTime: number
    readonly mode: Mode
    readonly modeSwitchTime: number
}
