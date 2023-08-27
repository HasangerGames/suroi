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

export abstract class Hitbox {
    abstract collidesWith(that: Hitbox): boolean;
    abstract resolveCollision(that: Hitbox): void;
    abstract distanceTo(that: Hitbox): CollisionRecord;
    abstract clone(): Hitbox;
    abstract transform(position: Vector, scale?: number, orientation?: Orientation): Hitbox;
    abstract intersectsLine(a: Vector, b: Vector): IntersectionResponse;
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
        } else if (that instanceof ComplexHitbox) {
            return that.collidesWith(this);
        }

        return false;
    }

    resolveCollision(that: Hitbox): void {}

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

    resolveCollision(that: Hitbox): void {}

    distanceTo(that: CircleHitbox | RectangleHitbox): CollisionRecord {
        let distance = Number.MAX_VALUE;
        let record: CollisionRecord;

        for (const hitbox of this.hitBoxes) {
            let newRecord: CollisionRecord;

            if (hitbox instanceof CircleHitbox) {
                if (that instanceof CircleHitbox) {
                    newRecord = distanceToCircle(that.position, that.radius, hitbox.position, hitbox.radius);
                } else if (that instanceof RectangleHitbox) {
                    newRecord = distanceToRectangle(that.min, that.max, hitbox.position, hitbox.radius);
                }
            } else if (hitbox instanceof RectangleHitbox) {
                if (that instanceof CircleHitbox) {
                    newRecord = distanceToRectangle(hitbox.min, hitbox.max, that.position, that.radius);
                } else if (that instanceof RectangleHitbox) {
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
}
