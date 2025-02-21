import { type TeamSize } from "@common/constants";
import type { Mode } from "@common/definitions/modes";

export const Config = {
    regions: {
        dev: {
            name: "Local Server",
            address: "http://127.0.0.1:8000"
        },
        na: {
            name: "North America",
            address: "https://na.suroi.io"
        },
        eu: {
            name: "Europe",
            address: "https://eu.suroi.io"
        },
        sa: {
            name: "South America",
            address: "https://sa.suroi.io"
        },
        as: {
            name: "Asia",
            address: "https://as.suroi.io"
        }
    },
    defaultRegion: "na"
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
     * The address of the region's server.
     */
    readonly address: string
}

export interface ServerInfo {
    readonly protocolVersion: number
    readonly playerCount: number
    readonly teamSize: TeamSize
    readonly teamSizeSwitchTime: number
    readonly mode: Mode
    readonly modeSwitchTime: number
}
