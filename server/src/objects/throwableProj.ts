import { Layer, ObjectCategory } from "@common/constants";
import { FlyoverPref } from "@common/definitions/obstacles";
import { type ThrowableDefinition } from "@common/definitions/throwables";
import { CircleHitbox, HitboxType, type RectangleHitbox } from "@common/utils/hitbox";
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

export class ThrowableProjectile extends BaseGameObject<ObjectCategory.ThrowableProjectile> {
    override readonly type = ObjectCategory.ThrowableProjectile;
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

    private static readonly _extraHarshDragConstant = dragConst(6.7, 1.6);

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

            if (FloorTypes[this.game.map.terrain.getFloor(this.position, 0)].overlay) {
                this._currentDragConst = ThrowableProjectile._harshDragConstant;
            }
        }

        const flyoverCondMap = {
            [FlyoverPref.Always]: currentSquaredVel >= squaredThresholds.flyover,
            [FlyoverPref.Sometimes]: currentSquaredVel >= squaredThresholds.highFlyover,
            [FlyoverPref.Never]: false
        };

        const canFlyOver = (obstacle: Obstacle): boolean => {
            // If the obstacle is a door, and the door is not open, then the throwable cannot fly over it.
            if (obstacle.door?.isOpen === false) return false;
            // If the obstacle is of a lower layer than this throwable, then the throwable can fly over it.
            // This allows throwables to go down stairs with ease.
            if (obstacle?.layer < this.layer) {
                // console.log(`Flying over lower layer object. Object: ${ obstacle.layer }, Throwable: ${ this.layer }`);
                return true;
            }

            return flyoverCondMap[obstacle.definition.allowFlyover];
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

            const collidingWithObject = object.hitbox.collidesWith(this.hitbox);

            if (isObstacle) {
                if (collidingWithObject) {
                    let isAbove = false;
                    if (isAbove = canFlyOver(object)) {
                        this._currentlyAbove.add(object);

                        // If the colliding object is a stair-type object, and its layer is greater than this throwable's
                        // current layer, then this throwable appears to have been thrown up the stairs.
                        // To emulate the difficulty of throwing something up the stairs, apply a higher drag coefficient
                        // to slow it down.
                        if (object.definition?.isStair && object.layer > this.layer) {
                            // console.log(`Colliding with higher layer object. Object: ${ object.layer }, Throwable: ${ this.layer }`);
                            this._currentDragConst = ThrowableProjectile._extraHarshDragConstant;
                        }
                    } else {
                        this._currentDragConst = ThrowableProjectile._harshDragConstant;
                    }

                    if (object.definition.isStair) {
                        // console.log(`Colliding with a stair-type object! TransportTo: ${object.definition.transportTo}`)
                        if (object.definition?.transportTo != null) {
                            this.layer = object.definition.transportTo;
                        }
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

            if (
                object.dead
                || (
                    (!isObstacle || !object.collidable)
                    && (!isPlayer || (!this._collideWithOwner && object === this.source.owner))
                )
            ) return;

            const hitbox = object.hitbox;

            if (!collidingWithObject) return;

            const handleCircle = (hitbox: CircleHitbox): void => {
                const collision = Collision.circleCircleIntersection(this.position, this.hitbox.radius, hitbox.position, hitbox.radius);

                if (collision) {
                    this.velocity = Vec.sub(this._velocity, Vec.scale(collision.dir, 0.8 * Vec.length(this._velocity)));
                    this.hitbox.position = Vec.sub(this.hitbox.position, Vec.scale(collision.dir, collision.pen));
                }
            };

            const handleRectangle = (hitbox: RectangleHitbox): void => {
                const collision = Collision.rectCircleIntersection(hitbox.min, hitbox.max, this.position, this.hitbox.radius);

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
                            (hitbox.isPointInside(this.hitbox.position) ? -1 : 1) * collision.pen
                            // "why?", you ask
                            // cause it makes the thingy work and rectCircleIntersection is goofy
                        )
                    );
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
            const collision = Collision.rectCircleIntersection(hitbox.min, hitbox.max, this.position, this.hitbox.radius);

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
                        (hitbox.isPointInside(this.hitbox.position) ? -1 : 1) * collision.pen
                        // "why?", you ask
                        // cause it makes the thingy work and rectCircleIntersection is goofy
                    )
                );
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
            this.source.owner.c4s.splice(this.source.owner.c4s.indexOf(this), 1);
            this.game.removeProjectile(this);
            this.source.owner.updatedC4Button = false;

            const { particles } = this.definition.detonation;
            const referencePosition = Vec.clone(this.position ?? this.source.owner.position);
            if (particles !== undefined) this.game.addSyncedParticles(particles, referencePosition);
        }
    }

    override damage(): void { /* can't damage a throwable projectile */ }

    get data(): FullData<ObjectCategory.ThrowableProjectile> {
        return {
            position: this.position,
            rotation: this.rotation,
            layer: this.layer,
            airborne: this.airborne,
            activated: this.activated,
            full: {
                definition: this.definition
            }
        };
    }
}
