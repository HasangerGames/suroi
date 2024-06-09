import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface MapPingDefinition extends ObjectDefinition {
    /**
     * Color to tint the ping sprite and color the map pulse effect
     */
    readonly color: number
    /**
     * If the ping sprite will be added to the game camera
     */
    readonly showInGame: boolean
    /**
     * For how many seconds the ping will appear, in seconds
     */
    readonly lifetime: number
    /**
     * If the ping is a player ping
     *
     * When set to `true`, clients will be informed of the pinging player,
     * the player's teammate color will be used instead of definition color,
     * any previous pings from that player will be removed
     */
    readonly isPlayerPing: boolean
    readonly ignoreExpiration: boolean
    readonly sound?: string
}

export type PlayerPing = MapPingDefinition & { readonly isPlayerPing: true };
export type MapPing = MapPingDefinition & { readonly isPlayerPing?: false };

export const MapPings = ObjectDefinitions.create<MapPingDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            ignoreExpiration: false
        }),
        gamePingFactory: (idString: string, color: number) => ({
            idString,
            color,
            name: idString,
            showInGame: false,
            lifetime: 20,
            isPlayerPing: false,
            sound: idString
        }),
        playerPingFactory: (idString: string) => ({
            idString,
            name: idString,
            showInGame: true,
            lifetime: 120,
            isPlayerPing: true,
            color: 0xffffff,
            sound: idString
        })
    })
)(
    apply => [
        apply("gamePingFactory", { ignoreExpiration: true }, "airdrop_ping", 0x00ffff),
        apply("playerPingFactory", {}, "warning_ping"),
        apply("playerPingFactory", { ignoreExpiration: true }, "arrow_ping"),
        apply("playerPingFactory", {}, "gift_ping"),
        apply("playerPingFactory", {}, "heal_ping")
    ]
);
