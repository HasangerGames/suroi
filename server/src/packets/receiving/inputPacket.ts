import { ReceivingPacket } from "../../types/receivingPacket";
import { type Player } from "../../objects/player";
import { GunItem } from "../../inventory/gunItem";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { Loot } from "../../objects/loot";
import { distanceSquared } from "../../../../common/src/utils/math";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { INPUT_ACTIONS_BITS, InputActions } from "../../../../common/src/constants";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { Obstacle } from "../../objects/obstacle";

export class InputPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player: Player = this.player;
        // Ignore input packets from players that haven't finished joining, dead players, and if the game is over
        if (!player.joined || player.dead || player.game.over) return;

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
                if (player.game.now - player.lastInteractionTime < 120) return;
                player.lastInteractionTime = player.game.now;

                const getClosestObject = (condition: (object: Loot | Obstacle) => boolean): Loot | Obstacle | undefined => {
                    let minDist = Number.MAX_VALUE;
                    let closestObject: Loot | Obstacle | undefined;
                    const detectionHitbox = new CircleHitbox(3, player.position);

                    for (const object of player.visibleObjects) {
                        if ((object instanceof Loot || (object instanceof Obstacle && object.isDoor)) && object.hitbox !== undefined && condition(object)) {
                            const dist = distanceSquared(object.position, player.position);
                            if (dist < minDist && object.hitbox.collidesWith(detectionHitbox)) {
                                minDist = dist;
                                closestObject = object;
                            }
                        }
                    }

                    return closestObject;
                };

                const closestInteractableObject = getClosestObject(object => !(object instanceof Loot) || object.canInteract(player));
                if (closestInteractableObject) {
                    closestInteractableObject.interact(player);
                    player.canDespawn = false;
                    player.disableInvulnerability();
                } else {
                    const closestObject = getClosestObject(object => {
                        if (!(object instanceof Loot)) return false;
                        const itemType = object.type.definition.itemType;
                        return itemType !== ItemType.Gun && itemType !== ItemType.Melee;
                    });

                    if (closestObject) {
                        closestObject.interact(player, true);
                    }
                }
                break;
            }
            case InputActions.Reload:
                if (player.activeItem instanceof GunItem) {
                    player.activeItem.reload();
                }
                break;
            case InputActions.Cancel:
                player.action?.cancel();
                break;
            case InputActions.TopEmoteSlot:
                player.emote(0);
                break;
            case InputActions.RightEmoteSlot:
                player.emote(1);
                break;
            case InputActions.BottomEmoteSlot:
                player.emote(2);
                break;
            case InputActions.LeftEmoteSlot:
                player.emote(3);
                break;
        }
    }
}
