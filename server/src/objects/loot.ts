import { type Body, Circle, Vec2 } from "planck";

import { type Game } from "../game";

import { type CollisionFilter, GameObject } from "../types/gameObject";
import { v2v } from "../utils/misc";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { v, vAdd, type Vector } from "../../../common/src/utils/vector";
import { randomRotation } from "../../../common/src/utils/random";
import { type LootDefinition } from "../../../common/src/definitions/loots";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { type Player } from "./player";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { PickupPacket } from "../packets/sending/pickupPacket";
import { ArmorType, LootRadius, type ObjectCategory } from "../../../common/src/constants";
import { GunItem } from "../inventory/gunItem";
import { type BackpackDefinition } from "../../../common/src/definitions/backpacks";
import { type ScopeDefinition } from "../../../common/src/definitions/scopes";
import { type ArmorDefinition } from "../../../common/src/definitions/armors";
import { type SkinDefinition } from "../../../common/src/definitions/skins";

export class Loot extends GameObject {
    override readonly is: CollisionFilter = {
        player: false,
        obstacle: false,
        bullet: false,
        loot: true
    };

    override readonly collidesWith: CollisionFilter = {
        player: false,
        obstacle: true,
        bullet: false,
        loot: true
    };

    declare readonly type: ObjectType<ObjectCategory.Loot, LootDefinition>;

    body: Body;

    oldPosition: Vector;

    count = 1;

    isNew = true;

    constructor(game: Game, type: ObjectType<ObjectCategory.Loot, LootDefinition>, position: Vector, count?: number) {
        super(game, type, position);

        this.oldPosition = position;
        if (count !== undefined) this.count = count;

        // Create the body and hitbox
        this.body = game.world.createBody({
            type: "dynamic",
            position: v2v(position),
            linearDamping: 0.003,
            angularDamping: 0,
            fixedRotation: true
        });

        const radius = LootRadius[this.type.definition.itemType];

        this.body.createFixture({
            shape: Circle(radius),
            restitution: 0,
            density: 1.0,
            friction: 0.0,
            userData: this
        });
        this.hitbox = new CircleHitbox(radius, this.position);

        // Push the loot in a random direction
        this.push(randomRotation(), 0.005);

        setTimeout((): void => { this.isNew = false; }, 100);
    }

    get position(): Vector {
        return this.body.getPosition();
    }

    get rotation(): number {
        const angle = this.body.getAngle();
        return Math.atan2(Math.cos(angle), Math.sin(angle));
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
        this.dead = true;

        // Send pickup packet
        if (definition.itemType !== ItemType.Gun) {
            player.sendPacket(new PickupPacket(player, this.type));
        }

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

    push(angle: number, velocity: number): void {
        const vel = this.body.getLinearVelocity();
        this.body.setLinearVelocity(vel.add(Vec2(Math.cos(angle), -Math.sin(angle)).mul(velocity)));
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
