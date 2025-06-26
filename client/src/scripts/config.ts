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
            mainAddress: "https://na.suroi.io",
            gameAddress: "wss://na.suroi.io/game/<gameID>",
            offset: 1
        },
        eu: {
            name: "Europe",
            mainAddress: "https://eu.suroi.io",
            gameAddress: "wss://eu.suroi.io/game/<gameID>",
            offset: 1
        },
        sa: {
            name: "South America",
            mainAddress: "https://sa.suroi.io",
            gameAddress: "wss://sa.suroi.io/game/<gameID>",
            offset: 1
        },
        as: {
            name: "Asia",
            mainAddress: "https://as.suroi.io",
            gameAddress: "wss://as.suroi.io/game/<gameID>",
            offset: 1
        },
        oc: {
            name: "Oceania",
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
