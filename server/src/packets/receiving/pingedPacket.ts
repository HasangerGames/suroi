import { ReceivingPacket } from "../../types/receivingPacket";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PingPacket } from "../sending/pingPacket";

export class PingedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        this.player.sendPacket(new PingPacket(this.player));
    }
}
