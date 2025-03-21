import { GameConstants } from "../constants";
import { Badges, type BadgeDefinition } from "../definitions/badges";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { type SkinDefinition } from "../definitions/items/skins";
import { Loots } from "../definitions/loots";
import { Packet, PacketType } from "./packet";

export interface JoinData {
    readonly type: PacketType.Join
    readonly protocolVersion: number
    readonly name: string
    readonly isMobile: boolean

    readonly skin: SkinDefinition
    readonly badge?: BadgeDefinition

    readonly emotes: ReadonlyArray<EmoteDefinition | undefined>
}

// protocol version is automatically set; use this type when
// creating an object for use by a JoinPacket
export type JoinPacketCreation = Omit<JoinData, "protocolVersion">;

export const JoinPacket = new Packet<JoinPacketCreation, JoinData>(PacketType.Join, {
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

    deserialize(stream, data) {
        const [
            isMobile,
            hasBadge,
            ...emotes
        ] = stream.readBooleanGroup();
        data.isMobile = isMobile;

        data.protocolVersion = stream.readUint16();
        data.name = stream.readPlayerName().replaceAll(/<[^>]+>/g, "").trim(); // Regex strips out HTML

        data.skin = Loots.readFromStream(stream);

        if (hasBadge) {
            data.badge = Badges.readFromStream(stream);
        }

        data.emotes = new Array(6);
        for (let i = 0; i < 6; i++) {
            if (emotes[i]) data.emotes[i] = Emotes.readFromStream(stream);
        }
    }
});
