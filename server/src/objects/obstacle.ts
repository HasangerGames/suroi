import {
    type Body, type Shape, type Vec2
} from "planck";

import { type Game } from "../game";

import { Explosion } from "./explosion";

import { type CollisionFilter, GameObject } from "../types/gameObject";
import { bodyFromHitbox } from "../utils/misc";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../common/src/utils/objectType";
import {
    vClone, type Vector, vSub
} from "../../../common/src/utils/vector";
import { transformRectangle } from "../../../common/src/utils/math";
import {
    CircleHitbox, type Hitbox, RectangleHitbox
} from "../../../common/src/utils/hitbox";
import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { ObjectCategory } from "../../../common/src/constants";
import { type Variation } from "../../../common/src/typings";
import { Player } from "./player";
import { Config } from "../config";
import { Loot } from "./loot";
import {
    type LootTable, LootTables, LootTiers, type WeightedItem
} from "../data/lootTables";
import { random, weightedRandom } from "../../../common/src/utils/random";

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

    health: number;
    maxHealth: number;
    maxScale: number;
    healthFraction = 1;

    variation: Variation;

    body?: Body;
    spawnHitbox: Hitbox;

    loot: string[] = [];

    constructor(game: Game, type: ObjectType, position: Vector, rotation: number, scale: number, variation: Variation = 0) {
        super(game, type, position);

        this.rotation = rotation;
        this.scale = this.maxScale = scale;
        this.variation = variation;

        const definition: ObstacleDefinition = type.definition as ObstacleDefinition;

        this.health = this.maxHealth = definition.health;
        this.hitbox = definition.hitbox.transform(this.position, this.scale);
        this.spawnHitbox = (definition.spawnHitbox ?? definition.hitbox).transform(this.position, this.scale);
        this.body = bodyFromHitbox(game.world, this.hitbox, 0, this.scale, definition.noCollisions, this);
        if (definition.hasLoot === true) {
            console.log(this.type.idString, LootTables[this.type.idString]);
            const lootTable: LootTable = LootTables[this.type.idString];
            const count: number = random(lootTable.min, lootTable.max);
            for (let i = 0; i < count; i++) this.getLoot(lootTable.loot);
        }
    }

    private getLoot(loot: WeightedItem[]): void {
        interface TempLootItem { item: string, isTier: boolean }
        const items: TempLootItem[] = [];
        const weights: number[] = [];
        for (const item of loot) {
            items.push({ item: "tier" in item ? item.tier : item.item, isTier: "tier" in item });
            weights.push(item.weight);
        }
        const selectedItem: TempLootItem = weightedRandom<TempLootItem>(items, weights);
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (selectedItem.isTier) this.getLoot(LootTiers[selectedItem.item]);
        else this.addLoot(selectedItem.item);
    }

    private addLoot(type: string): void {
        if (type === "nothing") return;
        this.loot.push(type);
        /*const weapon = Weapons[type];
        if (weapon?.ammo) {
            if (weapon.ammoSpawnCount === 1) {
                this.loot.push(new Item(weapon.ammo, 1));
            } else {
                const count: number = weapon.ammoSpawnCount / 2;
                this.loot.push(new Item(weapon.ammo, count));
                this.loot.push(new Item(weapon.ammo, count));
            }
        }*/
    }

    override damage(amount: number, source: GameObject): void {
        if (this.health === 0) return;
        this.health -= amount;

        const definition: ObstacleDefinition = this.type.definition as ObstacleDefinition;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;

            if (source instanceof Player && Config.switchMeleeWeapons) {
                source.obstaclesDestroyed[definition.material]++;
                if (source.obstaclesDestroyed.tree >= 6 &&
                    !(source.inventory.checkIfWeaponExists("branch") ||
                        source.inventory.checkIfWeaponExists("club") ||
                        source.inventory.checkIfWeaponExists("club_op") ||
                        source.inventory.checkIfWeaponExists("dagger"))
                ) {
                    source.inventory.addOrReplaceWeapon(2, Math.random() < 0.2 ? "club" : "branch");
                }
                if (source.obstaclesDestroyed.metal >= 5 &&
                    source.kills >= 2 &&
                    source.inventory.checkIfWeaponExists("club")) {
                    source.inventory.addOrReplaceWeapon(2, "club_op");
                }
            }

            this.scale = definition.scale.spawnMin;

            if (this.body != null) this.game.world.destroyBody(this.body);
            this.game.partialDirtyObjects.add(this);

            if (definition.explosion !== undefined) {
                const explosion = new Explosion(
                    this.game,
                    ObjectType.fromString(ObjectCategory.Explosion, definition.explosion),
                    this.position,
                    source);
                this.game.explosions.add(explosion);
            }

            for (const item of this.loot) {
                // eslint-disable-next-line no-new
                new Loot(this.game, ObjectType.fromString(ObjectCategory.Loot, item), vClone(this.position));
            }
        } else {
            this.healthFraction = this.health / this.maxHealth;
            const oldScale: number = this.scale;

            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            this.scale = this.healthFraction * (this.maxScale - definition.scale.destroy) + definition.scale.destroy;
            const scaleFactor: number = this.scale / oldScale;

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
        const definition: ObstacleDefinition = this.type.definition as ObstacleDefinition;
        stream.writePosition(this.position);
        stream.writeObstacleRotation(this.rotation, definition.rotationMode);
        if (definition.variations !== undefined) {
            stream.writeVariation(this.variation);
        }
    }
}
