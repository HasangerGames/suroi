import { GameConstants, ObjectCategory } from "../../../common/src/constants";
import { type ThrowableDefinition } from "../../../common/src/definitions/throwables";
import { CircleHitbox, HitboxType, type RectangleHitbox } from "../../../common/src/utils/hitbox";
import { Angle, Collision } from "../../../common/src/utils/math";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { type ThrowableItem } from "../inventory/throwableItem";
import { BaseGameObject } from "./gameObject";
import { Obstacle } from "./obstacle";
import { Player } from "./player";

export class ThrowableProjectile extends BaseGameObject<ObjectCategory.ThrowableProjectile> {
    readonly type = ObjectCategory.ThrowableProjectile;

    readonly definition: ThrowableDefinition;

    declare readonly hitbox: CircleHitbox;

    private _velocity = {
        ...Vec.create(0, 0),
        z: 0
    };

    public get velocity(): Vector { return this._velocity; }
    public set velocity(velocity: Partial<Vector & { z: number }>) {
        this._velocity.x = velocity.x ?? this._velocity.x;
        this._velocity.y = velocity.y ?? this._velocity.y;
        this._velocity.z = velocity.z ?? this._velocity.z;
    }

    angularVelocity = 0.0035;

    private readonly source: ThrowableItem;

    private readonly _spawnTime: number;

    /**
     * Grace period to prevent impact damage and collision logic
     * from instantly being applied to the grenade's owner
     */
    private _collideWithOwner = false;

    /**
     * Ensures that the drag experienced is not dependant on tickrate.
     * This particular exponent results in a 10% loss every 38.7ms (or a 50% loss every 254.8ms)
     *
     * Precise results obviously depend on the tickrate
     */
    private static readonly _dragConstant = Math.pow(1.6, -2.7 / GameConstants.tickrate);

    override get position(): Vector { return this.hitbox.position; }
    private _height = 0;

    constructor(game: Game, position: Vector, definition: ThrowableDefinition, source: ThrowableItem, radius?: number) {
        super(game, position);
        this.definition = definition;
        this.source = source;
        this._spawnTime = this.game.now;
        this.hitbox = new CircleHitbox(radius ?? 1, position);
    }

    push(angle: number, speed: number): void {
        this.velocity = Vec.add(this.velocity, Vec.fromPolar(angle, speed));
    }

    update(): void {
        const deltaTime = GameConstants.msPerTick;
        const halfDt = 0.5 * deltaTime;

        this.hitbox.position.x += this._velocity.x * halfDt;
        this.hitbox.position.y += this._velocity.y * halfDt;

        this._velocity = { ...Vec.scale(this._velocity, ThrowableProjectile._dragConstant), z: this._velocity.z };

        this._velocity.z -= 9.8 * deltaTime;

        this.hitbox.position.x += this._velocity.x * halfDt;
        this.hitbox.position.y += this._velocity.y * halfDt;
        this._height += this._velocity.z * deltaTime;

        this.rotation = Angle.normalize(this.rotation + this.angularVelocity * deltaTime);

        const impactDamage = this.definition.impactDamage;
        const shouldDealImpactDamage = impactDamage !== undefined && Vec.squaredLength(this.velocity) > 0.0016;

        for (const object of this.game.grid.intersectsHitbox(this.hitbox)) {
            if (
                (
                    (object instanceof Obstacle && object.collidable) ||
                    (object instanceof Player && shouldDealImpactDamage && (this._collideWithOwner || object !== this.source.owner))
                ) &&
                object.hitbox.collidesWith(this.hitbox)
            ) {
                const hitbox = object.hitbox;

                if (shouldDealImpactDamage) {
                    object.damage(
                        impactDamage * ((object instanceof Obstacle ? this.definition.obstacleMultiplier : undefined) ?? 1),
                        this.source.owner,
                        this.source
                    );

                    if (object.dead) {
                        continue;
                    }
                }

                const handleCircle = (hitbox: CircleHitbox): void => {
                    const collision = Collision.circleCircleIntersection(this.position, this.hitbox.radius, hitbox.position, hitbox.radius);

                    if (collision) {
                        this.velocity = Vec.sub(this._velocity, Vec.scale(collision.dir, 0.8 * Vec.length(this._velocity)));
                        this.hitbox.position = Vec.sub(this.hitbox.position, Vec.scale(collision.dir, collision.pen));
                    }
                };

                const handleRectangle = (hitbox: RectangleHitbox): void => {
                    // if anyone can make this math more correct, feel free to do so
                    const collision = Collision.rectCircleIntersection(hitbox.min, hitbox.max, this.position, this.hitbox.radius);

                    if (collision) {
                        this.velocity = Vec.add(
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

                this.angularVelocity *= 0.6;
            }
        }

        this._collideWithOwner ||= this.game.now - this._spawnTime >= 100;
        this.game.partialDirtyObjects.add(this);
    }

    damage(_amount: number, _source?: BaseGameObject<ObjectCategory> | undefined): void { }

    get data(): FullData<ObjectCategory.ThrowableProjectile> {
        return {
            position: {
                ...this.position
                // z: this._height
            },
            rotation: this.rotation,
            full: {
                definition: this.definition
            }
        };
    }
}
