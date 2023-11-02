import { InputActions, MAX_MOUSE_DISTANCE, PlayerActions } from "../../../../common/src/constants";
import { type HealingItemDefinition } from "../../../../common/src/definitions/healingItems";
import { Loots } from "../../../../common/src/definitions/loots";
import { type ScopeDefinition } from "../../../../common/src/definitions/scopes";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { distanceSquared } from "../../../../common/src/utils/math";
import { ItemType, ObstacleSpecialRoles } from "../../../../common/src/utils/objectDefinitions";
import { INPUT_ACTIONS_BITS, type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { GunItem } from "../../inventory/gunItem";
import { Loot } from "../../objects/loot";
import { Obstacle } from "../../objects/obstacle";
import { ReceivingPacket } from "../../types/receivingPacket";

export class InputPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.player;
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
            if (!player.isMobile) player.distanceToMouse = stream.readFloat(0, MAX_MOUSE_DISTANCE, 8);
        }

        const actions = stream.readBits(3);
        const inventory = player.inventory;

        for (let i = 0; i < actions; i++) {
            const action = stream.readBits(INPUT_ACTIONS_BITS);
            switch (action) {
                case InputActions.UseItem: {
                    inventory.useItem(Loots.readFromStream<HealingItemDefinition | ScopeDefinition>(stream));
                    break;
                }
                case InputActions.EquipLastItem:
                case InputActions.EquipItem: {
                    const target = action === InputActions.EquipItem
                        ? stream.readBits(2)
                        : inventory.lastWeaponIndex;

                    // If a user is reloading the gun in slot 2, then we don't cancel the reload if they "switch" to slot 2
                    if (player.action?.type !== PlayerActions.Reload || target !== player.activeItemIndex) {
                        player.action?.cancel();
                    }

                    inventory.setActiveWeaponIndex(target);
                    break;
                }
                case InputActions.DropItem: {
                    player.action?.cancel();
                    inventory.dropWeapon(stream.readBits(2));
                    break;
                }
                case InputActions.SwapGunSlots: {
                    inventory.swapGunSlots();
                    break;
                }
                case InputActions.Interact: {
                    if (player.game.now - player.lastInteractionTime < 120) return;
                    player.lastInteractionTime = player.game.now;

                    const detectionHitbox = new CircleHitbox(3, player.position);
                    const nearObjects = player.game.grid.intersectsHitbox(detectionHitbox);

                    const getClosestObject = (condition: (object: Loot | Obstacle) => boolean): Loot | Obstacle | undefined => {
                        let minDist = Number.MAX_VALUE;
                        let closestObject: Loot | Obstacle | undefined;

                        for (const object of nearObjects) {
                            if (
                                (object instanceof Loot || (object instanceof Obstacle && object.canInteract(player))) &&
                                object.hitbox !== undefined &&
                                condition(object)
                            ) {
                                const dist = distanceSquared(object.position, player.position);
                                if (dist < minDist && object.hitbox.collidesWith(detectionHitbox)) {
                                    minDist = dist;
                                    closestObject = object;
                                }
                            }
                        }

                        return closestObject;
                    };

                    const closestObject = getClosestObject(object => object instanceof Obstacle || object.canInteract(player));

                    if (!closestObject) {
                        // the thing that happens when you try pick up
                        const closestObject = getClosestObject(object => {
                            if (!(object instanceof Loot)) return false;
                            const itemType = object.definition.itemType;
                            return itemType !== ItemType.Gun && itemType !== ItemType.Melee;
                        });

                        if (closestObject) {
                            closestObject.interact(player, true);
                        }

                        break;
                    }

                    const interact = (): void => {
                        closestObject?.interact(player);
                        player.canDespawn = false;
                        player.disableInvulnerability();
                    };

                    if (closestObject instanceof Loot || closestObject.definition.role === ObstacleSpecialRoles.Activatable) {
                        if (closestObject.canInteract(player)) {
                            interact();
                        }
                        break;
                    }

                    if (closestObject.isDoor && !closestObject.door?.locked) {
                        interact();

                        // If the closest object is a door, then we allow other doors within the
                        // interaction range to be interacted with

                        for (const object of nearObjects) {
                            if (object instanceof Obstacle && object.isDoor && !object.door?.locked && object.hitbox.collidesWith(detectionHitbox) && object !== closestObject) {
                                object.interact(player);
                            }
                        }
                        break;
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
}
