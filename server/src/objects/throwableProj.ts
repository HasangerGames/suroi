import { Layer, ObjectCategory } from "@common/constants";
import { FlyoverPref } from "@common/definitions/obstacles";
import { type ThrowableDefinition } from "@common/definitions/throwables";
import { CircleHitbox, Hitbox, HitboxGroup, HitboxType, RectangleHitbox } from "@common/utils/hitbox";
import { Angle, Collision, Numeric } from "@common/utils/math";
import { type FullData } from "@common/utils/objectsSerializations";
import { FloorTypes } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";

import { type Game } from "../game";
import { type ThrowableItem } from "../inventory/throwableItem";
import { dragConst } from "../utils/misc";
import { BaseGameObject, type GameObject } from "./gameObject";
import { Obstacle } from "./obstacle";
import { Player } from "./player";

export class ThrowableProjectile extends BaseGameObject.derive(ObjectCategory.ThrowableProjectile) {
    override readonly fullAllocBytes = 16;
    override readonly partialAllocBytes = 4;

    private health?: number;

    declare readonly hitbox: CircleHitbox;

    private _velocity = Vec.create(0, 0);

    get velocity(): Vector { return this._velocity; }
    set velocity(velocity: Partial<Vector>) {
        this._velocity.x = velocity.x ?? this._velocity.x;
        this._velocity.y = velocity.y ?? this._velocity.y;
    }

    private _angularVelocity = 0.0035;
    get angularVelocity(): number { return this._angularVelocity; }

    private readonly _spawnTime: number;

    /**
     * Grace period to prevent impact damage and collision logic
     * from instantly being applied to the grenade's owner
     */
    private _collideWithOwner = false;

    /**
     * Ensures that the drag experienced is not dependant on tickrate.
     * This particular exponent results in a 10% loss every 83ms (or a 50% loss every 546.2ms)
     *
     * Precise results obviously depend on the tickrate
     */
    private static readonly _dragConstant = dragConst(2.79, 1.6);

    /**
     * Used for creating extra drag on the projectile, in the same tickrate-independent manner
     *
     * This constant results in a 10% loss every 41.5ms (or a 50% loss every 273.1ms)
     */
    private static readonly _harshDragConstant = dragConst(5.4, 1.6);

    override get position(): Vector { return this.hitbox.position; }

    private _airborne = true;
    get airborne(): boolean { return this._airborne; }

    private _activated = false;
    get activated(): boolean { return this._activated; }

    private readonly _currentlyAbove = new Set<Obstacle>();

    public static readonly squaredThresholds = Object.freeze({
        impactDamage: 0.0009 as number,
        flyover: 0.0009 as number,
        highFlyover: 0.0016 as number
    });

    private _currentDragConst = ThrowableProjectile._dragConstant;

    /**
     * Every object gets an "invincibility tick" cause otherwise, throwables will
     * hit something, causing it to shrink, allowing the grenade to hit it again next tick,
     * leading to a chain reaction that can vaporize certain unlucky objects
     */
    private _damagedLastTick = new Set<GameObject>();

    private readonly _dt = this.game.dt;

    constructor(
        game: Game,
        position: Vector,
        layer: Layer,
        readonly definition: ThrowableDefinition,
        readonly source: ThrowableItem,
        radius?: number
    ) {
        super(game, position);
        this.layer = layer;
        this._spawnTime = this.game.now;
        this.hitbox = new CircleHitbox(radius ?? 1, position);

        for (const object of this.game.grid.intersectsHitbox(this.hitbox)) {
            this.handleCollision(object);
        }
        if (this.definition.c4) {
            this.source.owner.c4s.push(this);
            this.source.owner.updatedC4Button = false;
        }
        if (this.definition.health) this.health = this.definition.health;
    }

    push(angle: number, speed: number): void {
        this.velocity = Vec.add(this.velocity, Vec.fromPolar(angle, speed));
    }

    private _calculateSafeDisplacement(halfDt: number): Vector {
        let displacement = Vec.scale(this.velocity, halfDt);

        const displacementLength = Vec.length(displacement);
        const maxDisplacement = this.definition.speedCap * halfDt;

        if (displacementLength > maxDisplacement) {
            displacement = Vec.scale(displacement, maxDisplacement / displacementLength);
        }

        return displacement;
    }

    detonate(delay: number): void {
        this._activated = true;
        this.setDirty();
        setTimeout(() => {
            this.game.removeProjectile(this);

            const { explosion } = this.definition.detonation;

            const referencePosition = Vec.clone(this.position ?? this.source.owner.position);
            const game = this.game;

            if (explosion !== undefined) {
                game.addExplosion(
                    explosion,
                    referencePosition,
                    this.source.owner,
                    this.layer
                );
            }
        }, delay);
    }

    update(): void {
        if (this.definition.c4) {
            this._airborne = false;
            this.game.grid.updateObject(this);
            this.setPartialDirty();
            return;
        }

        const halfDt = 0.5 * this._dt;

        // Create a copy of the original hitbox position.
        // We need to know the hitbox's position before and after the proposed update to perform ray casting as part of
        // continuous collision detection.
        const originalHitboxPosition: Vector = Vec.clone(this.hitbox.position);

        this.hitbox.position = Vec.add(this.hitbox.position, this._calculateSafeDisplacement(halfDt));

        this._velocity = { ...Vec.scale(this._velocity, this._currentDragConst) };

        this.hitbox.position = Vec.add(this.hitbox.position, this._calculateSafeDisplacement(halfDt));

        this.rotation = Angle.normalize(this.rotation + this._angularVelocity * this._dt);

        const impactDamage = this.definition.impactDamage;
        const currentSquaredVel = Vec.squaredLength(this.velocity);
        const squaredThresholds = ThrowableProjectile.squaredThresholds;
        const remainAirborne = currentSquaredVel >= squaredThresholds.impactDamage;
        const shouldDealImpactDamage = impactDamage !== undefined && remainAirborne;

        if (!remainAirborne) {
            this._airborne = false;

            if (FloorTypes[this.game.map.terrain.getFloor(this.position, this.layer)].overlay) {
                this._currentDragConst = ThrowableProjectile._harshDragConstant;
            }
        }

        const flyoverCondMap = {
            [FlyoverPref.Always]: currentSquaredVel >= squaredThresholds.flyover,
            [FlyoverPref.Sometimes]: currentSquaredVel >= squaredThresholds.highFlyover,
            [FlyoverPref.Never]: false
        };

        const canFlyOver = (obstacle: Obstacle): boolean => {
            /*
                Closed doors can never be flown over
            */
            return obstacle.door?.isOpen !== false && (
                /*
                    If the obstacle is of a lower layer than this throwable, then the throwable can fly over it.
                    This allows throwables to go down stairs with ease.
                */
                obstacle.layer < this.layer
                /*
                    Otherwise, check conditions as normal
                */
                || flyoverCondMap[obstacle.definition.allowFlyover]
            );
        };

        const damagedThisTick = new Set<GameObject>();

        for (const object of this.game.grid.intersectsHitbox(this.hitbox, this.layer)) {
            const isObstacle = object instanceof Obstacle;
            const isPlayer = object instanceof Player;

            if (
                object.dead
                || (
                    (!isObstacle || !object.collidable)
                    && (!isPlayer || !shouldDealImpactDamage || (!this._collideWithOwner && object === this.source.owner))
                )
            ) continue;

            // This is a discrete collision detection that looks for overlap between geometries.
            const isGeometricCollision = object.hitbox.collidesWith(this.hitbox);
            // This is a continuous collision detection that looks for an intersection between this object's path of
            // travel and the boundaries of the object.
            const rayCastCollisionPointWithObject: Vector | null = this._travelCollidesWith(
                originalHitboxPosition, this.hitbox.position, object.hitbox
            );
            const isRayCastedCollision = rayCastCollisionPointWithObject !== null;

            // dedl0x: Leaving this here because it's very helpful for analyzing ray casting results.
            // if (isRayCastedCollision) {
            // console.log(`Found a ray-casted collision!`);
            // const movementVector: Vector = Vec.sub(this.hitbox.position, originalHitboxPosition);
            // console.log(`Po: (${ originalHitboxPosition.x }, ${ originalHitboxPosition.y }), Pn: (${ this.hitbox.position.x }, ${ this.hitbox.position.y }), M: ${ Vec.length(movementVector) }`);
            // console.log(`I: (${ rayCastCollisionPointWithObject.x}, ${ rayCastCollisionPointWithObject.y})`)
            // }

            const collidingWithObject = isGeometricCollision || isRayCastedCollision;

            if (isObstacle) {
                if (collidingWithObject) {
                    // console.log(`Colliding with object!`, object.data)

                    let isAbove = false;
                    if (isAbove = canFlyOver(object)) {
                        this._currentlyAbove.add(object);
                    } else {
                        this._currentDragConst = ThrowableProjectile._harshDragConstant;
                    }

                    if (object.definition.isStair) {
                        // console.log(`Colliding with a stair-type object! TransportTo: ${object.layer}`);
                        object.handleStairInteraction(this);
                        continue;
                    }

                    if (isAbove || this._currentlyAbove.has(object)) {
                        continue;
                    }
                }

                this._currentlyAbove.delete(object);
            }

            if (!collidingWithObject) continue;
            // else console.log(object.data);

            if (shouldDealImpactDamage && !this._damagedLastTick.has(object)) {
                object.damage({
                    amount: impactDamage * ((isObstacle ? this.definition.obstacleMultiplier : undefined) ?? 1),
                    source: this.source.owner,
                    weaponUsed: this.source
                });

                if (object.dead) {
                    continue;
                }

                damagedThisTick.add(object);
            }

            // If ray casting has identified an intersection with the boundary line segments of this obstacle, then the
            // hitbox position should be updated to be somewhere between this throwable's original position and the
            // intersection point.
            if (isRayCastedCollision && rayCastCollisionPointWithObject !== null) {
                // The path of travel is as follows.
                // (S)----(I)-------------(E)
                // Where...
                //  * (S) is the start of the line segment.
                //  * (E) is the end of the line segment.
                //  * (I) is the intersection point (with some obstacle boundary) along the line segment.
                //
                // If we set the hitbox's new position to the intersection point, then it makes the overlap detection
                // and correction done in `handleCollision` create wonky results.
                // We can start by placing the hitbox center at the intersection, then move it towards the start of the
                // line segment by a distance equal to some ratio of the hitbox's radius. This reduces the overlap,
                // but in a way that increases the likelihood of the correct normal vector being returned, and so
                // decreases the likelihood of the object being pulled through the obstacle.

                this.hitbox.position = Vec.add(
                    Vec.clone(rayCastCollisionPointWithObject),
                    Vec.scale(
                        Vec.normalize(
                            Vec.sub(
                                rayCastCollisionPointWithObject,
                                originalHitboxPosition
                            )
                        ),
                        // 5 works pretty well based on testing
                        -this.hitbox.radius / 5
                    )
                );
            }

            this.handleCollision(object);

            this._angularVelocity *= 0.6;
        }

        const selfRadius = this.hitbox.radius;
        this.position.x = Numeric.clamp(this.position.x, selfRadius, this.game.map.width - selfRadius);
        this.position.y = Numeric.clamp(this.position.y, selfRadius, this.game.map.height - selfRadius);

        this._collideWithOwner ||= this.game.now - this._spawnTime >= 250;
        this._damagedLastTick = damagedThisTick;
        this.game.grid.updateObject(this);
        this.setPartialDirty();
    }

    /**
     * Returns the point of intersection with the hitbox's boundary line segments that is closest to the start of
     * travel or trajectory.
     * @param travelStart The point where the travel starts.
     * @param travelEnd The point where the travel ends.
     * @param hitbox A hitbox whose boundaries will be used to look for intersections with the trajectory.
     * @returns The point of intersection closest to the starting position; `null` if no intersection exists.
     */
    private _travelCollidesWith(travelStart: Vector, travelEnd: Vector, hitbox: Hitbox): Vector | null {
        // Checks for an intersection between the path of travel and all of the provided boundary line segments.
        // The intersection that is closest to the trajectory's starting position is returned.
        const getClosestIntersection = (boundaryLineSegments: ReadonlyArray<readonly [Vector, Vector]>): Vector | null => {
            let nearestIntersection: Vector | null = null;
            let nearestIntersectionSqDist = Infinity;

            // Check each of the line segments for intersection with the path of travel.
            for (const lineSegment of boundaryLineSegments) {
                const intersection: Vector | null = Collision.lineSegmentIntersection(
                    travelStart, travelEnd,
                    lineSegment[0], lineSegment[1]
                );

                if (
                    intersection === null
                    // If a nearest intersection doesn't already exist, then this is the new nearest.
                    || (nearestIntersection ??= intersection) === intersection
                ) {
                    continue;
                }

                // Create a new Vector from the starting position to this intersection position.
                const startToIntersection = Vec.sub(intersection, travelStart);

                // If the length of that Vector is less than nearest intersection encountered so far, then this
                // intersection is closer, or precedes previously encountered intersections.
                const startToIntersectionLength = Vec.squaredLength(startToIntersection);
                if (startToIntersectionLength < nearestIntersectionSqDist) {
                    nearestIntersection = intersection;
                    nearestIntersectionSqDist = startToIntersectionLength;
                }
            }

            return nearestIntersection;
        };

        // Returns a list of point pairs for the line segments that comprise the boundaries of the rectangular hitbox.
        const getBoundaryLineSegmentsForRectangle = (hitbox: RectangleHitbox): ReadonlyArray<readonly [Vector, Vector]> => {
            const hitboxTopLeftPoint: Vector = Vec.clone(hitbox.min);
            const hitboxTopRightPoint: Vector = Vec.create(hitbox.max.x, hitbox.min.y);
            const hitboxBottomLeftPoint: Vector = Vec.create(hitbox.min.x, hitbox.max.y);
            const hitboxBottomRightPoint: Vector = Vec.clone(hitbox.max);

            return [
                [hitboxTopLeftPoint, hitboxTopRightPoint],
                [hitboxBottomLeftPoint, hitboxBottomRightPoint],
                [hitboxTopLeftPoint, hitboxBottomLeftPoint],
                [hitboxTopRightPoint, hitboxBottomRightPoint]
            ];
        };

        const handleRectangle = (hitbox: RectangleHitbox): Vector | null => {
            return getClosestIntersection(getBoundaryLineSegmentsForRectangle(hitbox));
        };

        const handleGroup = (hitbox: HitboxGroup): Vector | null => {
            return getClosestIntersection(
                hitbox.hitboxes
                    .filter(hitbox => hitbox instanceof RectangleHitbox) // FIXME remove when circles are supported
                    .flatMap(rect => getBoundaryLineSegmentsForRectangle(rect))
            );
        };

        switch (hitbox.type) {
            // Not currently supported.
            // look into using Collision.lineIntersectsCircle
            // case HitboxType.Circle: {
            //     handleCircle(hitbox);
            //     break;
            // }
            case HitboxType.Rect: return handleRectangle(hitbox);
            case HitboxType.Group: return handleGroup(hitbox);
            default: return null;
        }
    }

    handleCollision(object: GameObject): void {
        const isObstacle = object instanceof Obstacle;
        const isPlayer = object instanceof Player;

        if (
            object.dead
            || (
                (!isObstacle || !object.collidable)
                && (!isPlayer || (!this._collideWithOwner && object === this.source.owner))
            )
        ) return;

        const hitbox = object.hitbox;
        const collidingWithObject = object.hitbox.collidesWith(this.hitbox);

        if (!collidingWithObject) return;

        const handleCircle = (hitbox: CircleHitbox): void => {
            const collision = Collision.circleCircleIntersection(this.position, this.hitbox.radius, hitbox.position, hitbox.radius);

            if (collision) {
                this.velocity = Vec.sub(this._velocity, Vec.scale(collision.dir, 0.8 * Vec.length(this._velocity)));
                this.hitbox.position = Vec.sub(this.hitbox.position, Vec.scale(collision.dir, collision.pen));
            }
        };

        const handleRectangle = (hitbox: RectangleHitbox): void => {
            const collision = Collision.rectCircleIntersection(hitbox.min, hitbox.max, this.hitbox.position, this.hitbox.radius);
            // dedl0x: I'm not sure why `this.position` was used instead of `this.hitbox.position`, but I get better
            // behavior using the latter.
            // const collision = Collision.rectCircleIntersection(hitbox.min, hitbox.max, this.position, this.hitbox.radius);

            if (collision) {
                this._velocity = Vec.add(
                    this._velocity,
                    Vec.scale(
                        Vec.project(
                            this._velocity,
                            Vec.scale(collision.dir, 1)
                        ),
                        -1.5
                    )
                );

                this.hitbox.position = Vec.sub(
                    this.hitbox.position,
                    Vec.scale(
                        collision.dir,
                        // dedl0x: Scaling by 1.5 fixes throwing grenades through thinner walls when facing [30, 45]
                        // degrees.
                        ((hitbox.isPointInside(this.hitbox.position) ? -1 : 1) * collision.pen * 1.5)
                        // "why?", you ask
                        // cause it makes the thingy work and rectCircleIntersection is goofy
                    )
                );
            } else {
                console.log("No collision in handleRectangle");
            }
        };

        switch (hitbox.type) {
            case HitboxType.Circle: {
                handleCircle(hitbox);
                break;
            }
            case HitboxType.Rect: {
                handleRectangle(hitbox);
                break;
            }
            case HitboxType.Group: {
                for (const target of hitbox.hitboxes) {
                    if (target.collidesWith(this.hitbox)) {
                        target instanceof CircleHitbox
                            ? handleCircle(target)
                            : handleRectangle(target);
                    }
                }
                break;
            }
        }
    }

    damageC4(amount: number): void {
        if (!this.health) return;

        this.health = this.health - amount;
        if (this.health <= 0) {
            // use a Set instead
            this.source.owner.c4s.splice(this.source.owner.c4s.indexOf(this), 1);
            this.game.removeProjectile(this);
            this.source.owner.updatedC4Button = false;

            const { particles } = this.definition.detonation;
            const referencePosition = Vec.clone(this.position ?? this.source.owner.position);
            // what?? why are these synced particles?
            if (particles !== undefined) this.game.addSyncedParticles(particles, referencePosition, this.source.owner.layer);
        }
    }

    override damage(): void { /* can't damage a throwable projectile */ }

    get data(): FullData<ObjectCategory.ThrowableProjectile> {
        return {
            position: this.position,
            rotation: this.rotation,
            layer: this.layer,
            airborne: this._airborne,
            activated: this._activated,
            full: {
                definition: this.definition
            }
        };
    }
}
