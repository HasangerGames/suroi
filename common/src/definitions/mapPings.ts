import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface MapPingDefinition extends ObjectDefinition {
    /**
     * Color to tint the ping sprite and color the map pulse effect
     */
    color: number
    /**
     * If the ping sprite will be added to the game camera
     */
    showInGame: boolean
    /**
     * For how many seconds the ping will appear, in seconds
     */
    lifeTime: number
    /**
     * If the ping is a player ping
     * When set to true it will send the player that sent the ping to clients;
     * delete previous pings from that player in the client
     * And use the player teammate color instead of definition color
     */
    isPlayerPing: boolean

    sound?: string
}

export const MapPings = ObjectDefinitions.create<MapPingDefinition>()(
    () => ({
        gamePingFactory: (idString: string, color: number) => ({
            idString,
            color,
            name: idString,
            showInGame: false,
            lifeTime: 10,
            isPlayerPing: false,
            sound: idString
        }),
        playerPingFactory: (idString: string) => ({
            idString,
            name: idString,
            showInGame: true,
            lifeTime: 120,
            isPlayerPing: true,
            color: 0xffffff,
            sound: idString
        })
    })
)(
    apply => [
        apply("gamePingFactory", {}, "airdrop_ping", 0x00ffff),
        apply("playerPingFactory", {}, "arrow_ping"),
        apply("playerPingFactory", {}, "gift_ping"),
        apply("playerPingFactory", {}, "warning_ping"),
        apply("playerPingFactory", {}, "heal_ping")
    ]
);
