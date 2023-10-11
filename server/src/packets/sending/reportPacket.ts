import { PacketType } from "../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";
import { SendingPacket } from "../../types/sendingPacket";

export class ReportPacket extends SendingPacket {
    override readonly allocBytes = 53;
    override readonly type = PacketType.Report;
    readonly reportedName: string;
    readonly reportID: string;

    constructor(player: Player, reportedName: string, reportID: string) {
        super(player);
        this.reportedName = reportedName;
        this.reportID = reportID;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        stream.writePlayerName(this.reportedName);
        stream.writeASCIIString(this.reportID, 36);
    }
}
