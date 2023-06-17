import { ReceivingPacket } from "../../types/receivingPacket";
import { PingPacket } from "../sending/pingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

export class PingedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const ping = Date.now() - this.playerManager.game.lastPingDate;
        $("#ping-counter").text(`${ping} ms`);
        setTimeout((): void => {
            this.playerManager.game.sendPacket(new PingPacket(this.playerManager));
        }, 5000);
    }
}
