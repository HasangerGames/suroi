import { GameObject } from "../types/gameObject";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { type Vector, vSub } from "../../../common/src/utils/vector";
import { bodyFromHitbox } from "../utils/misc";
import {
    type Body, type Shape, type Vec2
} from "planck";
import { type Variation } from "../../../common/src/typings";
import { CircleHitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { transformRectangle } from "../../../common/src/utils/math";

export class Obstacle extends GameObject {
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
        this.spawnHitbox = definition.spawnHitbox.transform(this.position, this.scale);
        this.body = bodyFromHitbox(game.world, this.hitbox, 0, this.scale, this);
    }

    damage(amount: number, source): void {
        if (this.health === 0) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.destroyed = true;
            this.scale = (this.type.definition as ObstacleDefinition).scale.spawnMin;
            if (this.body != null) this.game.world.destroyBody(this.body);
            this.game.partialDirtyObjects.add(this);
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
            const definition: ObstacleDefinition = this.type.definition as ObstacleDefinition;
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
        stream.writeBoolean(this.destroyed);
    }

    serializeFull(stream: SuroiBitStream): void {
        const definition: ObstacleDefinition = this.type.definition as ObstacleDefinition;
        stream.writePosition(this.position);
        if (definition.rotation === "full") stream.writeRotation(this.rotation);
        if (definition.variations !== undefined) stream.writeVariation(this.variation);
    }
}
