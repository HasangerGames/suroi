import { type Game } from "../game";

import { GameObject } from "../types/gameObject";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { v, vAdd, vMul, type Vector, vClone } from "../../../common/src/utils/vector";
import { type LootDefinition } from "../../../common/src/definitions/loots";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { type Player } from "./player";
import { PickupPacket } from "../packets/sending/pickupPacket";
import { ArmorType, LootRadius, TICK_SPEED, type ObjectCategory } from "../../../common/src/constants";
import { GunItem } from "../inventory/gunItem";
import { type BackpackDefinition } from "../../../common/src/definitions/backpacks";
import { type ScopeDefinition } from "../../../common/src/definitions/scopes";
import { type ArmorDefinition } from "../../../common/src/definitions/armors";
import { type SkinDefinition } from "../../../common/src/definitions/skins";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { Obstacle } from "./obstacle";
import { clamp, distance, velFromAngle } from "../../../common/src/utils/math";

export class Loot extends GameObject {
    declare readonly type: ObjectType<ObjectCategory.Loot, LootDefinition>;

    oldPosition = v(0, 0);

    count = 1;

    isNew = true;

    hitbox: CircleHitbox;

    velocity = v(0, 0);

    get position(): Vector {
        return this.hitbox.position;
    }

    set position(pos: Vector) {
        this.hitbox.position = pos;
    }

    constructor(game: Game, type: ObjectType<ObjectCategory.Loot, LootDefinition>, position: Vector, count?: number) {
        super(game, type, position);

        this.hitbox = new CircleHitbox(LootRadius[this.type.definition.itemType], position);

        if (count !== undefined) this.count = count;

        setTimeout((): void => { this.isNew = false; }, 100);
    }

    update(): void {
        this.velocity = vMul(this.velocity, 0.95);
        const velocity = vMul(this.velocity, 1 / TICK_SPEED);

        if (distance(this.oldPosition, this.position) > 0.01) {
            this.game.partialDirtyObjects.add(this);
            this.oldPosition = vClone(this.position);
        }

        this.game.grid.removeObject(this);
        this.position = vAdd(this.position, velocity);
        this.game.grid.addObject(this);

        this.position.x = clamp(this.position.x, this.hitbox.radius, this.game.map.width - this.hitbox.radius);
        this.position.y = clamp(this.position.y, this.hitbox.radius, this.game.map.height - this.hitbox.radius);

        const objects = this.game.grid.intersectsRect(this.hitbox.toRectangle());
        for (const object of objects) {
            if (object instanceof Obstacle && object.collidable && object.hitbox.collidesWith(this.hitbox)) {
                this.hitbox.resolveCollision(object.hitbox);
            }
        }
    }

    push(angle: number, velocity: number): void {
        this.velocity = vAdd(this.velocity, velFromAngle(angle, velocity));
    }

    canInteract(player: Player): boolean {
        if (this.dead) return false;
        const inventory = player.inventory;
        const definition = this.type.definition;

        switch (definition.itemType) {
            // average ESLint L
            // eslint-disable-next-line no-fallthrough
            case ItemType.Gun: {
                return !inventory.hasWeapon(0) ||
                    !inventory.hasWeapon(1) ||
                    (inventory.activeWeaponIndex < 2 && this.type.idNumber !== inventory.activeWeapon.type.idNumber);
            }
            case ItemType.Healing:
            case ItemType.Ammo: {
                const idString = this.type.idString;
                const currentCount = inventory.items[idString];
                const maxCapacity = inventory.backpack.definition.maxCapacity[idString];
                return currentCount + 1 <= maxCapacity;
            }
            case ItemType.Melee: {
                return this.type.idNumber !== inventory.getWeapon(2)?.type.idNumber;
            }
            case ItemType.Armor: {
                if (definition.armorType === ArmorType.Helmet) return definition.level > (inventory.helmet?.definition.level ?? 0);
                else if (definition.armorType === ArmorType.Vest) return definition.level > (inventory.vest?.definition.level ?? 0);
                else return false;
            }
            case ItemType.Backpack: {
                return definition.level > inventory.backpack.definition.level;
            }
            case ItemType.Scope: {
                return inventory.items[this.type.idString] === 0;
            }
            case ItemType.Skin: {
                return true;
            }
        }
    }

    interact(player: Player, noPickup = false): void {
        if (this.dead) return;
        const createNewItem = (type = this.type): void => {
            const angle = player.rotation;
            this.game.addLoot(type, vAdd(this.position, v(0.6 * Math.cos(angle), 0.6 * Math.sin(angle))), this.count);
        };

        if (noPickup) {
            this.game.removeLoot(this);
            createNewItem();
            return;
        }

        const inventory = player.inventory;
        let deleteItem = true;
        const definition = this.type.definition;

        switch (definition.itemType) {
            case ItemType.Melee: {
                inventory.addOrReplaceWeapon(2, this.type.idString);
                break;
            }
            case ItemType.Gun: {
                player.action?.cancel();
                if (!inventory.hasWeapon(0) || !inventory.hasWeapon(1)) {
                    inventory.appendWeapon(this.type.idString);
                } else if (inventory.activeWeaponIndex < 2 && this.type.idString !== inventory.activeWeapon.type.idString) {
                    inventory.addOrReplaceWeapon(inventory.activeWeaponIndex, this.type.idString);
                }
                break;
            }
            case ItemType.Healing:
            case ItemType.Ammo: {
                const idString = this.type.idString;
                const currentCount = inventory.items[idString];
                const maxCapacity = inventory.backpack.definition.maxCapacity[idString];

                if (currentCount + this.count <= maxCapacity) {
                    inventory.items[idString] += this.count;
                } else if (currentCount + 1 > maxCapacity) {
                    // inventory full
                } else if (currentCount + this.count > maxCapacity) {
                    inventory.items[idString] = maxCapacity;
                    this.count = (currentCount + this.count) - maxCapacity;
                    this.game.fullDirtyObjects.add(this);
                    deleteItem = false;
                }
                break;
            }
            case ItemType.Armor: {
                switch (definition.armorType) {
                    case ArmorType.Helmet:
                        if (player.inventory.helmet) createNewItem(player.inventory.helmet);
                        player.inventory.helmet = this.type as ObjectType<ObjectCategory.Loot, ArmorDefinition>;
                        break;
                    case ArmorType.Vest:
                        if (player.inventory.vest) createNewItem(player.inventory.vest);
                        player.inventory.vest = this.type as ObjectType<ObjectCategory.Loot, ArmorDefinition>;
                }

                player.fullDirtyObjects.add(player);
                this.game.fullDirtyObjects.add(player);
                break;
            }
            case ItemType.Backpack: {
                if (player.inventory.backpack.definition.level > 0) createNewItem(player.inventory.backpack);
                player.inventory.backpack = this.type as ObjectType<ObjectCategory.Loot, BackpackDefinition>;

                player.fullDirtyObjects.add(player);
                this.game.fullDirtyObjects.add(player);
                break;
            }
            case ItemType.Scope: {
                inventory.items[this.type.idString] = 1;
                player.dirty.inventory = true;

                const scope = this.type as ObjectType<ObjectCategory.Loot, ScopeDefinition>;
                if (scope.definition.zoomLevel > player.inventory.scope.definition.zoomLevel) {
                    player.inventory.scope = scope;
                }

                break;
            }
            case ItemType.Skin: {
                createNewItem(player.loadout.skin);
                player.loadout.skin = this.type as ObjectType<ObjectCategory.Loot, SkinDefinition>;

                player.fullDirtyObjects.add(player);
                this.game.fullDirtyObjects.add(player);
                break;
            }
        }

        player.dirty.inventory = true;

        // Destroy the old loot
        this.game.removeLoot(this);

        // Send pickup packet
        player.sendPacket(new PickupPacket(player, this.type));

        // If the item wasn't deleted, create a new loot item pushed slightly away from the player
        if (!deleteItem) createNewItem();

        // Reload active gun if the player picks up the correct ammo
        const activeWeapon = player.inventory.activeWeapon;
        if (
            activeWeapon instanceof GunItem &&
            activeWeapon.ammo === 0 &&
            this.type.idString === activeWeapon.definition.ammoType
        ) {
            activeWeapon.reload();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override damage(amount: number, source?: GameObject): void {}

    override serializePartial(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
    }

    override serializeFull(stream: SuroiBitStream): void {
        stream.writeBits(this.count, 9);
        stream.writeBoolean(this.isNew);
    }
}
