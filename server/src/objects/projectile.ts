import { GameConstants, ObjectCategory } from "../../../common/src/constants";
import { type WeaponDefinition } from "../../../common/src/definitions/loots";
import { CircleHitbox, HitboxType, type RectangleHitbox } from "../../../common/src/utils/hitbox";
import { Angle, Collision, Geometry, Numeric } from "../../../common/src/utils/math";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "./gameObject";
import { Obstacle } from "./obstacle";

export class Projectile extends GameObject<ObjectCategory.Projectile> {
    readonly type = ObjectCategory.Projectile;

    readonly definition: WeaponDefinition;

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

    _angularVelocity = 0.0035;

    /**
     * Ensures that the drag experienced is not dependant on tickrate.
     * This particular exponent results in a 10% loss every 38.7ms (or a 50% loss every 254.8ms)
     *
     * Precise results obviously depend on the tickrate
     */
    private static readonly _dragConstant = Math.exp(-2.7 / GameConstants.tickrate);

    override get position(): Vector { return this.hitbox.position; }
    private _height = 0;

    constructor(game: Game, position: Vector, definition: WeaponDefinition, radius?: number) {
        super(game, position);
        this.definition = definition;
        this.hitbox = new CircleHitbox(radius ?? 1, Vec.clone(position));
    }

    damage(amount: number, source?: GameObject<ObjectCategory> | undefined): void { }

    update(): void {
        const deltaTime = GameConstants.msPerTick;
        const halfDt = 0.5 * deltaTime;

        this.hitbox.position.x += this._velocity.x * halfDt;
        this.hitbox.position.y += this._velocity.y * halfDt;

        this._velocity = { ...Vec.scale(this._velocity, Projectile._dragConstant), z: this._velocity.z };

        this._velocity.z -= 9.8 * deltaTime;

        this.hitbox.position.x += this._velocity.x * halfDt;
        this.hitbox.position.y += this._velocity.y * halfDt;
        this._height += this._velocity.z * deltaTime;

        this.rotation = Angle.normalizeAngle(this.rotation + this._angularVelocity * deltaTime);

        const objects = this.game.grid.intersectsHitbox(this.hitbox);
        for (const object of objects) {
            if (
                object instanceof Obstacle &&
                object.collidable &&
                object.hitbox.collidesWith(this.hitbox)
            ) {
                const hitbox = object.hitbox;

                /**
                 * Kept around because #resolveCollision mutates
                 * the instance, but we want it for later
                 */
                const { position: oldPosition } = this.hitbox.clone();

                this.hitbox.resolveCollision(hitbox);

                const handleCircle = (hitbox: CircleHitbox): void => {
                    const collision = Collision.circleCircleIntersection(this.position, this.hitbox.radius, hitbox.position, hitbox.radius);

                    if (collision) {
                        this.velocity = Vec.sub(this.velocity, Vec.scale(collision.dir, 0.0005));
                    }

                    const reflectionReference = Vec.scale(
                        Vec.create(hitbox.position.x - this.position.x, hitbox.position.y - this.position.y),
                        1 / Math.max(Geometry.distance(hitbox.position, this.position) - this.hitbox.radius, 1)
                    );

                    const speed = Vec.dotProduct(this.velocity, reflectionReference);

                    if (speed < 0) return;

                    this._velocity.x -= speed * reflectionReference.x;
                    this._velocity.y -= speed * reflectionReference.y;
                };

                const handleRectangle = (hitbox: RectangleHitbox): void => {
                    // if anyone can make this math more correct, feel free to do so
                    const collision = Collision.rectCircleIntersection(hitbox.min, hitbox.max, oldPosition, this.hitbox.radius);

                    if (collision) {
                        this.velocity = Vec.sub(this.velocity, Vec.scale(collision.dir, 0.0005));
                    }

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

                    if (speed < 0) return;

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
                        const target = hitbox.hitboxes
                            .map(hitbox => (
                                hitbox instanceof CircleHitbox
                                    ? Collision.circleCircleIntersection(oldPosition, this.hitbox.radius, hitbox.position, hitbox.radius)
                                    : Collision.rectCircleIntersection(hitbox.min, hitbox.max, oldPosition, this.hitbox.radius)
                            ) !== null
                                ? hitbox
                                : null
                            )
                            .filter(
                                (target => target !== null) as (target: CircleHitbox | RectangleHitbox | null) => target is CircleHitbox | RectangleHitbox
                            )
                            .at(0);

                        if (target) {
                            target instanceof CircleHitbox
                                ? handleCircle(target)
                                : handleRectangle(target);
                        }

                        break;
                    }
                    case HitboxType.Polygon: {
                        // return [
                        //     hitbox,
                        //     hitbox.points
                        //         .map((v, i, a) => [v, a[(i + 1) % a.length]] as const)
                        //         .map(([start, end]) => Collision.lineIntersectsCircle(start, end, this.position, this.hitbox.radius))
                        //         .filter((res => res !== null) as (res: IntersectionResponse) => res is NonNullable<IntersectionResponse>)
                        //         .at(0)
                        // ] as const;
                        // fixme implement this case ig
                        break;
                    }
                }

                this._angularVelocity *= 0.6;
            }
        }

        this.game.partialDirtyObjects.add(this);
    }

    get data(): Required<ObjectsNetData[ObjectCategory.Projectile]> {
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
