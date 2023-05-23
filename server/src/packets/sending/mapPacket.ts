import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";

export class MapPacket extends SendingPacket {
    constructor(player: Player) {
        super(player);

        this.type = PacketType.Map;
        this.allocBytes = 1 << 13;
    }

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
    }
}
