import { GameConstants, PacketType } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class JoinedPacket extends Packet {
    override readonly allocBytes = 34;
    override readonly type = PacketType.Joined;

    protocolVersion!: number;

    teamID!: number;
    emotes: Array<EmoteDefinition | undefined> = [];

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

        stream.writeUint16(GameConstants.protocolVersion);

        for (const emote of this.emotes) {
            Emotes.writeOptional(stream, emote);
        }

        stream.writeBits(this.teamID, 6);
    }

    override deserialize(stream: SuroiBitStream): void {
        this.protocolVersion = stream.readUint16();

        this.emotes = Array.from({ length: 6 }, () => Emotes.readOptional(stream));

        this.teamID = stream.readBits(6);
    }
}
