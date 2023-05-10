import {
    cloneVector, v, type Vector
} from "./vector";

export abstract class Hitbox {
    abstract collidesWith(that: Hitbox): boolean;
    abstract distanceTo(that: Hitbox): CollisionRecord;
    abstract clone(): Hitbox;
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
        }

        throw new Error("Invalid hitbox object");
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
        return new CircleHitbox(this.radius, cloneVector(this.position));
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

    collidesWith(that: Hitbox): boolean {
        if (that instanceof CircleHitbox) {
            return rectangleCollision(this.min, this.max, that.position, that.radius);
        } else if (that instanceof RectangleHitbox) {
            return rectRectCollision(that.min, that.max, this.min, this.max);
        }

        return false;
    }

    distanceTo(that: Hitbox): CollisionRecord {
        if (that instanceof CircleHitbox) {
            return distanceToRectangle(this.min, this.max, that.position, that.radius);
        } else if (that instanceof RectangleHitbox) {
            throw new Error("Not supported yet"); // TODO Write a rectangleDistanceToRectangle function
        }

        throw new Error("Invalid hitbox object");
    }

    clone(): RectangleHitbox {
        return new RectangleHitbox(cloneVector(this.min), cloneVector(this.max));
    }
}

/**
 * Check whether two circles collide.
 * @param pos1 The center of the first circle.
 * @param r1 The radius of the first circle.
 * @param pos2 The center of the second circle.
 * @param r2 Thge radius of the second circle.
 */
function circleCollision(pos1: Vector, r1: number, pos2: Vector, r2: number): boolean {
    const a = r1 + r2;
    const x = pos1.x - pos2.x;
    const y = pos1.y - pos2.y;

    return a * a > x * x + y * y;
}

function rectangleCollision(min: Vector, max: Vector, pos: Vector, rad: number): boolean {
    const cpt = {
        x: clamp(pos.x, min.x, max.x),
        y: clamp(pos.y, min.y, max.y)
    };

    const distX = pos.x - cpt.x, distY = pos.y - cpt.y;
    const distSquared = distX * distX + distY * distY;

    return (distSquared < rad * rad) || (pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y);
}

/**
 * Conform a number to specified bounds.
 * @param a The number to conform.
 * @param min The minimum value the number can hold.
 * @param max The maximum value the number can hold.
 */
function clamp(a: number, min: number, max: number): number {
    return a < max ? a > min ? a : min : max;
}

function rectRectCollision(min1: Vector, max1: Vector, min2: Vector, max2: Vector): boolean {
    return min2.x < max1.x && min2.y < max1.y && min1.x < max2.x && min1.y < max2.y;
}

export interface CollisionRecord { collided: boolean, distance?: number }

/**
 * Determine the distance between two circles.
 * @param pos1 The center of the first circle.
 * @param r1 The radius of the first circle.
 * @param pos2 The center of the second circle.
 * @param r2 The radius of the second circle.
 * @returns An object representation of whether the circles collide and the distance between their closest vertices.
 */
function distanceToCircle(pos1: Vector, r1: number, pos2: Vector, r2: number): CollisionRecord {
    const a = r1 + r2;
    const x = pos1.x - pos2.x;
    const y = pos1.y - pos2.y;
    const a2 = a * a;
    const xy = (x * x + y * y);
    return { collided: a2 > xy, distance: a2 - xy };
}

function distanceToRectangle(min: Vector, max: Vector, circlePos: Vector, circleRad: number): CollisionRecord {
    const distX = Math.max(min.x, Math.min(max.x, circlePos.x)) - circlePos.x;
    const distY = Math.max(min.y, Math.min(max.y, circlePos.y)) - circlePos.y;
    const radSquared = circleRad * circleRad;
    const distSquared = (distX * distX + distY * distY);
    return { collided: distSquared < radSquared, distance: radSquared - distSquared };
}
