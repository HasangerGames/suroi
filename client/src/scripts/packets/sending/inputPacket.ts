import { INPUT_ACTIONS_BITS, InputActions, PacketType } from "../../../../../common/src/constants";
import { Loots } from "../../../../../common/src/definitions/loots";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";

export class InputPacket extends SendingPacket {
    override readonly allocBytes = 16;
    override readonly type = PacketType.Input;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        let dirtyInputs = false;

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
        if (player.resetAttacking) {
            player.attacking = false;
            player.resetAttacking = false;
            dirtyInputs = true;
        }
        stream.writeBoolean(player.turning);
        if (player.turning) {
            stream.writeRotation(player.rotation, 16);
        }

        stream.writeBits(player.action, INPUT_ACTIONS_BITS);

        switch (player.action) {
            case InputActions.EquipItem: {
                stream.writeBits(player.itemToSwitch, 2);
                player.itemToSwitch = -1;
                break;
            }
            case InputActions.DropItem: {
                stream.writeBits(player.itemToDrop, 2);
                player.itemToDrop = -1;
                break;
            }
            case InputActions.UseConsumableItem: {
                stream.writeUint8(Loots.idStringToNumber[player.consumableToConsume?.idString ?? ""]);
                //                    we're in big trouble if the nullish coalescing triggers ^^^^^
                player.consumableToConsume = undefined;
                break;
            }
        }
        player.action = InputActions.None;
        player.dirty.inputs = dirtyInputs;
    }
}
