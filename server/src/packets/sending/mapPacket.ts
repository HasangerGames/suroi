import { SendingPacket } from "../../types/sendingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";

export class MapPacket extends SendingPacket {
    override readonly allocBytes = 1 << 13;
    override readonly type = PacketType.Map;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
    }
}
