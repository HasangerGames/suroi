import {
    INPUT_ACTIONS_BITS,
    MAX_MOUSE_DISTANCE,
    ObjectCategory,
    PacketType
} from "../../../../../common/src/constants";
import { ObjectType } from "../../../../../common/src/utils/objectType";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
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
        if (inputs.resetAttacking) {
            inputs.attacking = false;
            inputs.resetAttacking = false;
        }

        stream.writeBoolean(inputs.turning);
        if (inputs.turning) {
            stream.writeRotation(inputs.rotation, 16);
            if (!inputs.isMobile) stream.writeFloat(inputs.distanceToMouse, 0, MAX_MOUSE_DISTANCE, 8);
            inputs.turning = false;
        }

        stream.writeBits(inputs.actions.length, 4);

        for (const action of inputs.actions) {
            stream.writeBits(action.type, INPUT_ACTIONS_BITS);

            if ("slot" in action) {
                stream.writeBits(action.slot, 2);
            }
            if ("item" in action) {
                stream.writeObjectTypeNoCategory(ObjectType.fromString(ObjectCategory.Loot, action.item.idString));
            }
        }

        inputs.actions = [];
    }
}
