import { SendingPacket } from "../../types/sendingPacket";

import { PacketType } from "../../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

export class PingPacket extends SendingPacket {
    override readonly allocBytes = 1;
    override readonly type = PacketType.Ping;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        this.game.lastPingDate = Date.now();
    }
}
