import { TeamSize } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Packet } from "./packet";

export class JoinedPacket implements Packet {
    maxTeamSize!: TeamSize;
    teamID!: number;

    emotes: Array<EmoteDefinition | undefined> = [];

    serialize(stream: SuroiBitStream): void {
        stream.writeBits(this.maxTeamSize, 3);
        if (this.maxTeamSize > TeamSize.Solo) {
            stream.writeUint8(this.teamID);
        }

        for (const emote of this.emotes) {
            Emotes.writeOptional(stream, emote);
        }
    }

    deserialize(stream: SuroiBitStream): void {
        this.maxTeamSize = stream.readBits(3);
        if (this.maxTeamSize > TeamSize.Solo) {
            this.teamID = stream.readUint8();
        }

        this.emotes = Array.from({ length: 6 }, () => Emotes.readOptional(stream));
    }
}
