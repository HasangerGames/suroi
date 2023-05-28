import { ReceivingPacket } from "../../types/receivingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";

export class InputPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player: Player = this.player;
        if (player.dead) return; // Ignore input packets from dead players

        player.movement.up = stream.readBoolean();
        player.movement.down = stream.readBoolean();
        player.movement.left = stream.readBoolean();
        player.movement.right = stream.readBoolean();

        const oldAttackState = player.attacking;
        const attackState = stream.readBoolean();

        player.attacking = attackState;
        player.startedAttacking = !oldAttackState && attackState;
        player.stoppedAttacking = oldAttackState && !attackState;

        const activeItemIndex = stream.readBits(2);

        // switch items
        if (activeItemIndex !== player.activeItemIndex) {
            // If the switch is successful, then the active item index isn't dirty;
            // conversely, if the switch fails, then the change needs to be sent back
            // to the client, and the active item index is thus dirty
            player.dirty.activeItemIndex = !player.inventory.setActiveItemIndex(activeItemIndex);

            player.game.fullDirtyObjects.add(player);
            player.fullDirtyObjects.add(player);
        }

        player.turning = stream.readBoolean();
        if (player.turning) {
            player.rotation = stream.readRotation(16);
        }
    }
}
