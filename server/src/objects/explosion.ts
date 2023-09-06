import { type Game } from "../game";

import { type GameObject } from "../types/gameObject";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type ExplosionDefinition } from "../../../common/src/definitions/explosions";
import { v, vAdd, vRotate, type Vector } from "../../../common/src/utils/vector";
import { distance, distanceSquared } from "../../../common/src/utils/math";
import { Obstacle } from "./obstacle";
import { type ObjectCategory } from "../../../common/src/constants";
import { Player } from "./player";
import { CircleHitbox } from "../../../common/src/utils/hitbox";

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
        const objects = this.game.grid.intersectsRect(new CircleHitbox(definition.radius.max, this.position).toRectangle());

        // list of all collisions to damage
        const collisions: Array<{
            object: GameObject
            pos: Vector
        }> = [];

        for (let angle = -Math.PI; angle < Math.PI; angle += 0.1) {
            // all objects that collided with this line
            const lineCollisions: Array<{
                object: GameObject
                pos: Vector
            }> = [];

            const lineEnd = vAdd(this.position, vRotate(v(definition.radius.max, 0), angle));

            for (const object of objects) {
                if (object.dead || !object.hitbox || !(object instanceof Obstacle || object instanceof Player)) continue;

                // check if the object hitbox collides with a line from the explosion center to the explosion max distance
                const intersection = object.hitbox.intersectsLine(this.position, lineEnd);
                if (intersection) {
                    lineCollisions.push({
                        pos: intersection.point,
                        object
                    });
                }
            }

            // sort by closest to the explosion center to prevent damaging objects through walls
            lineCollisions.sort((a, b) => {
                return distanceSquared(a.pos, this.position) - distanceSquared(b.pos, this.position);
            });
            if (lineCollisions[0] && !collisions.find((x) => x.object.id === lineCollisions[0].object.id)) {
                collisions.push(lineCollisions[0]);
            }
        }

        // do the damage
        for (const collision of collisions) {
            const dist = distance(this.position, collision.pos);
            const object = collision.object;

            if (object instanceof Player || object instanceof Obstacle) {
                let damage = definition.damage;
                if (object instanceof Obstacle) damage *= definition.obstacleMultiplier;

                if (dist > definition.radius.min) {
                    const damagePercent = Math.abs(dist / definition.radius.max - 1);
                    damage *= damagePercent;
                }

                object.damage(damage, this.source, this.type);
            }
        }
    }

    serialize(stream: SuroiBitStream): void {
        stream.writeObjectTypeNoCategory(this.type);
        stream.writePosition(this.position);
    }
}
