import { ReceivingPacket } from "../../types/receivingPacket";
import { type Player } from "../../objects/player";
import { GunItem } from "../../inventory/gunItem";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { Loot } from "../../objects/loot";
import { type CollisionRecord, distanceSquared } from "../../../../common/src/utils/math";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { INPUT_ACTIONS_BITS, InputActions } from "../../../../common/src/constants";

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

        switch (stream.readBits(INPUT_ACTIONS_BITS)) {
            case InputActions.EquipItem:
                player.action?.cancel();
                player.inventory.setActiveWeaponIndex(stream.readBits(2));
                break;
            case InputActions.DropItem:
                player.action?.cancel();
                player.inventory.dropWeapon(stream.readBits(2));
                break;
            case InputActions.SwapGunSlots:
                player.inventory.swapGunSlots();
                break;
            case InputActions.Interact: {
                if (player.game.now - player.lastInteractionTime < 200) return;
                player.lastInteractionTime = player.game.now;

                let minDist = Number.MAX_VALUE;
                let closestObject: Loot | undefined;
                const detectionHitbox = new CircleHitbox(3, player.position);
                for (const object of player.visibleObjects) {
                    if (object instanceof Loot && object.canInteract(player)) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const record: CollisionRecord | undefined = object.hitbox?.distanceTo(detectionHitbox);
                        const dist = distanceSquared(object.position, player.position);
                        if (record?.collided && dist < minDist) {
                            minDist = dist;
                            closestObject = object;
                        }
                    }
                }
                if (closestObject) {
                    closestObject.interact(player);
                    player.canDespawn = false;
                    player.disableInvulnerability();
                }
                break;
            }
            case InputActions.Reload:
                if (player.activeItem instanceof GunItem) player.activeItem.reload();
                break;
            case InputActions.Cancel:
                player.action?.cancel();
                break;
            case InputActions.UseGauze:
                player.inventory.useItem("gauze");
                break;
            case InputActions.UseMedikit:
                player.inventory.useItem("medikit");
                break;
            case InputActions.UseCola:
                player.inventory.useItem("cola");
                break;
            case InputActions.UseTablets:
                player.inventory.useItem("tablets");
                break;
        }
    }
}
