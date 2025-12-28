import { type TeamMode } from "@common/constants";
import type { ModeName } from "@common/definitions/modes";

// In Render/Production, the server URL is single (no separate game ports)
// We use a placeholder here or a helper to determine the URL.
// Since the user is deploying to Render, we can assume a single endpoint structure.

export const Config = {
    regions: {
        dev: {
            name: "Local Server",
            mainAddress: "http://127.0.0.1:8000",
            gameAddress: "ws://127.0.0.1:<gameID>",
            offset: 8001
        },
        render: {
            name: "Suroi Server (Render)",
            flag: "☁️ ",
            // The user must replace this URL with their actual Render URL
            mainAddress: "https://miro-io.onrender.com",
            // On Render (single port), we route everything through the main address.
            // The server logic must be updated to handle "/play" on the main port.
            // If the server doesn't support single-port mode yet, this config assumes it does.
            // For now, we point to the main address.
            gameAddress: "wss://miro-io.onrender.com",
            offset: 0 // No offset needed for single-port
        }
    },
    defaultRegion: "render"
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
