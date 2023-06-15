import { ReceivingPacket } from "../../types/receivingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { Loot } from "../../objects/loot";
import { type CollisionRecord } from "../../../../common/src/utils/math";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { ACTIONS_BITS, Actions } from "../../../../common/src/constants";

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

        player.turning = stream.readBoolean();
        if (player.turning) {
            player.rotation = stream.readRotation(16);
        }

        switch (stream.readBits(ACTIONS_BITS)) {
            case Actions.EquipItem:
                player.inventory.setActiveWeaponIndex(stream.readBits(2));
                break;
            case Actions.DropItem:
                player.inventory.dropWeapon(stream.readBits(2));
                break;
            case Actions.Interact: {
                let minDist = Number.MAX_VALUE;
                let closestObject: Loot | undefined;
                const detectionHitbox = new CircleHitbox(3, player.position);
                for (const object of player.visibleObjects) {
                    if (object instanceof Loot && object.canInteract(player)) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const record: CollisionRecord | undefined = object.hitbox?.distanceTo(detectionHitbox);
                        if (record?.collided === true && record.distance < minDist) {
                            minDist = record.distance;
                            closestObject = object;
                        }
                    }
                }
                closestObject?.interact(player);
                break;
            }

        }
    }
}
