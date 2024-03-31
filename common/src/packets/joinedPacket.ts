import { GameConstants, PacketType, TeamSize } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { AbstractPacket } from "./packet";

export class JoinedPacket extends AbstractPacket {
    override readonly allocBytes = 34;
    override readonly type = PacketType.Joined;

    protocolVersion!: number;

    maxTeamSize!: number;
    teamID!: number;

    emotes: Array<EmoteDefinition | undefined> = [];

    override serialize(stream: SuroiBitStream): void {
        stream.writeUint16(GameConstants.protocolVersion);

        stream.writeBits(this.maxTeamSize, 2);
        if (this.maxTeamSize > TeamSize.Solo) {
            stream.writeBits(this.teamID, 6);
        }

        for (const emote of this.emotes) {
            Emotes.writeOptional(stream, emote);
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        this.protocolVersion = stream.readUint16();

        this.maxTeamSize = stream.readBits(2);
        if (this.maxTeamSize > TeamSize.Solo) {
            this.teamID = stream.readBits(6);
        }

        this.emotes = Array.from({ length: 6 }, () => Emotes.readOptional(stream));
    }
}
