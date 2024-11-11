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
        const emotes = data.emotes;
        const hasBadge = data.badge !== undefined;
        stream.writeBooleanGroup(
            data.isMobile,
            hasBadge,
            emotes[0] !== undefined,
            emotes[1] !== undefined,
            emotes[2] !== undefined,
            emotes[3] !== undefined,
            emotes[4] !== undefined,
            emotes[5] !== undefined
        );

        stream.writeUint16(GameConstants.protocolVersion);
        stream.writePlayerName(data.name);

        Loots.writeToStream(stream, data.skin);

        if (hasBadge) {
            Badges.writeToStream(stream, data.badge);
        }

        for (let i = 0; i < 6; i++) {
            const emote = emotes[i];
            if (emote !== undefined) {
                Emotes.writeToStream(stream, emote);
            }
        }
    },

    deserialize(stream) {
        const [
            isMobile,
            hasBadge,
            ...emotes
        ] = stream.readBooleanGroup();

        return {
            protocolVersion: stream.readUint16(),
            name: stream.readPlayerName().replaceAll(/<[^>]+>/g, "").trim(), // Regex strips out HTML
            isMobile,

            skin: Loots.readFromStream(stream),
            badge: hasBadge ? Badges.readFromStream(stream) : undefined,

            emotes: Array.from({ length: 6 }, (_, i) => emotes[i] ? Emotes.readFromStream(stream) : undefined)
        };
    }
});
