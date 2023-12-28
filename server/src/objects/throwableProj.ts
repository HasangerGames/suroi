import { GameConstants, ObjectCategory } from "../../../common/src/constants";
import { type ThrowableDefinition } from "../../../common/src/definitions/throwables";
import { CircleHitbox, HitboxType, type RectangleHitbox } from "../../../common/src/utils/hitbox";
import { Angle, Collision, type CollisionResponse, Geometry, Numeric } from "../../../common/src/utils/math";
import { ObstacleSpecialRoles } from "../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { type ThrowableItem } from "../inventory/throwableItem";
import { GameObject } from "./gameObject";
import { Obstacle } from "./obstacle";
import { Player } from "./player";

export class ThrowableProjectile extends GameObject<ObjectCategory.ThrowableProjectile> {
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
        this.hitbox = new CircleHitbox(radius ?? 1, Vec.clone(position));
    }

    push(angle: number, velocity: number): void {
        this.velocity = Vec.add(this.velocity, Vec.fromPolar(angle, velocity));
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

        this.rotation = Angle.normalizeAngle(this.rotation + this.angularVelocity * deltaTime);

        const shouldCollideWithPlayers = this.definition.impactDamage !== undefined && Vec.squaredLength(this.velocity) > 0.0036;

        for (const object of this.game.grid.intersectsHitbox(this.hitbox)) {
            if (
                (
                    (object instanceof Obstacle && object.collidable) ||
                    (object instanceof Player && shouldCollideWithPlayers)
                ) &&
                object.hitbox.collidesWith(this.hitbox)
            ) {
                if (object instanceof Obstacle && object.definition.role === ObstacleSpecialRoles.Window) {
                    object.damage(Infinity, this.source.owner);
                    continue;
                }

                const hitbox = object.hitbox;

                /**
                 * Kept around because #resolveCollision mutates
                 * the instance, but we want it for later
                 */
                const { position: oldPosition } = this.hitbox.clone();

                if (object instanceof Player) {
                    object.damage(
                        this.definition.impactDamage!,
                        this.source.owner,
                        this.source
                    );
                }

                const handleCollision = (collision: NonNullable<CollisionResponse>): void => {
                    this.velocity = Vec.sub(this.velocity, Vec.scale(collision.dir, 0.0001));
                    this.hitbox.position = Vec.sub(this.hitbox.position, Vec.scale(collision.dir, collision.pen));
                };

                const handleCircle = (hitbox: CircleHitbox): void => {
                    const collision = Collision.circleCircleIntersection(this.position, this.hitbox.radius, hitbox.position, hitbox.radius);

                    if (collision) handleCollision(collision);

                    const reflectionReference = Vec.scale(
                        Vec.create(hitbox.position.x - this.position.x, hitbox.position.y - this.position.y),
                        1 / Math.max(Geometry.distance(hitbox.position, this.position) - this.hitbox.radius, 1)
                    );

                    const speed = Vec.dotProduct(this.velocity, reflectionReference);

                    if (speed < 0 || Number.isNaN(speed)) return;

                    this._velocity.x -= speed * reflectionReference.x;
                    this._velocity.y -= speed * reflectionReference.y;
                };

                const handleRectangle = (hitbox: RectangleHitbox): void => {
                    // if anyone can make this math more correct, feel free to do so
                    const collision = Collision.rectCircleIntersection(hitbox.min, hitbox.max, this.position, this.hitbox.radius);

                    if (collision) handleCollision(collision);

                    const effectiveDifference = Vec.project(
                        Vec.sub(hitbox.getCenter(), this.position),
                        Vec.sub(
                            Vec.create(
                                Numeric.clamp(oldPosition.x, hitbox.min.x, hitbox.max.x),
                                Numeric.clamp(oldPosition.y, hitbox.min.y, hitbox.max.y)
                            ),
                            oldPosition
                        )
                    );

                    const reflectionReference = Vec.scale(
                        effectiveDifference,
                        1 / Math.max(Vec.length(effectiveDifference) - this.hitbox.radius, 1)
                    );

                    const speed = Vec.dotProduct(this.velocity, reflectionReference);
                    if (speed < 0 || Number.isNaN(speed)) return;

                    this._velocity.x -= speed * reflectionReference.x;
                    this._velocity.y -= speed * reflectionReference.y;
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

        this.game.partialDirtyObjects.add(this);
    }

    damage(_amount: number, _source?: GameObject<ObjectCategory> | undefined): void { }

    get data(): Required<ObjectsNetData[ObjectCategory.ThrowableProjectile]> {
        return {
            position: {
                ...this.position,
                z: this._height
            },
            rotation: this.rotation,
            dead: this.dead,
            full: {
                definition: this.definition,
                hitboxRadius: this.hitbox.radius
            }
        };
    }
}
