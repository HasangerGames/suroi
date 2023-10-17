import { type ExplosionDefinition } from "../../../common/src/definitions/explosions";
import { ObjectCategory } from "../../../common/src/constants";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { angleBetweenPoints, distanceSquared } from "../../../common/src/utils/math";
import { ObjectType } from "../../../common/src/utils/objectType";
import { randomRotation } from "../../../common/src/utils/random";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { v, vAdd, type Vector, vRotate } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GameObject } from "../types/gameObject";
import { Loot } from "./loot";
import { Obstacle } from "./obstacle";
import { Player } from "./player";
import { Decal } from "./decal";

export class Explosion {
    game: Game;
    type: ObjectType<ObjectCategory.Explosion, ExplosionDefinition>;
    position: Vector;
    source: GameObject;

    constructor(game: Game, type: ObjectType<ObjectCategory.Explosion, ExplosionDefinition>, position: Vector, source: GameObject) {
        this.game = game;
        this.type = type;
        this.position = position;
        this.source = source;
    }

    explode(): void {
        const definition = this.type.definition;

        // list of all near objects
        const objects = this.game.grid.intersectsRect(new CircleHitbox(definition.radius.max * 2, this.position).toRectangle());

        const damagedObjects = new Map<number, boolean>();

        for (let angle = -Math.PI; angle < Math.PI; angle += 0.1) {
            // all objects that collided with this line
            const lineCollisions: Array<{
                object: GameObject
                pos: Vector
                distance: number
            }> = [];

            const lineEnd = vAdd(this.position, vRotate(v(definition.radius.max, 0), angle));

            for (const object of objects) {
                if (object.dead || !object.hitbox || !(object instanceof Obstacle || object instanceof Player || object instanceof Loot)) continue;

                // check if the object hitbox collides with a line from the explosion center to the explosion max distance
                const intersection = object.hitbox.intersectsLine(this.position, lineEnd);
                if (intersection) {
                    lineCollisions.push({
                        pos: intersection.point,
                        object,
                        distance: distanceSquared(this.position, intersection.point)
                    });
                }
            }

            // sort by closest to the explosion center to prevent damaging objects through walls
            lineCollisions.sort((a, b) => {
                return a.distance - b.distance;
            });

            for (const collision of lineCollisions) {
                const object = collision.object;

                if (!damagedObjects.has(object.id)) {
                    damagedObjects.set(object.id, true);
                    const dist = Math.sqrt(collision.distance);

                    if (object instanceof Player || object instanceof Obstacle) {
                        let damage = definition.damage;
                        if (object instanceof Obstacle) damage *= definition.obstacleMultiplier;

                        if (dist > definition.radius.min) {
                            const damagePercent = Math.abs(dist / definition.radius.max - 1);
                            damage *= damagePercent;
                        }

                        object.damage(damage, this.source, this.type);
                    }
                    if (object instanceof Loot) {
                        object.push(angleBetweenPoints(object.position, this.position), (definition.radius.max - dist) * 5);
                    }
                }
                if (object instanceof Obstacle && !object.definition.noCollisions) break;
            }
        }

        for (let i = 0; i < definition.shrapnelCount; i++) {
            this.game.addBullet(this, this.source, {
                position: this.position,
                rotation: randomRotation()
            });
        }

        if (definition.decal) {
            const decal = new Decal(this.game, ObjectType.fromString(ObjectCategory.Decal, definition.decal), this.position);
            this.game.grid.addObject(decal);
            this.game.updateObjects = true;
        }
    }

    serialize(stream: SuroiBitStream): void {
        stream.writeObjectTypeNoCategory(this.type);
        stream.writePosition(this.position);
    }
}
