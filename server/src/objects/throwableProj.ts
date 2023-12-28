import { GameConstants, ObjectCategory } from "../../../common/src/constants";
import { type ThrowableDefinition } from "../../../common/src/definitions/throwables";
import { CircleHitbox, HitboxType, type RectangleHitbox } from "../../../common/src/utils/hitbox";
import { Angle, Collision, type CollisionResponse, Geometry, Numeric } from "../../../common/src/utils/math";
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

        const impactDamage = this.definition.impactDamage;
        const shouldCollideWithPlayers = impactDamage !== undefined && Vec.squaredLength(this.velocity) > 0.0016;

        for (const object of this.game.grid.intersectsHitbox(this.hitbox)) {
            if (
                (
                    (object instanceof Obstacle && object.collidable) ||
                    (object instanceof Player && shouldCollideWithPlayers && (this._collideWithOwner || object !== this.source.owner))
                ) &&
                object.hitbox.collidesWith(this.hitbox)
            ) {
                const hitbox = object.hitbox;

                /**
                 * Kept around because handleCollision mutates
                 * the instance, but we want it for later
                 */
                const { position: oldPosition } = this.hitbox.clone();

                if (object instanceof Player) {
                    object.damage(
                        impactDamage!,
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

                    const positionDiff = Vec.sub(
                        hitbox.isPointInside(oldPosition)
                            ? (() => {
                                // aw [expletive redacted], we gotta find the closest side…

                                const compareAndReturn = <T>(
                                    a: number,
                                    b: number,
                                    lessThan: () => T,
                                    equal: () => T,
                                    greaterThan: () => T
                                ): T => {
                                    switch (Math.sign(a - b) as -1 | 0 | 1) {
                                        case -1: return lessThan();
                                        case 0: return equal();
                                        case 1: return greaterThan();
                                    }
                                };

                                // distance to all four sides
                                const dl = hitbox.min.x - oldPosition.x;
                                const dr = hitbox.max.x - oldPosition.x;
                                const du = hitbox.min.y - oldPosition.y;
                                const db = hitbox.max.y - oldPosition.y;

                                const leftSide = Vec.create(hitbox.min.x, oldPosition.y);
                                const upSide = Vec.create(oldPosition.x, hitbox.min.y);
                                const bottomSide = Vec.create(oldPosition.x, hitbox.max.y);
                                const rightSide = Vec.create(hitbox.max.x, oldPosition.y);

                                const compareVerticals = (): Vector => compareAndReturn(
                                    du, db,
                                    () => upSide,
                                    () => Vec.create(0, 0),
                                    () => bottomSide
                                );

                                return compareAndReturn(
                                    dl, dr,
                                    // somewhere on the left side
                                    () => compareAndReturn(
                                        dl, Math.min(du, db),
                                        // the left distance is the smallest one
                                        () => leftSide,
                                        // shit
                                        () => Vec.create(0, 0),
                                        // either the top or bottom distance is smaller
                                        compareVerticals
                                    ),
                                    // somewhere in the middle
                                    compareVerticals,
                                    // somewhere on the right side
                                    () => compareAndReturn(
                                        dr, Math.min(du, db),
                                        // thr right side distance is the smallest one
                                        () => rightSide,
                                        () => Vec.create(0, 0),
                                        // either the top or bottom distance is smaller
                                        compareVerticals
                                    )
                                );
                            })()
                            : Vec.create(
                                Numeric.clamp(oldPosition.x, hitbox.min.x, hitbox.max.x),
                                Numeric.clamp(oldPosition.y, hitbox.min.y, hitbox.max.y)
                            ),
                        oldPosition
                    );

                    const centerDiff = Vec.sub(hitbox.getCenter(), this.position);
                    const effectiveDifference = Vec.squaredLength(positionDiff)
                        ? Vec.project(centerDiff, positionDiff)
                        : (() => {
                            // Ok, so positionDiff is 0, meaning that oldPosition
                            // is on one of the four sides… let's see which one
                            switch (true) {
                                case oldPosition.x === hitbox.min.x:
                                case oldPosition.x === hitbox.max.x: {
                                    return Vec.create(centerDiff.x, 0);
                                }
                                case oldPosition.y === hitbox.min.y:
                                case oldPosition.y === hitbox.max.y: {
                                    return Vec.create(0, centerDiff.y);
                                }
                                default: return Vec.create(0, 0); // never
                            }
                        })();

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

        this._collideWithOwner ||= this.game.now - this._spawnTime >= 100;
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
