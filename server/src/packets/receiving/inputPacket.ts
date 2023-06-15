import { ReceivingPacket } from "../../types/receivingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { Loot } from "../../objects/loot";
import { type CollisionRecord } from "../../../../common/src/utils/math";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";

export class InputPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player: Player = this.player;
        if (player.dead) return; // Ignore input packets from dead players

        player.movement.up = stream.readBoolean();
        player.movement.down = stream.readBoolean();
        player.movement.left = stream.readBoolean();
        player.movement.right = stream.readBoolean();

        if (player.isMobile) {
            player.movement.moving = stream.readBoolean();
            player.movement.angle = stream.readRotation(16);
        }

        const oldAttackState = player.attacking;
        const attackState = stream.readBoolean();

        player.attacking = attackState;
        if (!oldAttackState && attackState) player.startedAttacking = true;

        const activeItemIndex = stream.readBits(2);

        // switch items
        if (activeItemIndex !== player.activeItemIndex) {
            // If the switch is successful, then the active item index isn't dirty;
            // conversely, if the switch fails, then the change needs to be sent back
            // to the client, and the active item index is thus dirty
            player.dirty.activeWeaponIndex = player.inventory.setActiveWeaponIndex(activeItemIndex);

            player.game.fullDirtyObjects.add(player);
            player.fullDirtyObjects.add(player);
        }

        player.turning = stream.readBoolean();
        if (player.turning) {
            player.rotation = stream.readRotation(16);
        }

        if (stream.readBoolean()) { // interacting
            let minDist = Number.MAX_VALUE;
            let closestObject: Loot | undefined;

            const detectionHitbox = new CircleHitbox(3, player.position);

            for (const object of player.visibleObjects) {
                if (object instanceof Loot && object.canInteract(player)) {
                    const record: CollisionRecord | undefined = object.hitbox?.distanceTo(detectionHitbox);

                    if (record?.collided === true && record.distance < minDist) {
                        minDist = record.distance;
                        closestObject = object;
                    }
                }
            }

            closestObject?.interact(player);
        }
    }
}
