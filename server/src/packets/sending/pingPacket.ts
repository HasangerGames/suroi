import { SendingPacket } from "../../types/sendingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";

export class PingPacket extends SendingPacket {
    override readonly allocBytes = 1;
    override readonly type = PacketType.Ping;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
    }
}
