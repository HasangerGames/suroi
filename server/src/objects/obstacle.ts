import { type Game } from "../game";

import { GameObject } from "../types/gameObject";
import { type LootItem, getLootTableLoot } from "../utils/misc";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../common/src/utils/objectType";
import { type Vector, vSub, v, vAdd } from "../../../common/src/utils/vector";
import { calculateDoorHitboxes, transformRectangle } from "../../../common/src/utils/math";
import { CircleHitbox, type Hitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { ObjectCategory } from "../../../common/src/constants";
import { type Orientation, type Variation } from "../../../common/src/typings";
import { LootTables } from "../data/lootTables";
import { random } from "../../../common/src/utils/random";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { type ItemDefinition, ItemType } from "../../../common/src/utils/objectDefinitions";
import { Player } from "./player";
import { type Building } from "./building";
import { type GunItem } from "../inventory/gunItem";
import { MeleeItem } from "../inventory/meleeItem";

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

    lootSpawnOffset: Vector;

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

        this.lootSpawnOffset = lootSpawnOffset ?? v(0, 0);

        this.parentBuilding = parentBuilding;

        const definition = type.definition;
        this.definition = definition;

        this.health = this.maxHealth = definition.health;

        let hitboxRotation: Orientation = 0;

        if (this.definition.rotationMode === "limited") {
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
                    item.count);
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

    override damage(amount: number, source: GameObject, weaponUsed?: ObjectType | GunItem | MeleeItem): void {
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
                const position = vAdd(this.position, this.lootSpawnOffset);
                this.game.addLoot(ObjectType.fromString(ObjectCategory.Loot, item.idString), position, item.count);
            }

            if (this.definition.isWall) {
                this.parentBuilding?.damage();

                // a bit of a hack to break doors attached to walls :)
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

            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            this.scale = this.healthFraction * (this.maxScale - definition.scale.destroy) + definition.scale.destroy;
            const scaleFactor = this.scale / oldScale;

            // Transform the hitbox
            // TODO Move this code to the Hitbox classes
            if (this.hitbox instanceof CircleHitbox) {
                this.hitbox.radius *= scaleFactor;
            } else if (this.hitbox instanceof RectangleHitbox) {
                const rotatedRect = transformRectangle(
                    this.position,
                    vSub(this.hitbox.min, this.position),
                    vSub(this.hitbox.max, this.position),
                    scaleFactor,
                    0
                );
                this.hitbox.min = rotatedRect.min;
                this.hitbox.max = rotatedRect.max;
            }

            // Punch doors to open
            if (this.isDoor && source instanceof Player && weaponUsed instanceof MeleeItem) this.interact(source);
        }
    }

    interact(player: Player): void {
        if (this.dead || this.door === undefined) return;
        if (!(this.hitbox instanceof RectangleHitbox)) {
            throw new Error("Door with non-rectangular hitbox");
        }

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

        this.game.partialDirtyObjects.add(this);
    }

    override serializePartial(stream: SuroiBitStream): void {
        stream.writeScale(this.scale);
        stream.writeBoolean(this.dead);
        if (this.isDoor && this.door !== undefined) {
            stream.writeBits(this.door.offset, 2);
        }
    }

    override serializeFull(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
        stream.writeObstacleRotation(this.rotation, this.definition.rotationMode);
        if (this.definition.variations !== undefined) {
            stream.writeVariation(this.variation);
        }
    }
}
