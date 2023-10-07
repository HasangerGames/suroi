import { PacketType } from "../../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";

export class PingPacket extends SendingPacket {
    override readonly allocBytes = 1;
    override readonly type = PacketType.Ping;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        this.game.lastPingDate = Date.now();
    }
}
