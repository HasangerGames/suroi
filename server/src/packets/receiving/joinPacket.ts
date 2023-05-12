import { ReceivingPacket } from "../../types/receivingPacket";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { JoinedPacket } from "../sending/joinedPacket";

export class JoinPacket extends ReceivingPacket {
    deserialize(stream: SuroiBitStream): void {
        this.player.joined = true;
        this.player.sendPacket(new JoinedPacket(this.player));
    }
}
