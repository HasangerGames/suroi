import { ArmorType, ObjectCategory, PlayerActions, TICKS_PER_SECOND } from "../../../common/src/constants";
import { type ArmorDefinition } from "../../../common/src/definitions/armors";
import { type BackpackDefinition } from "../../../common/src/definitions/backpacks";
import { type LootDefinition } from "../../../common/src/definitions/loots";
import { type ScopeDefinition } from "../../../common/src/definitions/scopes";
import { type SkinDefinition } from "../../../common/src/definitions/skins";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import {
    circleCircleIntersection,
    clamp,
    distance,
    distanceSquared,
    velFromAngle
} from "../../../common/src/utils/math";
import { ItemType, LootRadius } from "../../../common/src/utils/objectDefinitions";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { ObjectSerializations } from "../../../common/src/utils/objectsSerializations";
import { randomRotation } from "../../../common/src/utils/random";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { v, vAdd, vClone, type Vector, vMul, vSub } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GunItem } from "../inventory/gunItem";
import { PickupPacket } from "../packets/sending/pickupPacket";
import { GameObject } from "../types/gameObject";
import { Obstacle } from "./obstacle";
import { type Player } from "./player";

export class Loot extends GameObject {
    declare readonly type: ObjectType<ObjectCategory.Loot, LootDefinition>;

    declare readonly hitbox: CircleHitbox;

    oldPosition = v(0, 0);

    count = 1;

    isNew = true;

    velocity = v(0, 0);

    get position(): Vector {
        return this.hitbox.position;
    }

    set position(pos: Vector) {
        this.hitbox.position = pos;
    }

    constructor(game: Game, type: ObjectType<ObjectCategory.Loot, LootDefinition>, position: Vector, count?: number) {
        super(game, type, position);

        this.hitbox = new CircleHitbox(LootRadius[this.type.definition.itemType], vClone(position));
        this.oldPosition = this._position;

        if (count !== undefined) this.count = count;

        this.push(randomRotation(), 1);

        setTimeout((): void => { this.isNew = false; }, 100);
    }

    update(): void {
        if (distanceSquared(this.oldPosition, this.position) > 0.0001) {
            this.game.partialDirtyObjects.add(this);
            this.oldPosition = vClone(this.position);
        }
        this.game.grid.removeObject(this);
        if (Math.abs(this.velocity.x) > 0.001 || Math.abs(this.velocity.y) > 0.001) {
            this.velocity = vMul(this.velocity, 0.9);
            const velocity = vMul(this.velocity, 1 / TICKS_PER_SECOND);
            velocity.x = clamp(velocity.x, -1, 1);
            velocity.y = clamp(velocity.y, -1, 1);
            this.position = vAdd(this.position, velocity);
        }

        this.position.x = clamp(this.position.x, this.hitbox.radius, this.game.map.width - this.hitbox.radius);
        this.position.y = clamp(this.position.y, this.hitbox.radius, this.game.map.height - this.hitbox.radius);

        const objects = this.game.grid.intersectsRect(this.hitbox.toRectangle());
        for (const object of objects) {
            if (object instanceof Obstacle && object.collidable && object.hitbox.collidesWith(this.hitbox)) {
                this.hitbox.resolveCollision(object.hitbox);
            }

            if (object instanceof Loot && object !== this && object.hitbox.collidesWith(this.hitbox)) {
                const collision = circleCircleIntersection(this.position, this.hitbox.radius, object.position, object.hitbox.radius);
                if (collision) this.velocity = vSub(this.velocity, vMul(collision.dir, 0.45));

                const dist = Math.max(distance(object.position, this.position), 1);
                const vecCollision = v(object.position.x - this.position.x, object.position.y - this.position.y);
                const vecCollisionNorm = v(vecCollision.x / dist, vecCollision.y / dist);
                const vRelativeVelocity = v(this.velocity.x - object.velocity.x, this.velocity.y - object.velocity.y);

                const speed = vRelativeVelocity.x * vecCollisionNorm.x + vRelativeVelocity.y * vecCollisionNorm.y;

                if (speed < 0) continue;

                this.velocity.x -= (speed * vecCollisionNorm.x);
                this.velocity.y -= (speed * vecCollisionNorm.y);
                object.velocity.x += (speed * vecCollisionNorm.x);
                object.velocity.y += (speed * vecCollisionNorm.y);
            }
        }
        this.game.grid.addObject(this);
    }

    push(angle: number, velocity: number): void {
        this.velocity = vAdd(this.velocity, velFromAngle(angle, velocity));
    }

    canInteract(player: Player): boolean {
        if (this.dead) return false;
        const inventory = player.inventory;
        const definition = this.type.definition;

        switch (definition.itemType) {
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
            this.game.addLoot(type, this.position, this.count).push(player.rotation + Math.PI, 6);
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
                if (!inventory.hasWeapon(0) || !inventory.hasWeapon(1)) {
                    inventory.appendWeapon(this.type.idString);
                } else if (inventory.activeWeaponIndex < 2 && this.type.idString !== inventory.activeWeapon.type.idString) {
                    if (player.action?.type === PlayerActions.Reload) player.action?.cancel();
                    inventory.addOrReplaceWeapon(inventory.activeWeaponIndex, this.type.idString);
                }
                break;
            }
            case ItemType.Healing:
            case ItemType.Ammo: {
                const idString = this.type.idString;
                const currentCount = inventory.items[idString];
                const maxCapacity = inventory.backpack.definition.maxCapacity[idString];

                if (currentCount + 1 <= maxCapacity) {
                    if (currentCount + this.count <= maxCapacity) {
                        inventory.items[idString] += this.count;
                    } else if (currentCount + this.count > maxCapacity) {
                        inventory.items[idString] = maxCapacity;
                        this.count = (currentCount + this.count) - maxCapacity;
                        this.game.fullDirtyObjects.add(this);
                        deleteItem = false;
                    }
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
    override damage(amount: number, source?: GameObject): void { }

    override serializePartial(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Loot].serializePartial(stream, {
            position: this.position,
            fullUpdate: false
        });
    }

    override serializeFull(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Loot].serializeFull(stream, {
            position: this.position,
            count: this.count,
            isNew: this.isNew,
            fullUpdate: true
        });
    }
}
