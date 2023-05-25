import { SendingPacket } from "../../types/sendingPacket";

import { PacketType } from "../../../../../common/src/constants";

export class JoinPacket extends SendingPacket {
    override readonly allocBytes = 1;
    override readonly type = PacketType.Join;
}
