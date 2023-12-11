import { GameConstants, ObjectCategory, PlayerActions } from "../../../common/src/constants.js";
import { ArmorType } from "../../../common/src/definitions/armors.js";
import { Loots, type LootDefinition } from "../../../common/src/definitions/loots.js";
import { PickupPacket } from "../../../common/src/packets/pickupPacket.js";
import { CircleHitbox } from "../../../common/src/utils/hitbox.js";
import { circleCircleIntersection, clamp, distance, velFromAngle } from "../../../common/src/utils/math.js";
import { ItemType, LootRadius, type ReifiableDef } from "../../../common/src/utils/objectDefinitions.js";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations.js";
import { randomRotation } from "../../../common/src/utils/random.js";
import { v, vAdd, vClone, vMul, vSub, type Vector, vEqual } from "../../../common/src/utils/vector.js";
import { type Game } from "../game.js";
import { GunItem } from "../inventory/gunItem.js";
import { GameObject } from "./gameObject.js";
import { Obstacle } from "./obstacle.js";
import { type Player } from "./player.js";

export class Loot extends GameObject<ObjectCategory.Loot> {
    override readonly type = ObjectCategory.Loot;

    declare readonly hitbox: CircleHitbox;

    readonly definition: LootDefinition;

    count = 1;

    isNew = true;

    velocity = v(0, 0);

    get position(): Vector {
        return this.hitbox.position;
    }

    set position(pos: Vector) {
        this.hitbox.position = pos;
    }

    private oldPosition = v(0, 0);

    constructor(game: Game, definition: ReifiableDef<LootDefinition>, position: Vector, count?: number) {
        super(game, position);

        this.definition = Loots.reify(definition);

        this.hitbox = new CircleHitbox(LootRadius[this.definition.itemType], vClone(position));

        if (count !== undefined) this.count = count;

        this.push(randomRotation(), 1);

        this.game.addTimeout(() => { this.isNew = false; }, 100);
    }

    update(): void {
        const moving = Math.abs(this.velocity.x) > 0.001 ||
            Math.abs(this.velocity.y) > 0.001 ||
            !vEqual(this.oldPosition, this.position);

        if (!moving) return;

        this.oldPosition = vClone(this.position);

        if (this.game.map.terrain.groundRect.isPointInside(this.position)) {
            const rivers = this.game.map.terrain.getRiversInPosition(this.position);
            for (const river of rivers) {
                if (river.waterHitbox.isPointInside(this.position)) {
                    const t = river.getClosestT(this.position);

                    const tangent = river.getTangent(t);

                    this.push(Math.atan2(tangent.y, tangent.x), -1);
                    break;
                }
            }
        }

        this.velocity = vMul(this.velocity, 0.9);
        const velocity = vMul(this.velocity, 1 / GameConstants.tps);
        velocity.x = clamp(velocity.x, -1, 1);
        velocity.y = clamp(velocity.y, -1, 1);
        this.position = vAdd(this.position, velocity);
        this.position.x = clamp(this.position.x, this.hitbox.radius, this.game.map.width - this.hitbox.radius);
        this.position.y = clamp(this.position.y, this.hitbox.radius, this.game.map.height - this.hitbox.radius);

        const objects = this.game.grid.intersectsHitbox(this.hitbox);
        for (const object of objects) {
            if (moving &&
                object instanceof Obstacle &&
                object.collidable &&
                object.hitbox.collidesWith(this.hitbox)) {
                this.hitbox.resolveCollision(object.hitbox);
            }

            if (object instanceof Loot && object !== this && object.hitbox.collidesWith(this.hitbox)) {
                const collision = circleCircleIntersection(this.position, this.hitbox.radius, object.position, object.hitbox.radius);
                if (collision) {
                    this.velocity = vSub(this.velocity, vMul(collision.dir, 0.45));
                }

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

        if (!vEqual(this.oldPosition, this.position)) {
            this.game.partialDirtyObjects.add(this);
            this.game.grid.addObject(this);
        }
    }

    push(angle: number, velocity: number): void {
        this.velocity = vAdd(this.velocity, velFromAngle(angle, velocity));
    }

    canInteract(player: Player): boolean {
        if (this.dead) return false;
        const inventory = player.inventory;

        switch (this.definition.itemType) {
            case ItemType.Gun: {
                for (const weapon of inventory.weapons) {
                    if (weapon instanceof GunItem &&
                        weapon.definition.dual &&
                        !weapon.dual &&
                        this.definition.idString === weapon.definition.idString) {
                        return true;
                    }
                }

                return !inventory.hasWeapon(0) ||
                    !inventory.hasWeapon(1) ||
                    (inventory.activeWeaponIndex < 2 && this.definition !== inventory.activeWeapon.definition);
            }
            case ItemType.Healing:
            case ItemType.Ammo: {
                const idString = this.definition.idString;

                return inventory.items[idString] + 1 <= (inventory.backpack?.maxCapacity[idString] ?? 0);
            }
            case ItemType.Melee: {
                return this.definition !== inventory.getWeapon(2)?.definition;
            }
            case ItemType.Armor: {
                let threshold = -Infinity;
                switch (this.definition.armorType) {
                    case ArmorType.Helmet: {
                        threshold = inventory.helmet?.level ?? 0;
                        break;
                    }
                    case ArmorType.Vest: {
                        threshold = inventory.vest?.level ?? 0;
                        break;
                    }
                }

                return this.definition.level > threshold;
            }
            case ItemType.Backpack: {
                return this.definition.level > (inventory.backpack?.level ?? 0);
            }
            case ItemType.Scope: {
                return inventory.items[this.definition.idString] === 0;
            }
            case ItemType.Skin: {
                return true;
            }
        }
    }

    interact(player: Player, noPickup = false): void {
        if (this.dead) return;
        const createNewItem = (type: LootDefinition = this.definition): void => {
            this.game.addLoot(type, this.position, this.count).push(player.rotation + Math.PI, 6);
        };

        if (noPickup) {
            this.game.removeLoot(this);
            createNewItem();
            return;
        }

        const inventory = player.inventory;
        let deleteItem = true;

        switch (this.definition.itemType) {
            case ItemType.Melee: {
                inventory.addOrReplaceWeapon(2, this.definition.idString);
                break;
            }
            case ItemType.Gun: {
                let gotDual = false;
                for (const weapon of inventory.weapons) {
                    if (weapon instanceof GunItem &&
                        weapon?.definition.idString === this.definition.idString &&
                        weapon.definition.dual && !weapon.dual) {
                        weapon.dual = true;
                        player.dirty.weapons = true;
                        player.game.fullDirtyObjects.add(player);
                        if (player.action?.type === PlayerActions.Reload &&
                            player.activeItem === weapon) {
                            player.action?.cancel();
                            if ((player.activeItem as GunItem).ammo <= 0) {
                                (player.activeItem as GunItem).reload();
                            }
                        }
                        gotDual = true;
                    }
                }
                if (gotDual) break;

                if (!inventory.hasWeapon(0) || !inventory.hasWeapon(1)) {
                    const slot = inventory.appendWeapon(this.definition.idString);
                    if (inventory.activeWeaponIndex > 1) inventory.setActiveWeaponIndex(slot);
                } else if (inventory.activeWeaponIndex < 2 && this.definition !== inventory.activeWeapon.definition) {
                    if (player.action?.type === PlayerActions.Reload) player.action?.cancel();
                    inventory.addOrReplaceWeapon(inventory.activeWeaponIndex, this.definition.idString);
                }
                break;
            }
            case ItemType.Healing:
            case ItemType.Ammo: {
                const idString = this.definition.idString;
                const currentCount = inventory.items[idString];
                const maxCapacity = inventory.backpack?.maxCapacity[idString] ?? 0;

                if (currentCount + 1 <= maxCapacity) {
                    if (currentCount + this.count <= maxCapacity) {
                        inventory.items[idString] += this.count;
                    } else /* if (currentCount + this.count > maxCapacity) */ {
                        inventory.items[idString] = maxCapacity;
                        this.count = currentCount + this.count - maxCapacity;
                        this.game.fullDirtyObjects.add(this);
                        deleteItem = false;
                    }
                }
                break;
            }
            case ItemType.Armor: {
                switch (this.definition.armorType) {
                    case ArmorType.Helmet:
                        if (player.inventory.helmet) createNewItem(player.inventory.helmet);
                        player.inventory.helmet = this.definition;
                        break;
                    case ArmorType.Vest:
                        if (player.inventory.vest) createNewItem(player.inventory.vest);
                        player.inventory.vest = this.definition;
                }

                this.game.fullDirtyObjects.add(player);
                break;
            }
            case ItemType.Backpack: {
                if ((player.inventory.backpack?.level ?? 0) > 0) createNewItem(player.inventory.backpack);
                player.inventory.backpack = this.definition;

                this.game.fullDirtyObjects.add(player);
                break;
            }
            case ItemType.Scope: {
                inventory.items[this.definition.idString] = 1;

                if (this.definition.zoomLevel > player.inventory.scope.zoomLevel) {
                    player.inventory.scope = this.definition.idString;
                }

                break;
            }
            case ItemType.Skin: {
                createNewItem(player.loadout.skin);
                player.loadout.skin = this.definition;

                this.game.fullDirtyObjects.add(player);
                break;
            }
        }

        player.dirty.items = true;

        // Destroy the old loot
        this.game.removeLoot(this);

        // Send pickup packet
        const packet = new PickupPacket();
        packet.item = this.definition;
        player.sendPacket(packet);

        // If the item wasn't deleted, create a new loot item pushed slightly away from the player
        if (!deleteItem) createNewItem();

        // Reload active gun if the player picks up the correct ammo
        const activeWeapon = player.inventory.activeWeapon;
        if (
            activeWeapon instanceof GunItem &&
            activeWeapon.ammo === 0 &&
            this.definition.idString === activeWeapon.definition.ammoType
        ) {
            activeWeapon.reload();
        }
    }

    override get data(): Required<ObjectsNetData[ObjectCategory.Loot]> {
        return {
            position: this.position,
            full: {
                definition: this.definition,
                count: this.count,
                isNew: this.isNew
            }
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override damage(): void { }
}
