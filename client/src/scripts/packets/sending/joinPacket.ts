import { SendingPacket } from "../../types/sendingPacket";

import { PacketType } from "../../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

export class JoinPacket extends SendingPacket {
    override readonly allocBytes = 4;
    override readonly type = PacketType.Join;

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        stream.writeBoolean(this.playerManager.isMobile);
    }
}
