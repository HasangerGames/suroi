import {
    MAX_MOUSE_DISTANCE,
    PacketType
} from "../../../../../common/src/constants";
import { Loots } from "../../../../../common/src/definitions/loots";
import { INPUT_ACTIONS_BITS, type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";

export class InputPacket extends SendingPacket {
    override readonly allocBytes = 16;
    override readonly type = PacketType.Input;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        const inputs = this.game.inputManager;
        stream.writeBoolean(inputs.movement.up);
        stream.writeBoolean(inputs.movement.down);
        stream.writeBoolean(inputs.movement.left);
        stream.writeBoolean(inputs.movement.right);

        if (inputs.isMobile) {
            stream.writeBoolean(inputs.movement.moving);
            stream.writeRotation(inputs.movementAngle, 16);
        }

        stream.writeBoolean(inputs.attacking);

        stream.writeBoolean(inputs.turning);
        if (inputs.turning) {
            stream.writeRotation(inputs.resetAttacking ? inputs.shootOnReleaseAngle : inputs.rotation, 16);
            if (!inputs.isMobile) stream.writeFloat(inputs.distanceToMouse, 0, MAX_MOUSE_DISTANCE, 8);
            inputs.turning = false;
        }

        if (inputs.resetAttacking) {
            inputs.attacking = false;
            inputs.resetAttacking = false;
        }

        stream.writeBits(inputs.actions.length, 3);

        for (const action of inputs.actions) {
            stream.writeBits(action.type, INPUT_ACTIONS_BITS);

            if ("slot" in action) {
                stream.writeBits(action.slot, 2);
            }

            if ("item" in action) {
                Loots.writeToStream(stream, action.item);
            }
        }

        inputs.actions.length = 0;
    }
}
