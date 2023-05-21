import {
    type Body,
    type Shape,
    type Vec2
} from "planck";

import { type Game } from "../game";

import { Explosion } from "./explosion";

import { GameObject } from "../types/gameObject";
import { bodyFromHitbox } from "../utils/misc";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../common/src/utils/objectType";
import { type Vector, vSub } from "../../../common/src/utils/vector";
import { transformRectangle } from "../../../common/src/utils/math";
import { CircleHitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { ObjectCategory } from "../../../common/src/constants";
import { type Variation } from "../../../common/src/typings";

export class Obstacle extends GameObject {
    readonly isPlayer = false;
    readonly isObstacle = true;
    readonly collidesWith = {
        player: true,
        obstacle: false
    };

    health: number;
    maxHealth: number;
    maxScale: number;
    healthFraction: number;

    variation: Variation;

    body?: Body;

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
    }

    damage(amount: number, source: GameObject): void {
        if (this.health === 0) return;
        this.health -= amount;
        const definition: ObstacleDefinition = this.type.definition as ObstacleDefinition;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
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
            /*for (const item of this.loot) {
                let lootPosition = this.position.clone();
                // TODO: add a "lootSpawnOffset" property for lockers and deposit boxes.
                if (this.typeString.includes("locker") || this.typeString.includes("deposit_box")) lootPosition = addAdjust(lootPosition, Vec2(0, -2), this.orientation);

                // eslint-disable-next-line no-new
                new Loot(this.game, item.type, lootPosition, this.layer, item.count);
            }*/
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
                const rotatedRect = transformRectangle(this.position,
                    vSub(this.hitbox.min, this.position),
                    vSub(this.hitbox.max, this.position),
                    scaleFactor, 0);
                this.hitbox.min = rotatedRect.min;
                this.hitbox.max = rotatedRect.max;
            }
            this.game.partialDirtyObjects.add(this);
        }
    }

    serializePartial(stream: SuroiBitStream): void {
        stream.writeScale(this.scale);
        stream.writeBoolean(this.dead);
    }

    serializeFull(stream: SuroiBitStream): void {
        const definition: ObstacleDefinition = this.type.definition as ObstacleDefinition;
        stream.writePosition(this.position);
        if (definition.rotation !== "none") stream.writeRotation(this.rotation);
        if (definition.variations !== undefined) stream.writeVariation(this.variation);
    }
}
