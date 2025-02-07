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

const gamePingFactory = (idString: string, color: number, ignoreExpiration = false): MapPing => ({
    idString,
    name: idString,
    showInGame: false,
    ignoreExpiration,
    lifetime: 20,
    isPlayerPing: false,
    color,
    sound: idString
});

const playerPingFactory = (idString: string, ignoreExpiration = false): PlayerPing => ({
    idString,
    name: idString,
    showInGame: true,
    ignoreExpiration,
    lifetime: 120,
    isPlayerPing: true,
    color: 0xffffff,
    sound: idString
});

export const MapPings = new ObjectDefinitions<MapPingDefinition>([
    gamePingFactory("airdrop_ping", 0x00ffff, true),
    playerPingFactory("warning_ping"),
    playerPingFactory("arrow_ping", true),
    playerPingFactory("gift_ping"),
    playerPingFactory("heal_ping")
]);
