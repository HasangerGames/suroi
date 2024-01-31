import { GameConstants, PacketType } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class JoinedPacket extends Packet {
    override readonly allocBytes = 34;
    override readonly type = PacketType.Joined;

    protocolVersion!: number;

    emotes: EmoteDefinition[] = [];
    tid: number = 0;

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

        stream.writeUint16(GameConstants.protocolVersion);

        for (const emote of this.emotes) {
            Emotes.writeToStream(stream, emote);
        }

        stream.writeUint16(this.tid);
    }

    override deserialize(stream: SuroiBitStream): void {
        this.protocolVersion = stream.readUint16();

        for (let i = 0; i < 4; i++) {
            this.emotes.push(Emotes.readFromStream(stream));
        }

        this.tid = stream.readUint16();
    }
}
