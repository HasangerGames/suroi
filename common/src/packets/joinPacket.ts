import { GameConstants } from "../constants";
import { Badges, type BadgeDefinition } from "../definitions/badges";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { Loots } from "../definitions/loots";
import { type SkinDefinition } from "../definitions/skins";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Packet } from "./packet";

export class JoinPacket implements Packet {
    protocolVersion = GameConstants.protocolVersion;
    name!: string;
    isMobile!: boolean;

    skin!: SkinDefinition;
    badge?: BadgeDefinition;

    emotes: Array<EmoteDefinition | undefined> = [];

    serialize(stream: SuroiBitStream): void {
        stream.writeUint16(this.protocolVersion);
        stream.writePlayerName(this.name);
        stream.writeBoolean(this.isMobile);

        Loots.writeToStream(stream, this.skin);
        Badges.writeOptional(stream, this.badge);

        for (const emote of this.emotes) {
            Emotes.writeOptional(stream, emote);
        }
    }

    deserialize(stream: SuroiBitStream): void {
        this.protocolVersion = stream.readUint16();
        this.name = stream.readPlayerName().replaceAll(/<[^>]+>/g, "").trim(); // Regex strips out HTML
        this.isMobile = stream.readBoolean();

        this.skin = Loots.readFromStream(stream);
        this.badge = Badges.readOptional(stream);

        this.emotes = Array.from({ length: 6 }, () => Emotes.readOptional(stream));
    }
}
