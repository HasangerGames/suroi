import { type SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class ReportPacket implements Packet {
    playerName!: string; // TODO refactor to use player ID
    reportID!: string;

    serialize(stream: SuroiBitStream): void {
        stream.writePlayerName(this.playerName);
        stream.writeASCIIString(this.reportID, 8);
    }

    deserialize(stream: SuroiBitStream): void {
        this.playerName = stream.readPlayerName();
        this.reportID = stream.readASCIIString(8);
    }
}
