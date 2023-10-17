import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";
import { PingPacket } from "../sending/pingPacket";

export class PingedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const ping = Date.now() - this.game.lastPingDate;
        $("#ping-counter").text(`${ping} ms`);
        setTimeout((): void => {
            this.game.sendPacket(new PingPacket(this.playerManager));
        }, 5000);
    }
}
