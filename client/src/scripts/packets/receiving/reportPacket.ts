import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";

export class ReportPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        $("#reporting-name").text(stream.readPlayerName());
        $("#report-id").text(stream.readASCIIString(8));
        $("#report-modal").fadeIn(250);
    }
}
