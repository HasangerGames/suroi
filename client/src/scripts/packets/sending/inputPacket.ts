import { SendingPacket } from "../../types/sendingPacket";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../../common/src/constants";

export class InputPacket extends SendingPacket {
    override readonly allocBytes = 4;
    override readonly type = PacketType.Input;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        const player = this.playerManager;
        stream.writeBoolean(player.movement.up);
        stream.writeBoolean(player.movement.down);
        stream.writeBoolean(player.movement.left);
        stream.writeBoolean(player.movement.right);
        stream.writeBoolean(player.attacking);
        stream.writeBits(player.activeItemIndex, 2);
        stream.writeBoolean(player.turning);
        if (player.turning) {
            stream.writeRotation(player.rotation, 16);
        }
    }
}
