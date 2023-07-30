import { ReceivingPacket } from "../../types/receivingPacket";
import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

export class ReportPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const playerName = stream.readPlayerName();
        const reportID = stream.readASCIIString(36);
        const copyToClipboard = confirm(`Report created successfully!
Player name: ${playerName}
Report ID: ${reportID}
Would you like to copy the report ID to the clipboard?`);
        if (copyToClipboard) {
            alert(`Report ID copied to clipboard.
To submit your report, make a post in the #hacker-reports channel on the Discord, with a video of the hacker and the report ID.`);
            setTimeout(() => {
                void navigator.clipboard.writeText(reportID);
            }, 1000);
        }
    }
}
