import { type Orientation } from "../typings";
import {
    addAdjust,
    circleCircleIntersection,
    circleCollision,
    type CollisionRecord,
    distanceSquared,
    distanceToCircle,
    distanceToRectangle,
    type IntersectionResponse,
    lineIntersectsCircle,
    lineIntersectsRect,
    rectangleCollision,
    rectangleDistanceToRectangle,
    rectCircleIntersection,
    rectRectCollision,
    transformRectangle
} from "./math";
import { random, randomFloat, randomPointInsideCircle } from "./random";
import { v, vAdd, vClone, type Vector, vMul, vSub } from "./vector";

export abstract class Hitbox {
    /**
     * Checks if this `Hitbox` collides with another one
     * @param that The other `Hitbox`
     * @return True if both `Hitbox`es collide
     */
    abstract collidesWith(that: Hitbox): boolean;
    /**
     * Resolve collision between `Hitbox`es.
     * @param that The other `Hitbox`
     */
    abstract resolveCollision(that: Hitbox): void;
    /**
     * Get the distance from this `Hitbox` from another `Hitbox`.
     * @param that The other `Hitbox`
     * @return a CollisionRecord with the distance and if both `Hitbox`es collide
     */
    abstract distanceTo(that: Hitbox): CollisionRecord;
    /**
     * Clone this `Hitbox`.
     * @return a new `Hitbox` cloned from this one
     */
    abstract clone(): Hitbox;
    /**
     * Transform this `Hitbox` and returns a new `Hitbox`.
     * NOTE: This doesn't change the initial `Hitbox`
     * @param position The position to transform the `Hitbox` by
     * @param scale The scale to transform the `Hitbox`
     * @param orientation The orientation to transform the `Hitbox`
     * @return A new `Hitbox` transformed by the parameters
     */
    abstract transform(position: Vector, scale?: number, orientation?: Orientation): Hitbox;
    /**
     * Scale this `Hitbox`.
     * NOTE: This does change the initial `Hitbox`
     * @param scale The scale
     */
    abstract scale(scale: number): void;
    /**
     * Check if a line intersects with this `Hitbox`.
     * @param a the start point of the line
     * @param b the end point of the line
     * @return An intersection response containing the intersection position and normal
     */
    abstract intersectsLine(a: Vector, b: Vector): IntersectionResponse;
    /**
     * Get a random position inside this `Hitbox`.
     * @return A Vector of a random position inside this `Hitbox`
     */
    abstract randomPoint(): Vector;

    abstract toRectangle(): RectangleHitbox;
}

export class CircleHitbox extends Hitbox {
    position: Vector;
    radius: number;

    constructor(radius: number, position?: Vector) {
        super();

        this.position = position ?? v(0, 0);
        this.radius = radius;
    }

    collidesWith(that: Hitbox): boolean {
        if (that instanceof CircleHitbox) {
            return circleCollision(that.position, that.radius, this.position, this.radius);
        } else if (that instanceof RectangleHitbox) {
            return rectangleCollision(that.min, that.max, this.position, this.radius);
        } else if (that instanceof ComplexHitbox) {
            return that.collidesWith(this);
        }

        throw new Error("Invalid hitbox object");
    }

    resolveCollision(that: Hitbox): void {
        if (that instanceof RectangleHitbox) {
            const collision = rectCircleIntersection(that.min, that.max, this.position, this.radius);
            if (collision) this.position = vSub(this.position, vMul(collision.dir, collision.pen));
        } else if (that instanceof CircleHitbox) {
            const collision = circleCircleIntersection(this.position, this.radius, that.position, that.radius);
            if (collision) this.position = vSub(this.position, vMul(collision.dir, collision.pen));
        } else if (that instanceof ComplexHitbox) {
            for (const hitbox of that.hitboxes) {
                this.resolveCollision(hitbox);
            }
        }
    }

    distanceTo(that: Hitbox): CollisionRecord {
        if (that instanceof CircleHitbox) {
            return distanceToCircle(that.position, that.radius, this.position, this.radius);
        } else if (that instanceof RectangleHitbox) {
            return distanceToRectangle(that.min, that.max, this.position, this.radius);
        }

        throw new Error("Invalid hitbox object");
    }

    clone(): CircleHitbox {
        return new CircleHitbox(this.radius, vClone(this.position));
    }

    transform(position: Vector, scale = 1, orientation = 0 as Orientation): CircleHitbox {
        return new CircleHitbox(this.radius * scale, addAdjust(position, this.position, orientation));
    }

    scale(scale: number): void {
        this.radius *= scale;
    }

    intersectsLine(a: Vector, b: Vector): IntersectionResponse {
        return lineIntersectsCircle(a, b, this.position, this.radius);
    }

    randomPoint(): Vector {
        return randomPointInsideCircle(this.position, this.radius);
    }

    toRectangle(): RectangleHitbox {
        return new RectangleHitbox(v(this.position.x - this.radius, this.position.y - this.radius), v(this.position.x + this.radius, this.position.y + this.radius));
    }
}

export class RectangleHitbox extends Hitbox {
    min: Vector;
    max: Vector;

    constructor(min: Vector, max: Vector) {
        super();

        this.min = min;
        this.max = max;
    }

    static fromLine(a: Vector, b: Vector): RectangleHitbox {
        return new RectangleHitbox(
            v(a.x < b.x ? a.x : b.x, a.y < b.y ? a.y : b.y),
            v(a.x > b.x ? a.x : b.x, a.y > b.y ? a.y : b.y));
    }

    static fromRect(width: number, height: number, pos = v(0, 0)): RectangleHitbox {
        const size = v(width / 2, height / 2);
        const min = vSub(pos, size);
        const max = vAdd(pos, size);
        return new RectangleHitbox(min, max);
    }

    collidesWith(that: Hitbox): boolean {
        if (that instanceof CircleHitbox) {
            return rectangleCollision(this.min, this.max, that.position, that.radius);
        } else if (that instanceof RectangleHitbox) {
            return rectRectCollision(that.min, that.max, this.min, this.max);
        } else if (that instanceof ComplexHitbox) {
            return that.collidesWith(this);
        }

        return false;
    }

    resolveCollision(that: Hitbox): void {
        if (that instanceof CircleHitbox) {
            return that.resolveCollision(this);
        }
        throw new Error("Not Implemented");
    }

    distanceTo(that: Hitbox): CollisionRecord {
        if (that instanceof CircleHitbox) {
            return distanceToRectangle(this.min, this.max, that.position, that.radius);
        } else if (that instanceof RectangleHitbox) {
            return rectangleDistanceToRectangle(that.min, that.max, this.min, this.max);
        }

        throw new Error("Invalid hitbox object");
    }

    clone(): RectangleHitbox {
        return new RectangleHitbox(vClone(this.min), vClone(this.max));
    }

    transform(position: Vector, scale = 1, orientation = 0 as Orientation): RectangleHitbox {
        const rect = transformRectangle(position, this.min, this.max, scale, orientation);

        return new RectangleHitbox(rect.min, rect.max);
    }

    scale(scale: number): void {
        const centerX = (this.min.x + this.max.x) / 2;
        const centerY = (this.min.y + this.max.y) / 2;
        this.min = v((this.min.x - centerX) * scale + centerX, (this.min.y - centerY) * scale + centerY);
        this.max = v((this.max.x - centerX) * scale + centerX, (this.max.y - centerY) * scale + centerY);
    }

    intersectsLine(a: Vector, b: Vector): IntersectionResponse {
        return lineIntersectsRect(a, b, this.min, this.max);
    }

    randomPoint(): Vector {
        return {
            x: randomFloat(this.min.x, this.max.x),
            y: randomFloat(this.min.y, this.max.y)
        };
    }

    toRectangle(): RectangleHitbox {
        return this.clone();
    }
}

export class ComplexHitbox extends Hitbox {
    position = v(0, 0);
    hitboxes: Array<RectangleHitbox | CircleHitbox>;

    constructor(hitBoxes: Array<RectangleHitbox | CircleHitbox>) {
        super();
        this.hitboxes = hitBoxes;
    }

    collidesWith(that: Hitbox): boolean {
        for (const hitbox of this.hitboxes) {
            if (hitbox.collidesWith(that)) return true;
        }
        return false;
    }

    resolveCollision(that: Hitbox): void {
        if (that instanceof CircleHitbox) {
            return that.resolveCollision(this);
        }
        throw new Error("Not Implemented");
    }

    distanceTo(that: CircleHitbox | RectangleHitbox): CollisionRecord {
        let distance = Number.MAX_VALUE;
        let record: CollisionRecord;

        for (const hitbox of this.hitboxes) {
            let newRecord: CollisionRecord;

            if (hitbox instanceof CircleHitbox) {
                if (that instanceof CircleHitbox) {
                    newRecord = distanceToCircle(that.position, that.radius, hitbox.position, hitbox.radius);
                } else { // if (that instanceof RectangleHitbox) {
                    newRecord = distanceToRectangle(that.min, that.max, hitbox.position, hitbox.radius);
                }
            } else { // if (hitbox instanceof RectangleHitbox) {
                if (that instanceof CircleHitbox) {
                    newRecord = distanceToRectangle(hitbox.min, hitbox.max, that.position, that.radius);
                } else { // if (that instanceof RectangleHitbox) {
                    newRecord = rectangleDistanceToRectangle(that.min, that.max, hitbox.min, hitbox.max);
                }
            }
            /* eslint-disable @typescript-eslint/no-non-null-assertion */
            if (newRecord!.distance < distance) {
                record = newRecord!;
                distance = newRecord!.distance;
            }
        }

        return record!;
    }

    clone(): ComplexHitbox {
        return new ComplexHitbox(this.hitboxes);
    }

    transform(position: Vector, scale?: number | undefined, orientation?: Orientation | undefined): ComplexHitbox {
        this.position = position;
        const hitBoxes: Array<RectangleHitbox | CircleHitbox> = [];
        for (const hitbox of this.hitboxes) {
            hitBoxes.push(hitbox.transform(position, scale, orientation));
        }
        return new ComplexHitbox(hitBoxes);
    }

    scale(scale: number): void {
        for (const hitbox of this.hitboxes) hitbox.scale(scale);
    }

    intersectsLine(a: Vector, b: Vector): IntersectionResponse {
        const intersections: Array<{ point: Vector, normal: Vector }> = [];

        // get the closest intersection point from the start of the line
        for (const hitbox of this.hitboxes) {
            const intersection = hitbox.intersectsLine(a, b);
            if (intersection) intersections.push(intersection);
        }

        intersections.sort((c, d) => {
            return distanceSquared(c.point, a) - distanceSquared(d.point, a);
        });
        return intersections[0] ?? null;
    }

    randomPoint(): Vector {
        return this.hitboxes[random(0, this.hitboxes.length - 1)].randomPoint();
    }

    toRectangle(): RectangleHitbox {
        const min = v(Infinity, Infinity);
        const max = v(0, 0);
        for (const hitbox of this.hitboxes) {
            const toRect = hitbox.toRectangle();
            min.x = Math.min(min.x, toRect.min.x);
            min.y = Math.min(min.y, toRect.min.y);
            max.x = Math.max(max.x, toRect.max.x);
            max.y = Math.max(max.y, toRect.max.y);
        }
        return new RectangleHitbox(min, max);
    }
}
