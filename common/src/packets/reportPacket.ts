import { Packet } from "./packet.js";
import { PacketType } from "../constants.js";
import { type SuroiBitStream } from "../utils/suroiBitStream.js";

export class ReportPacket extends Packet {
    readonly allocBytes = 25;
    readonly type = PacketType.Report;

    playerName!: string; // TODO refactor to use player ID
    reportID!: string;

    override serialize(): void {
        super.serialize();
        this.stream.writePlayerName(this.playerName);
        this.stream.writeASCIIString(this.reportID, 8);
    }

    override deserialize(stream: SuroiBitStream): void {
        this.playerName = stream.readPlayerName();
        this.reportID = stream.readASCIIString(8);
    }
}
