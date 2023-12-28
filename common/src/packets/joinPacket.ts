import { PacketType } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { Loots } from "../definitions/loots";
import { type SkinDefinition } from "../definitions/skins";
import { type SpawnMeleeDefinition } from "../definitions/melees";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class JoinPacket extends Packet {
    override readonly allocBytes = 24;
    override readonly type = PacketType.Join;

    name!: string;
    isMobile!: boolean;

    skin!: SkinDefinition;
    melee!: SpawnMeleeDefinition;
    emotes: EmoteDefinition[] = [];

    serialize(): void {
        super.serialize();
        const stream = this.stream;

        stream.writePlayerName(this.name);
        stream.writeBoolean(this.isMobile);

        Loots.writeToStream(stream, this.skin);
        Loots.writeToStream(stream, this.melee);

        for (const emote of this.emotes) {
            Emotes.writeToStream(stream, emote);
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        this.name = stream
            .readPlayerName()
            .replaceAll(/<[^>]+>/g, "")
            .trim(); // Regex strips out HTML

        this.isMobile = stream.readBoolean();
        this.skin = Loots.readFromStream(stream);
        this.melee = Loots.readFromStream(stream);

        for (let i = 0; i < 4; i++) {
            this.emotes.push(Emotes.readFromStream(stream));
        }
    }
}
