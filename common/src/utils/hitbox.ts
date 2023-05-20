import {
    vClone,
    v,
    vAdd,
    type Vector
} from "./vector";
import {
    circleCollision,
    type CollisionRecord,
    distanceToCircle,
    distanceToRectangle,
    rectangleCollision,
    rectRectCollision
} from "./math";

import { type Orientation } from "../typings";

export abstract class Hitbox {
    abstract collidesWith(that: Hitbox): boolean;
    abstract distanceTo(that: Hitbox): CollisionRecord;
    abstract clone(): Hitbox;
    abstract transform(position: Vector, scale?: number, orientation?: Orientation): Hitbox;
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
        return new CircleHitbox(this.radius, vClone(this.position));
    }

    transform(position: Vector, scale = 1, orientation?: Orientation): Hitbox {
        return new CircleHitbox(this.radius * scale, vAdd(this.position, position));
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
            throw new Error("Not implemented"); // TODO Write a rectangleDistanceToRectangle function
        }

        throw new Error("Invalid hitbox object");
    }

    clone(): RectangleHitbox {
        return new RectangleHitbox(vClone(this.min), vClone(this.max));
    }

    transform(position: Vector): Hitbox {
        return new RectangleHitbox(vAdd(this.min, position), vAdd(this.max, position));
    }
}
