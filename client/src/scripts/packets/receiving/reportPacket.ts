import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";

export class ReportPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        $("#btn-copy-report-id").html('<i class="fa-regular fa-clipboard"></i> Copy');
        $("#reporting-name").text(stream.readPlayerName());
        $("#report-id-input").val(stream.readASCIIString(36));
        $("#report-modal").fadeIn(250);
    }
}
