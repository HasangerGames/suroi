import { ReceivingPacket } from "../../types/receivingPacket";
import { type Player } from "../../objects/player";
import { GunItem } from "../../inventory/gunItem";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { Loot } from "../../objects/loot";
import { type CollisionRecord, distanceSquared } from "../../../../common/src/utils/math";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { INPUT_ACTIONS_BITS, InputActions } from "../../../../common/src/constants";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";

export class InputPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player: Player = this.player;
        if (!player.joined) return; // Ignore input packets from players that haven't finished joining

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

                const getClosestObject = (condition: (loot: Loot) => boolean): Loot | undefined => {
                    let minDist = Number.MAX_VALUE;
                    let closestObject: Loot | undefined;
                    const detectionHitbox = new CircleHitbox(3, player.position);

                    for (const object of player.visibleObjects) {
                        if (object instanceof Loot && condition(object)) {
                            const record: CollisionRecord | undefined = object.hitbox?.distanceTo(detectionHitbox);
                            const dist = distanceSquared(object.position, player.position);
                            if (dist < minDist && record?.collided) {
                                minDist = dist;
                                closestObject = object;
                            }
                        }
                    }

                    return closestObject;
                };

                const closestInteractableObject = getClosestObject(loot => loot.canInteract(player));
                if (closestInteractableObject) {
                    closestInteractableObject.interact(player);
                    player.canDespawn = false;
                    player.disableInvulnerability();
                } else {
                    const closestObject = getClosestObject(loot => {
                        const definition = loot.type.definition;

                        return definition.itemType !== ItemType.Gun && definition.itemType !== ItemType.Melee;
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
            case InputActions.BeginSpectating:
                console.log("begin spectating");
                player.spectate(player.killedBy ?? [...this.player.game.livingPlayers][0]);
                break;
        }
    }
}
