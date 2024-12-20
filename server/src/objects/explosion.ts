import { Layer } from "@common/constants";
import { Explosions, type ExplosionDefinition } from "@common/definitions/explosions";
import { PerkIds } from "@common/definitions/perks";
import { CircleHitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer } from "@common/utils/layer";
import { Angle, Geometry } from "@common/utils/math";
import { type ReifiableDef } from "@common/utils/objectDefinitions";
import { randomRotation } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { type GunItem } from "../inventory/gunItem";
import { type MeleeItem } from "../inventory/meleeItem";
import { type ThrowableItem } from "../inventory/throwableItem";
import { Building } from "./building";
import { Decal } from "./decal";
import { type GameObject } from "./gameObject";
import { Loot } from "./loot";
import { Obstacle } from "./obstacle";
import { Player } from "./player";
import { ThrowableProjectile } from "./throwableProj";

export class Explosion {
    readonly definition: ExplosionDefinition;

    constructor(
        readonly game: Game,
        definition: ReifiableDef<ExplosionDefinition>,
        readonly position: Vector,
        readonly source: GameObject,
        readonly layer: Layer,
        readonly weapon?: GunItem | MeleeItem | ThrowableItem,
        readonly damageMod = 1
    ) {
        this.definition = Explosions.reify(definition);
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
                        Building,
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
                const { isPlayer, isObstacle, isBuilding, isLoot, isThrowableProjectile } = object;

                if (!damagedObjects.has(object.id)) {
                    damagedObjects.add(object.id);
                    const dist = Math.sqrt(collision.squareDistance);

                    if ((isPlayer || isObstacle || isBuilding) && adjacentOrEqualLayer(object.layer, this.layer)) {
                        object.damage({
                            amount: this.damageMod * this.definition.damage
                                * (isObstacle ? this.definition.obstacleMultiplier : 1)
                                * (isPlayer ? object.mapPerkOrDefault(PerkIds.LowProfile, ({ explosionMod }) => explosionMod, 1) : 1)
                                * ((dist > min) ? (max - dist) / (max - min) : 1),

                            source: this.source,
                            weaponUsed: this
                        });

                        // Destroy pallets
                        if (object.isObstacle && object.definition.pallet) {
                            object.dead = true;
                            object.setDirty();
                        }
                    }

                    if ((isLoot || isThrowableProjectile) && adjacentOrEqualLayer(object.layer, this.layer)) {
                        if (isThrowableProjectile) object.damage({ amount: this.definition.damage });

                        const multiplier = isThrowableProjectile ? 0.002 : 0.01;
                        object.push(
                            Angle.betweenPoints(object.position, this.position),
                            (max - dist) * multiplier
                        );
                    }
                }

                if (
                    (isObstacle
                        && !object.definition.noCollisions
                        && !object.definition.isStair
                    ) || (isBuilding && !object.definition.noCollisions)
                ) {
                    /*
                        an Obstacle with collisions will "eat" an explosion, protecting
                        the objects further from the explosion than itself ("behind" it;
                        this is what the break statement achieves); however, this is not
                        the case for stairs. stairs have collisions, but do not protect
                        those within them. and so for stairs, the show must go on
                    */
                    break;
                }
            }
        }

        for (let i = 0, count = this.definition.shrapnelCount; i < count; i++) {
            this.game.addBullet(
                this,
                this.source,
                {
                    position: this.position,
                    rotation: randomRotation(),
                    layer: this.layer
                }
            );
        }

        if (this.definition.decal) {
            this.game.grid.addObject(
                new Decal(
                    this.game,
                    this.definition.decal,
                    this.position,
                    randomRotation(),
                    this.layer
                )
            );

            this.game.updateObjects = true;
        }
    }
}
