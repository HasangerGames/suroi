import { PacketType } from "../constants";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { AbstractPacket } from "./packet";

export class ReportPacket extends AbstractPacket {
    override readonly allocBytes = 25;
    readonly type = PacketType.Report;

    playerName!: string; // TODO refactor to use player ID
    reportID!: string;

    override serialize(stream: SuroiBitStream): void {
        stream.writePlayerName(this.playerName);
        stream.writeASCIIString(this.reportID, 8);
    }

    override deserialize(stream: SuroiBitStream): void {
        this.playerName = stream.readPlayerName();
        this.reportID = stream.readASCIIString(8);
    }
}
