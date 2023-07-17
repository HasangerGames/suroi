import { type Body, type Shape, type Vec2 } from "planck";

import { type Game } from "../game";

import { type CollisionFilter, GameObject } from "../types/gameObject";
import { type LootItem, bodyFromHitbox, getLootTableLoot } from "../utils/misc";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../common/src/utils/objectType";
import { vClone, type Vector, vSub } from "../../../common/src/utils/vector";
import { transformRectangle } from "../../../common/src/utils/math";
import { CircleHitbox, type Hitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { ObjectCategory } from "../../../common/src/constants";
import { type Variation } from "../../../common/src/typings";
import { LootTables } from "../data/lootTables";
import { random } from "../../../common/src/utils/random";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { type ItemDefinition, ItemType } from "../../../common/src/utils/objectDefinitions";
import { type ExplosionDefinition } from "../../../common/src/definitions/explosions";

export class Obstacle extends GameObject {
    override readonly is: CollisionFilter = {
        player: false,
        obstacle: true,
        bullet: false,
        loot: false
    };

    override readonly collidesWith: CollisionFilter = {
        player: true,
        obstacle: false,
        bullet: true,
        loot: true
    };

    readonly damageable = true;

    health: number;
    maxHealth: number;
    maxScale: number;
    healthFraction = 1;

    variation: Variation;

    body?: Body;
    spawnHitbox: Hitbox;

    loot: LootItem[] = [];

    definition: ObstacleDefinition;

    constructor(game: Game, type: ObjectType<ObjectCategory.Obstacle, ObstacleDefinition>, position: Vector, rotation: number, scale: number, variation: Variation = 0) {
        super(game, type, position);

        this.rotation = rotation;
        this.scale = this.maxScale = scale;
        this.variation = variation;

        const definition = type.definition;
        this.definition = definition;

        this.health = this.maxHealth = definition.health;
        this.hitbox = definition.hitbox.transform(this.position, this.scale);
        this.spawnHitbox = (definition.spawnHitbox ?? definition.hitbox).transform(this.position, this.scale);
        this.body = bodyFromHitbox(game.world, this.hitbox, 0, this.scale, definition.noCollisions, this);

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
    }

    override damage(amount: number, source: GameObject, weaponUsed?: ObjectType): void {
        const definition = this.definition;
        if (this.health === 0 || definition.indestructible) return;

        const weaponDef = (weaponUsed?.definition as ItemDefinition);
        if (
            definition.impenetrable &&
            !(weaponDef.itemType === ItemType.Melee && (weaponDef as MeleeDefinition).piercingMultiplier)
        ) {
            return;
        }

        this.health -= amount;

        if (this.health <= 0 || this.dead) {
            this.health = 0;
            this.dead = true;

            this.scale = definition.scale.spawnMin;

            if (this.body != null) this.game.world.destroyBody(this.body);
            this.game.partialDirtyObjects.add(this);

            if (definition.explosion !== undefined) {
                this.game.addExplosion(
                    ObjectType.fromString<ObjectCategory.Explosion, ExplosionDefinition>(ObjectCategory.Explosion, definition.explosion),
                    this.position,
                    source
                );
            }

            for (const item of this.loot) {
                this.game.addLoot(ObjectType.fromString(ObjectCategory.Loot, item.idString), vClone(this.position), item.count);
            }
        } else {
            this.healthFraction = this.health / this.maxHealth;
            const oldScale = this.scale;

            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            this.scale = this.healthFraction * (this.maxScale - definition.scale.destroy) + definition.scale.destroy;
            const scaleFactor = this.scale / oldScale;

            // Transform the Planck.js Body
            if (this.body != null) {
                const shape = this.body.getFixtureList()?.getShape() as Shape & { m_vertices: Vec2[] };
                if (this.hitbox instanceof CircleHitbox) {
                    shape.m_radius = shape.m_radius * scaleFactor;
                } else if (this.hitbox instanceof RectangleHitbox) {
                    for (let i = 0, length = shape.m_vertices.length; i < length; i++) {
                        shape.m_vertices[i] = shape.m_vertices[i].clone().mul(scaleFactor);
                    }
                }
            }

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

            this.game.partialDirtyObjects.add(this);
        }
    }

    override serializePartial(stream: SuroiBitStream): void {
        stream.writeScale(this.scale);
        stream.writeBoolean(this.dead);
    }

    override serializeFull(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
        stream.writeObstacleRotation(this.rotation, this.definition.rotationMode);
        if (this.definition.variations !== undefined) {
            stream.writeVariation(this.variation);
        }
    }
}
