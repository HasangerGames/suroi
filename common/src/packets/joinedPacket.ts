import { GameConstants, PacketType } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class JoinedPacket extends Packet {
    override readonly allocBytes = 34;
    override readonly type = PacketType.Joined;

    protocolVersion!: number;

    emotes: EmoteDefinition[] = [];

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

        stream.writeUint16(GameConstants.protocolVersion);

        for (const emote of this.emotes) {
            Emotes.writeToStream(stream, emote);
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        this.protocolVersion = stream.readUint16();

        for (let i = 0; i < 6; i++) {
            this.emotes.push(Emotes.readFromStream(stream));
        }

        for (let i = 0; i < 4; i++) {
            if (this.emotes[i].idString === "none") {
                this.emotes = [
                    Emotes.fromString("happy_face"),
                    Emotes.fromString("thumbs_up"),
                    Emotes.fromString("suroi_logo"),
                    Emotes.fromString("sad_face"),
                    Emotes.fromString("none"),
                    Emotes.fromString("none")
                ];
                break;
            }
        }
    }
}
