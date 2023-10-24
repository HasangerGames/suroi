import { ObjectCategory } from "../../../common/src/constants";
import { Explosions, type ExplosionDefinition } from "../../../common/src/definitions/explosions";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { angleBetweenPoints, distanceSquared } from "../../../common/src/utils/math";
import { reifyDefinition, type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { randomRotation } from "../../../common/src/utils/random";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { v, vAdd, vRotate, type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GameObject } from "../types/gameObject";
import { Decal } from "./decal";
import { Loot } from "./loot";
import { Obstacle } from "./obstacle";
import { Player } from "./player";

export class Explosion<Def extends ExplosionDefinition = ExplosionDefinition> {
    readonly type = ObjectCategory.Explosion;

    readonly game: Game;
    readonly definition: Def;
    readonly position: Vector;
    readonly source: GameObject;

    constructor(game: Game, definition: ReferenceTo<Def> | Def, position: Vector, source: GameObject) {
        this.game = game;
        this.definition = reifyDefinition(definition, Explosions);
        this.position = position;
        this.source = source;
    }

    explode(): void {
        // List of all near objects
        const objects = this.game.grid.intersectsHitbox(new CircleHitbox(this.definition.radius.max * 2, this.position));
        const damagedObjects = new Map<number, boolean>();

        for (let angle = -Math.PI; angle < Math.PI; angle += 0.1) {
            // All objects that collided with this line
            const lineCollisions: Array<{
                readonly object: GameObject
                readonly pos: Vector
                readonly squareDistance: number
            }> = [];

            const lineEnd = vAdd(this.position, vRotate(v(this.definition.radius.max, 0), angle));

            for (const object of objects) {
                if (object.dead || !object.hitbox || !(object instanceof Obstacle || object instanceof Player || object instanceof Loot)) continue;

                // check if the object hitbox collides with a line from the explosion center to the explosion max distance
                const intersection = object.hitbox.intersectsLine(this.position, lineEnd);
                if (intersection) {
                    lineCollisions.push({
                        pos: intersection.point,
                        object,
                        squareDistance: distanceSquared(this.position, intersection.point)
                    });
                }
            }

            // sort by closest to the explosion center to prevent damaging objects through walls
            lineCollisions.sort((a, b) => a.squareDistance - b.squareDistance);

            const { min, max } = this.definition.radius;
            for (const collision of lineCollisions) {
                const object = collision.object;

                if (!damagedObjects.has(object.id)) {
                    damagedObjects.set(object.id, true);
                    const dist = Math.sqrt(collision.squareDistance);

                    if (object instanceof Player || object instanceof Obstacle) {
                        object.damage(
                            this.definition.damage *
                            (object instanceof Obstacle ? this.definition.obstacleMultiplier : 1) *
                            ((dist > min) ? (max - dist) / (max - min) : 1),

                            this.source,
                            this
                        );
                    }

                    if (object instanceof Loot) {
                        object.push(angleBetweenPoints(object.position, this.position), (max - dist) * 5);
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

    serialize(stream: SuroiBitStream): void {
        stream.writeUint8(Explosions.idStringToNumber[this.definition.idString]);
        stream.writePosition(this.position);
    }
}
