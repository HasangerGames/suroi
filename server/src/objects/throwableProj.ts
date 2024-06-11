import { ObjectCategory } from "../../../common/src/constants";
import { FlyoverPref } from "../../../common/src/definitions/obstacles";
import { type ThrowableDefinition } from "../../../common/src/definitions/throwables";
import { CircleHitbox, HitboxType, type RectangleHitbox } from "../../../common/src/utils/hitbox";
import { Angle, Collision, Numeric } from "../../../common/src/utils/math";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { FloorTypes } from "../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../common/src/utils/vector";
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
        readonly definition: ThrowableDefinition,
        readonly source: ThrowableItem,
        radius?: number
    ) {
        super(game, position);
        this._spawnTime = this.game.now;
        this.hitbox = new CircleHitbox(radius ?? 1, position);
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

    update(): void {
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

            if (FloorTypes[this.game.map.terrain.getFloor(this.position)].overlay) {
                this._currentDragConst = ThrowableProjectile._harshDragConstant;
            }
        }

        const flyoverCondMap = {
            [FlyoverPref.Always]: currentSquaredVel >= squaredThresholds.flyover,
            [FlyoverPref.Sometimes]: currentSquaredVel >= squaredThresholds.highFlyover,
            [FlyoverPref.Never]: false
        };

        const canFlyOver = (obstacle: Obstacle): boolean => {
            return obstacle.door?.isOpen === false
                ? false
                : flyoverCondMap[obstacle.definition.allowFlyover];
        };

        const damagedThisTick = new Set<GameObject>();

        for (const object of this.game.grid.intersectsHitbox(this.hitbox)) {
            const isObstacle = object instanceof Obstacle;
            const isPlayer = object instanceof Player;

            if (
                object.dead
                || (
                    (!isObstacle || !object.collidable)
                    && (!isPlayer || !shouldDealImpactDamage || (!this._collideWithOwner && object === this.source.owner))
                )
            ) continue;

            const hitbox = object.hitbox;
            const collidingWithObject = object.hitbox.collidesWith(this.hitbox);

            if (isObstacle) {
                if (collidingWithObject) {
                    let isAbove = false;
                    if (isAbove = canFlyOver(object)) {
                        this._currentlyAbove.add(object);
                    } else {
                        this._currentDragConst = ThrowableProjectile._harshDragConstant;
                    }

                    if (isAbove || this._currentlyAbove.has(object)) {
                        continue;
                    }
                }

                this._currentlyAbove.delete(object);
            }

            if (!collidingWithObject) continue;

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

    override damage(): void { /* can't damage a throwable projectile */ }

    get data(): FullData<ObjectCategory.ThrowableProjectile> {
        return {
            position: this.position,
            rotation: this.rotation,
            airborne: this.airborne,
            full: {
                definition: this.definition
            }
        };
    }
}
