import {
    vClone,
    v,
    type Vector, vSub, vLength, vInvert, vAdd, vMul
} from "./vector";
import {
    circleCollision,
    type CollisionRecord,
    distanceToCircle,
    distanceToRectangle,
    rectangleCollision,
    rectRectCollision,
    rectangleDistanceToRectangle,
    addAdjust,
    lineIntersectsRect,
    lineIntersectsCircle,
    type IntersectionResponse
} from "./math";

import { transformRectangle } from "./math";

import { type Orientation } from "../typings";
import { random, randomFloat, randomPointInsideCircle } from "./random";

export abstract class Hitbox {
    /**
     * Checks if this HitBox collides with another one
     * @param that The other HitBox
     * @return True if both HitBoxes collide
     */
    abstract collidesWith(that: Hitbox): boolean;
    /**
     * Resolve collision between HitBoxes.
     * @param that The other HitBox
     */
    abstract resolveCollision(that: Hitbox): void;
    /**
     * Get the distance from this HitBox from another HitBox.
     * @param that The other HitBox
     * @return a CollisionRecord with the distance and if both HitBoxes collide
     */
    abstract distanceTo(that: Hitbox): CollisionRecord;
    /**
     * Clone this HitBox.
     * @return a new HitBox cloned from this one
     */
    abstract clone(): Hitbox;
    /**
     * Transform this HitBox and returns a new HitBox.
     * NOTE: This doesn't change the initial HitBox
     * @param position The position to transform the HitBox by
     * @param scale The scale to transform the HitBox
     * @param orientation The orientation to transform the HitBox
     * @return A new HitBox transformed by the parameters
     */
    abstract transform(position: Vector, scale?: number, orientation?: Orientation): Hitbox;
    /**
     * Check if a line intersects with this HitBox.
     * @param a the start point of the line
     * @param b the end point of the line
     * @return An intersection response containing the intersection position and normal
     */
    abstract intersectsLine(a: Vector, b: Vector): IntersectionResponse;
    /**
     * Get a random position inside this HitBox.
     * @return A Vector of a random position inside this HitBox
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
        if (that instanceof CircleHitbox) {
            const vectorConnectingCenters = vSub(that.position, this.position);
            const lengthConnectingCenters = vLength(vectorConnectingCenters);
            const intersectionLength = this.radius + that.radius - lengthConnectingCenters;
            const intersectionVector = vMul(vectorConnectingCenters, intersectionLength / lengthConnectingCenters);
            this.position = vAdd(this.position, vInvert(intersectionVector));
        } else if (that instanceof RectangleHitbox) {
            const e = vMul(vSub(that.max, that.min), 0.5);
            const p = vSub(this.position, vAdd(that.min, e));
            const xp = Math.abs(p.x) - e.x - this.radius;
            const yp = Math.abs(p.y) - e.y - this.radius;
            this.position = vAdd(
                this.position,
                xp > yp
                    ? v(-Math.sign(p.x) * xp, 0)
                    : v(0, -Math.sign(p.y) * yp)
            );
        } else if (that instanceof ComplexHitbox) {
            for (const hitbox of that.hitBoxes) {
                if (this.collidesWith(hitbox)) this.resolveCollision(hitbox);
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
            return rectangleDistanceToRectangle(that.min, that.max, this.min, this.max); // TODO Write a rectangleDistanceToRectangle function
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
    hitBoxes: Array<RectangleHitbox | CircleHitbox>;

    constructor(hitBoxes: Array<RectangleHitbox | CircleHitbox>) {
        super();
        this.hitBoxes = hitBoxes;
    }

    collidesWith(that: Hitbox): boolean {
        for (const hitbox of this.hitBoxes) {
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

        for (const hitbox of this.hitBoxes) {
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
        return new ComplexHitbox(this.hitBoxes);
    }

    transform(position: Vector, scale?: number | undefined, orientation?: Orientation | undefined): ComplexHitbox {
        this.position = position;
        const hitBoxes: Array<RectangleHitbox | CircleHitbox> = [];
        for (const hitbox of this.hitBoxes) {
            hitBoxes.push(hitbox.transform(position, scale, orientation));
        }
        return new ComplexHitbox(hitBoxes);
    }

    intersectsLine(a: Vector, b: Vector): IntersectionResponse {
        for (const hitbox of this.hitBoxes) {
            const intersection = hitbox.intersectsLine(a, b);
            if (intersection) return intersection;
        }
        return null;
    }

    randomPoint(): Vector {
        return this.hitBoxes[random(0, this.hitBoxes.length - 1)].randomPoint();
    }

    toRectangle(): RectangleHitbox {
        const min = v(Infinity, Infinity);
        const max = v(0, 0);
        for (const hitbox of this.hitBoxes) {
            const toRect = hitbox.toRectangle();
            min.x = Math.min(min.x, toRect.min.x);
            min.y = Math.min(min.y, toRect.min.y);
            max.x = Math.max(max.x, toRect.max.x);
            max.y = Math.max(max.y, toRect.max.y);
        }
        return new RectangleHitbox(min, max);
    }
}
