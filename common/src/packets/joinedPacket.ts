import { TeamSize } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class JoinedPacket extends Packet {
    maxTeamSize!: number;
    teamID!: number;

    emotes: Array<EmoteDefinition | undefined> = [];

    override serialize(stream: SuroiBitStream): void {
        stream.writeBits(this.maxTeamSize, 2);
        if (this.maxTeamSize > TeamSize.Solo) {
            stream.writeUint8(this.teamID);
        }

        for (const emote of this.emotes) {
            Emotes.writeOptional(stream, emote);
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        this.maxTeamSize = stream.readBits(2);
        if (this.maxTeamSize > TeamSize.Solo) {
            this.teamID = stream.readUint8();
        }

        this.emotes = Array.from({ length: 6 }, () => Emotes.readOptional(stream));
    }
}
