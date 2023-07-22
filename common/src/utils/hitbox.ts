import { boxLine, circleLine } from "intersects";

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
    rectRectCollision,
    rectangleDistanceToRectangle
} from "./math";

import { transformRectangle } from "./math";

import { type Orientation } from "../typings";

export abstract class Hitbox {
    abstract collidesWith(that: Hitbox): boolean;
    abstract distanceTo(that: Hitbox): CollisionRecord;
    abstract clone(): Hitbox;
    abstract transform(position: Vector, scale?: number, orientation?: Orientation): Hitbox;
    abstract intersectsLine(a: Vector, b: Vector): boolean;
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

    transform(position: Vector, scale = 1): Hitbox {
        return new CircleHitbox(this.radius * scale, vAdd(this.position, position));
    }

    intersectsLine(a: Vector, b: Vector): boolean {
        return circleLine(this.position.x, this.position.y, this.radius, a.x, a.y, b.x, b.y);
    }
}

export class RectangleHitbox extends Hitbox {
    min: Vector;
    max: Vector;

    width: number;
    height: number;

    constructor(min: Vector, max: Vector) {
        super();

        this.min = min;
        this.max = max;

        this.width = max.x - min.x;
        this.height = max.y - min.y;
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
            return rectangleDistanceToRectangle(that.min, that.max, this.min, this.max); // TODO Write a rectangleDistanceToRectangle function
        }

        throw new Error("Invalid hitbox object");
    }

    clone(): RectangleHitbox {
        return new RectangleHitbox(vClone(this.min), vClone(this.max));
    }

    transform(position: Vector, scale = 1, orientation = 0 as Orientation): Hitbox {
        const rect = transformRectangle(position, this.min, this.max, scale, orientation);

        return new RectangleHitbox(rect.min, rect.max);
    }

    intersectsLine(a: Vector, b: Vector): boolean {
        return boxLine(this.min.x, this.min.y, this.width, this.height, a.x, a.y, b.x, b.y);
    }
}

export class ComplexHitbox extends Hitbox {
    hitBoxes: Hitbox[];

    constructor(hitBoxes: Hitbox[]) {
        super();
        this.hitBoxes = hitBoxes;
    }

    collidesWith(that: Hitbox): boolean {
        for (const hitbox of this.hitBoxes) {
            if (hitbox.collidesWith(that)) return true;
        }
        return false;
    }

    distanceTo(that: Hitbox): CollisionRecord {
        for(const hitbox of this.hitBoxes) {
            if(hitbox instanceof CircleHitbox) {
                if (that instanceof CircleHitbox) {
                  return distanceToCircle(that.position, that.radius, hitbox.position, hitbox.radius);
                } else if (that instanceof RectangleHitbox) {
                  return distanceToRectangle(that.min, that.max, hitbox.position, hitbox.radius);
                }
            } else if (hitbox instanceof RectangleHitbox) {
                 if (that instanceof CircleHitbox) {
                    return distanceToRectangle(hitbox.min, hitbox.max, that.position, that.radius);
                 } else if (that instanceof RectangleHitbox) {
                    return rectangleDistanceToRectangle(that.min, that.max, hitbox.min, hitbox.max); // TODO Write a rectangleDistanceToRectangle function
                 }
            }

            throw new Error("Invalid hitbox object");
        }
         throw new Error("Invalid hitbox object");
    }

    clone(): ComplexHitbox {
        return new ComplexHitbox(this.hitBoxes);
    }

    transform(position: Vector, scale?: number | undefined, orientation?: Orientation | undefined): ComplexHitbox {
        const hitBoxes: Hitbox[] = [];
        for (const hitbox of this.hitBoxes) {
            // i have no idea why but that makes it work correctly
            let newOrientation = orientation;
            if (orientation === 1) newOrientation = 3;
            else if (orientation === 3) newOrientation = 1;

            hitBoxes.push(hitbox.transform(position, scale, newOrientation));
        }
        return new ComplexHitbox(hitBoxes);
    }

    intersectsLine(a: Vector, b: Vector): boolean {
        for (const hitbox of this.hitBoxes) {
            if (hitbox.intersectsLine(a, b)) return true;
        }
        return false;
    }
}
