import { DefinitionType, type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface MapPingDefinition extends ObjectDefinition {
    readonly defType: DefinitionType.MapPing
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

const gamePing = (idString: string, color: number, ignoreExpiration = false): MapPing => ({
    idString,
    name: idString,
    defType: DefinitionType.MapPing,
    showInGame: false,
    ignoreExpiration,
    lifetime: 20,
    isPlayerPing: false,
    color,
    sound: idString
});

const playerPing = (idString: string, ignoreExpiration = false): PlayerPing => ({
    idString,
    name: idString,
    defType: DefinitionType.MapPing,
    showInGame: true,
    ignoreExpiration,
    lifetime: 120,
    isPlayerPing: true,
    color: 0xffffff,
    sound: idString
});

export const MapPings = new ObjectDefinitions<MapPingDefinition>([
    gamePing("airdrop_ping", 0x00ffff, true),
    playerPing("arrow_ping", true),
    playerPing("gift_ping"),
    playerPing("heal_ping"),
    playerPing("warning_ping")
]);
