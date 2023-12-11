import { GameConstants, PacketType } from "../constants.js";
import { type EmoteDefinition, Emotes } from "../definitions/emotes.js";
import { type SuroiBitStream } from "../utils/suroiBitStream.js";
import { Packet } from "./packet.js";

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

        for (let i = 0; i < 4; i++) {
            this.emotes.push(Emotes.readFromStream(stream));
        }
    }
}
