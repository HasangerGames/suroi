import { Explosions, type ExplosionDefinition } from "../../../common/src/definitions/explosions";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { Angle, Geometry } from "../../../common/src/utils/math";
import { type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { randomRotation } from "../../../common/src/utils/random";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { Decal } from "./decal";
import { type GameObject } from "./gameObject";
import { Loot } from "./loot";
import { Obstacle } from "./obstacle";
import { Player } from "./player";
import { ThrowableProjectile } from "./throwableProj";

export class Explosion {
    readonly game: Game;
    readonly definition: ExplosionDefinition;
    readonly position: Vector;
    readonly source: GameObject;

    constructor(game: Game, definition: ReifiableDef<ExplosionDefinition>, position: Vector, source: GameObject) {
        this.game = game;
        this.definition = Explosions.reify(definition);
        this.position = position;
        this.source = source;
    }

    explode(): void {
        // List of all near objects
        const objects = this.game.grid.intersectsHitbox(new CircleHitbox(this.definition.radius.max * 2, this.position));
        const damagedObjects = new Set<number>();

        for (let angle = -Math.PI; angle < Math.PI; angle += 0.1) {
            // All objects that collided with this line
            const lineCollisions: Array<{
                readonly object: GameObject
                readonly pos: Vector
                readonly squareDistance: number
            }> = [];

            const lineEnd = Vec.add(this.position, Vec.fromPolar(angle, this.definition.radius.max));

            for (const object of objects) {
                if (
                    object.dead
                    || !object.hitbox
                    || ![
                        Obstacle,
                        Player,
                        Loot,
                        ThrowableProjectile
                    ].some(cls => object instanceof cls)
                ) continue;

                // check if the object hitbox collides with a line from the explosion center to the explosion max distance
                const intersection = object.hitbox.intersectsLine(this.position, lineEnd);
                if (intersection) {
                    lineCollisions.push({
                        pos: intersection.point,
                        object,
                        squareDistance: Geometry.distanceSquared(this.position, intersection.point)
                    });
                }
            }

            // sort by closest to the explosion center to prevent damaging objects through walls
            lineCollisions.sort((a, b) => a.squareDistance - b.squareDistance);

            const { min, max } = this.definition.radius;
            for (const collision of lineCollisions) {
                const object = collision.object;

                if (!damagedObjects.has(object.id)) {
                    damagedObjects.add(object.id);
                    const dist = Math.sqrt(collision.squareDistance);

                    if (object instanceof Player || object instanceof Obstacle) {
                        object.damage({
                            amount: this.definition.damage
                            * (object instanceof Obstacle ? this.definition.obstacleMultiplier : 1)
                            * ((dist > min) ? (max - dist) / (max - min) : 1),

                            source: this.source,
                            weaponUsed: this
                        }
                        );
                    }

                    if (object instanceof Loot || object instanceof ThrowableProjectile) {
                        object.push(
                            Angle.betweenPoints(object.position, this.position),
                            (max - dist) * 0.01
                        );
                    }
                }

                if (object instanceof Obstacle && !object.definition.noCollisions) break;
            }
        }

        for (let i = 0, count = this.definition.shrapnelCount; i < count; i++) {
            this.game.addBullet(
                this,
                this.source,
                {
                    position: this.position,
                    rotation: randomRotation()
                }
            );
        }

        if (this.definition.decal) {
            this.game.grid.addObject(
                new Decal(
                    this.game,
                    this.definition.decal,
                    this.position
                )
            );

            this.game.updateObjects = true;
        }
    }
}
