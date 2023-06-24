import { SendingPacket } from "../../types/sendingPacket";

import {
    PacketType,
    InputActions,
    INPUT_ACTIONS_BITS
} from "../../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

export class InputPacket extends SendingPacket {
    override readonly allocBytes = 16;
    override readonly type = PacketType.Input;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        const player = this.playerManager;
        stream.writeBoolean(player.movement.up);
        stream.writeBoolean(player.movement.down);
        stream.writeBoolean(player.movement.left);
        stream.writeBoolean(player.movement.right);

        if (player.isMobile) {
            stream.writeBoolean(player.movement.moving);
            stream.writeRotation(player.movementAngle, 16);
        }

        stream.writeBoolean(player.attacking);
        stream.writeBoolean(player.turning);
        if (player.turning) {
            stream.writeRotation(player.rotation, 16);
        }

        stream.writeBits(player.action, INPUT_ACTIONS_BITS);

        switch (player.action) {
            case InputActions.EquipItem:
                stream.writeBits(player.itemToSwitch, 2);
                break;
            case InputActions.DropItem:
                stream.writeBits(player.itemToDrop, 2);
                break;
        }
        player.action = InputActions.None;
    }
}
