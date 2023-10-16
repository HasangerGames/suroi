import { ObjectCategory } from "../../../common/src/constants";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { type ObstacleDefinition, RotationMode } from "../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../common/src/typings";
import { type Hitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { angleBetweenPoints, calculateDoorHitboxes } from "../../../common/src/utils/math";
import { type ItemDefinition, ItemType } from "../../../common/src/utils/objectDefinitions";
import { ObjectSerializations } from "../../../common/src/utils/objectsSerializations";
import { ObjectType } from "../../../common/src/utils/objectType";
import { random } from "../../../common/src/utils/random";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { vAdd, type Vector } from "../../../common/src/utils/vector";
import { LootTables } from "../data/lootTables";
import { type Game } from "../game";
import { type GunItem } from "../inventory/gunItem";
import { MeleeItem } from "../inventory/meleeItem";
import { GameObject } from "../types/gameObject";
import { getLootTableLoot, type LootItem } from "../utils/misc";
import { type Building } from "./building";
import { Player } from "./player";

export class Obstacle extends GameObject {
    health: number;
    maxHealth: number;
    maxScale: number;
    healthFraction = 1;

    readonly damageable = true;
    collidable: boolean;

    variation: Variation;

    spawnHitbox: Hitbox;

    loot: LootItem[] = [];

    definition: ObstacleDefinition;

    lootSpawnOffset?: Vector;

    isDoor: boolean;
    door?: {
        open: boolean
        closedHitbox: Hitbox
        openHitbox: Hitbox
        openAltHitbox: Hitbox
        offset: number
    };

    parentBuilding?: Building;

    hitbox: Hitbox;

    constructor(
        game: Game,
        type: ObjectType<ObjectCategory.Obstacle, ObstacleDefinition>,
        position: Vector,
        rotation: number,
        scale: number,
        variation: Variation = 0,
        lootSpawnOffset?: Vector,
        parentBuilding?: Building
    ) {
        super(game, type, position);

        this.rotation = rotation;
        this.scale = this.maxScale = scale;
        this.variation = variation;

        this.lootSpawnOffset = lootSpawnOffset;

        this.parentBuilding = parentBuilding;

        const definition = type.definition;
        this.definition = definition;

        this.health = this.maxHealth = definition.health;

        let hitboxRotation: Orientation = 0;

        if (this.definition.rotationMode === RotationMode.Limited) {
            hitboxRotation = rotation as Orientation;
        }

        this.hitbox = definition.hitbox.transform(this.position, this.scale, hitboxRotation);

        this.spawnHitbox = (definition.spawnHitbox ?? definition.hitbox).transform(this.position, this.scale, hitboxRotation);

        this.collidable = !definition.noCollisions;

        if (definition.hasLoot) {
            const lootTable = LootTables[this.type.idString];
            const count = random(lootTable.min, lootTable.max);

            for (let i = 0; i < count; i++) {
                this.loot = this.loot.concat(getLootTableLoot(lootTable.loot));
            }
        }

        if (definition.spawnWithLoot) {
            const lootTable = LootTables[this.type.idString];
            const items = getLootTableLoot(lootTable.loot);

            for (const item of items) {
                this.game.addLoot(
                    ObjectType.fromString(ObjectCategory.Loot, item.idString),
                    this.position,
                    item.count
                );
            }
        }

        this.isDoor = definition.isDoor ?? false;
        // noinspection JSSuspiciousNameCombination
        if (definition.isDoor) {
            const { openHitbox, openAltHitbox } = calculateDoorHitboxes(definition, this.position, this.rotation as Orientation);
            this.door = {
                open: false,
                closedHitbox: this.hitbox.clone(),
                openHitbox,
                openAltHitbox,
                offset: 0
            };
        }
    }

    override damage(amount: number, source: GameObject, weaponUsed?: ObjectType | GunItem | MeleeItem, position?: Vector): void {
        const definition = this.definition;

        if (this.health === 0 || definition.indestructible) return;

        const weaponDef = weaponUsed?.definition as ItemDefinition;
        if (
            definition.impenetrable &&
            !(weaponDef.itemType === ItemType.Melee && (weaponDef as MeleeDefinition).piercingMultiplier)
        ) {
            return;
        }

        this.health -= amount;
        this.game.partialDirtyObjects.add(this);

        if (this.health <= 0 || this.dead) {
            this.health = 0;
            this.dead = true;

            if (!this.definition.isWindow) this.collidable = false;

            this.scale = definition.scale.spawnMin;

            if (definition.explosion !== undefined) {
                this.game.addExplosion(definition.explosion, this.position, source);
            }

            for (const item of this.loot) {
                let lootPos: Vector;
                if (this.lootSpawnOffset) lootPos = vAdd(this.position, this.lootSpawnOffset);
                else lootPos = this.loot.length > 1 ? this.hitbox.randomPoint() : this.position;
                const loot = this.game.addLoot(ObjectType.fromString(ObjectCategory.Loot, item.idString), lootPos, item.count);
                if (source.position !== undefined || position !== undefined) {
                    loot.push(angleBetweenPoints(this.position, position ?? source.position), 7);
                }
            }

            if (this.definition.isWall) {
                this.parentBuilding?.damage();

                // hack a bit of a hack to break doors attached to walls :)
                for (const object of this.game.grid.intersectsRect(this.hitbox.toRectangle())) {
                    if (
                        object instanceof Obstacle &&
                        object.definition.isDoor &&
                        object.door?.openHitbox &&
                        this.hitbox?.collidesWith(object.door.openHitbox)
                    ) {
                        object.damage(9999, source, weaponUsed);
                    }
                }
            }
        } else {
            this.healthFraction = this.health / this.maxHealth;
            const oldScale = this.scale;

            // Calculate new scale & scale hitbox
            this.scale = this.healthFraction * (this.maxScale - definition.scale.destroy) + definition.scale.destroy;
            this.hitbox.scale(this.scale / oldScale);

            // Punch doors to open
            if (this.isDoor && source instanceof Player && weaponUsed instanceof MeleeItem) this.interact(source);
        }
    }

    interact(player: Player): void {
        if (this.dead || this.door === undefined) return;
        if (!(this.hitbox instanceof RectangleHitbox)) {
            throw new Error("Door with non-rectangular hitbox");
        }

        this.game.grid.removeObject(this);
        this.door.open = !this.door.open;
        if (this.door.open) {
            let isOnOtherSide = false;
            switch (this.rotation) {
                case 0:
                    isOnOtherSide = player.position.y < this.position.y;
                    break;
                case 1:
                    isOnOtherSide = player.position.x < this.position.x;
                    break;
                case 2:
                    isOnOtherSide = player.position.y > this.position.y;
                    break;
                case 3:
                    isOnOtherSide = player.position.x > this.position.x;
                    break;
            }
            if (isOnOtherSide) {
                this.door.offset = 3;
                this.hitbox = this.door.openAltHitbox.clone();
            } else {
                this.door.offset = 1;
                this.hitbox = this.door.openHitbox.clone();
            }
        } else {
            this.door.offset = 0;
            this.hitbox = this.door.closedHitbox.clone();
        }
        this.game.grid.addObject(this);

        this.game.partialDirtyObjects.add(this);
    }

    override serializePartial(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Obstacle].serializePartial(stream, {
            ...this,
            fullUpdate: false
        });
    }

    override serializeFull(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Obstacle].serializeFull(stream, {
            scale: this.scale,
            dead: this.dead,
            definition: this.definition,
            door: this.door,
            fullUpdate: true,
            position: this.position,
            variation: this.variation,
            rotation: {
                rotation: this.rotation,
                orientation: this.rotation as Orientation
            }
        });
    }
}
