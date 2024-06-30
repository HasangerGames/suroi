import { GameConstants } from "../constants";
import { Badges, type BadgeDefinition } from "../definitions/badges";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { Loots } from "../definitions/loots";
import { type SkinDefinition } from "../definitions/skins";
import { createPacket } from "./packet";

export type JoinPacketData = {
    readonly protocolVersion: number
    readonly name: string
    readonly isMobile: boolean

    readonly skin: SkinDefinition
    readonly badge?: BadgeDefinition

    readonly emotes: ReadonlyArray<EmoteDefinition | undefined>
};

// protocol version is automatically set; use this type when
// creating an object for use by a JoinPacket
export type JoinPacketCreation = Omit<JoinPacketData, "protocolVersion">;

export const JoinPacket = createPacket("JoinPacket")<JoinPacketCreation, JoinPacketData>({
    serialize(stream, data) {
        stream.writeUint16(GameConstants.protocolVersion);
        stream.writePlayerName(data.name);
        stream.writeBoolean(data.isMobile);

        Loots.writeToStream(stream, data.skin);
        Badges.writeOptional(stream, data.badge);

        for (const emote of data.emotes) {
            Emotes.writeOptional(stream, emote);
        }
    },

    deserialize(stream) {
        return {
            protocolVersion: stream.readUint16(),
            name: stream.readPlayerName().replaceAll(/<[^>]+>/g, "").trim(), // Regex strips out HTML
            isMobile: stream.readBoolean(),

            skin: Loots.readFromStream(stream),
            badge: Badges.readOptional(stream),

            emotes: Array.from({ length: 6 }, () => Emotes.readOptional(stream))
        };
    }
});
