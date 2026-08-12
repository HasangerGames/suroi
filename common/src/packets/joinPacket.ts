import { type BadgeDefinition, Badges } from "../definitions/badges";
import { type EmoteDefinition, Emotes } from "../definitions/emotes";
import { type SkinDefinition } from "../definitions/items/skins";
import { Loots } from "../definitions/loots";
import { Packet, PacketType } from "./packet";

export interface JoinData {
    readonly type: PacketType.Join
    readonly gameVersion: string
    readonly name: string
    readonly isMobile: boolean

    readonly skin: SkinDefinition
    readonly badge?: BadgeDefinition

    readonly emotes: ReadonlyArray<EmoteDefinition | undefined>
}

export const JoinPacket = new Packet<JoinData>(PacketType.Join, {
    serialize(stream, data) {
        const emotes = data.emotes;
        const hasBadge = data.badge !== undefined;
        stream.writeBooleanGroup2(
            data.isMobile,
            hasBadge,
            emotes[0] !== undefined,
            emotes[1] !== undefined,
            emotes[2] !== undefined,
            emotes[3] !== undefined,
            emotes[4] !== undefined,
            emotes[5] !== undefined,
            emotes[6] !== undefined,
            emotes[7] !== undefined
        );

        stream.writeString(9, data.gameVersion);
        stream.writePlayerName(data.name);

        Loots.writeToStream(stream, data.skin);

        if (hasBadge) {
            Badges.writeToStream(stream, data.badge);
        }

        for (let i = 0; i < 8; i++) {
            const emote = emotes[i];
            if (emote === undefined) continue;
            Emotes.writeToStream(stream, emote);
        }
    },

    deserialize(stream, data) {
        const [
            isMobile,
            hasBadge,
            ...emotes
        ] = stream.readBooleanGroup2();
        data.isMobile = isMobile;

        data.gameVersion = stream.readString(9);
        data.name = stream.readPlayerName().split(/<[^>]+>/g).join("").trim(); // Regex strips out HTML

        data.skin = Loots.readFromStream(stream);

        if (hasBadge) {
            data.badge = Badges.readFromStream(stream);
        }

        data.emotes = new Array(8);
        for (let i = 0; i < 8; i++) {
            if (!emotes[i]) continue;
            data.emotes[i] = Emotes.readFromStream(stream);
        }
    }
});
