import { type Orientation } from "../typings";
import { addAdjust, circleCircleIntersection, circleCollision, type CollisionRecord, distanceSquared, distanceToCircle, distanceToRectangle, type IntersectionResponse, lineIntersectsCircle, lineIntersectsRect, rectangleCollision, rectangleDistanceToRectangle, rectCircleIntersection, rectRectCollision, transformRectangle, distance, rectPolyCollision } from "./math";
import { pickRandomInArray, randomFloat, randomPointInsideCircle } from "./random";
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

    abstract isPointInside(point: Vector): boolean;
}

export class CircleHitbox extends Hitbox {
    position: Vector;
    radius: number;

    constructor(radius: number, position?: Vector) {
        super();

        this.position = position ?? v(0, 0);
        this.radius = radius;
    }

    override collidesWith(that: Hitbox): boolean {
        if (that instanceof CircleHitbox) {
            return circleCollision(that.position, that.radius, this.position, this.radius);
        } else if (that instanceof RectangleHitbox) {
            return rectangleCollision(that.min, that.max, this.position, this.radius);
        } else if (that instanceof ComplexHitbox) {
            return that.collidesWith(this);
        }

        throw new Error(`Invalid hitbox object (Received an instance of ${Object.getPrototypeOf(that)?.constructor?.name ?? "an unknown prototype"})`);
    }

    override resolveCollision(that: Hitbox): void {
        if (that instanceof RectangleHitbox) {
            const collision = rectCircleIntersection(that.min, that.max, this.position, this.radius);
            if (collision) {
                this.position = vSub(this.position, vMul(collision.dir, collision.pen));
            }
        } else if (that instanceof CircleHitbox) {
            const collision = circleCircleIntersection(this.position, this.radius, that.position, that.radius);
            if (collision) {
                this.position = vSub(this.position, vMul(collision.dir, collision.pen));
            }
        } else if (that instanceof ComplexHitbox) {
            for (const hitbox of that.hitboxes) {
                this.resolveCollision(hitbox);
            }
        }
    }

    override distanceTo(that: Hitbox): CollisionRecord {
        if (that instanceof CircleHitbox) {
            return distanceToCircle(that.position, that.radius, this.position, this.radius);
        } else if (that instanceof RectangleHitbox) {
            return distanceToRectangle(that.min, that.max, this.position, this.radius);
        }

        throw new Error(`Invalid hitbox object (Received an instance of ${Object.getPrototypeOf(that)?.constructor?.name ?? "an unknown prototype"})`);
    }

    override clone(): CircleHitbox {
        return new CircleHitbox(this.radius, vClone(this.position));
    }

    override transform(position: Vector, scale = 1, orientation = 0 as Orientation): CircleHitbox {
        return new CircleHitbox(this.radius * scale, addAdjust(position, this.position, orientation));
    }

    override scale(scale: number): void {
        this.radius *= scale;
    }

    override intersectsLine(a: Vector, b: Vector): IntersectionResponse {
        return lineIntersectsCircle(a, b, this.position, this.radius);
    }

    override randomPoint(): Vector {
        return randomPointInsideCircle(this.position, this.radius);
    }

    override toRectangle(): RectangleHitbox {
        return new RectangleHitbox(v(this.position.x - this.radius, this.position.y - this.radius), v(this.position.x + this.radius, this.position.y + this.radius));
    }

    override isPointInside(point: Vector): boolean {
        return distance(point, this.position) < this.radius;
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
            v(
                Math.min(a.x, b.x),
                Math.min(a.y, b.y)
            ),
            v(
                Math.max(a.x, b.x),
                Math.max(a.y, b.y)
            )
        );
    }

    static fromRect(width: number, height: number, pos = v(0, 0)): RectangleHitbox {
        const size = v(width / 2, height / 2);

        return new RectangleHitbox(
            vSub(pos, size),
            vAdd(pos, size)
        );
    }

    override collidesWith(that: Hitbox): boolean {
        if (that instanceof CircleHitbox) {
            return rectangleCollision(this.min, this.max, that.position, that.radius);
        } else if (that instanceof RectangleHitbox) {
            return rectRectCollision(that.min, that.max, this.min, this.max);
        } else if (that instanceof ComplexHitbox) {
            return that.collidesWith(this);
        }

        return false;
    }

    override resolveCollision(that: Hitbox): void {
        if (that instanceof CircleHitbox) {
            return that.resolveCollision(this);
        }

        throw new Error("Not Implemented");
    }

    override distanceTo(that: Hitbox): CollisionRecord {
        if (that instanceof CircleHitbox) {
            return distanceToRectangle(this.min, this.max, that.position, that.radius);
        } else if (that instanceof RectangleHitbox) {
            return rectangleDistanceToRectangle(that.min, that.max, this.min, this.max);
        }

        throw new Error(`Invalid hitbox object (Received an instance of ${Object.getPrototypeOf(that)?.constructor?.name ?? "an unknown prototype"})`);
    }

    override clone(): RectangleHitbox {
        return new RectangleHitbox(vClone(this.min), vClone(this.max));
    }

    override transform(position: Vector, scale = 1, orientation = 0 as Orientation): RectangleHitbox {
        const rect = transformRectangle(position, this.min, this.max, scale, orientation);

        return new RectangleHitbox(rect.min, rect.max);
    }

    override scale(scale: number): void {
        const centerX = (this.min.x + this.max.x) / 2;
        const centerY = (this.min.y + this.max.y) / 2;
        this.min = v((this.min.x - centerX) * scale + centerX, (this.min.y - centerY) * scale + centerY);
        this.max = v((this.max.x - centerX) * scale + centerX, (this.max.y - centerY) * scale + centerY);
    }

    override intersectsLine(a: Vector, b: Vector): IntersectionResponse {
        return lineIntersectsRect(a, b, this.min, this.max);
    }

    override randomPoint(): Vector {
        return {
            x: randomFloat(this.min.x, this.max.x),
            y: randomFloat(this.min.y, this.max.y)
        };
    }

    override toRectangle(): RectangleHitbox {
        return this;
    }

    override isPointInside(point: Vector): boolean {
        return point.x > this.min.x && point.y > this.min.y && point.x < this.max.x && point.y < this.max.y;
    }
}

export class ComplexHitbox extends Hitbox {
    position = v(0, 0);
    hitboxes: Array<RectangleHitbox | CircleHitbox>;

    constructor(...hitboxes: Array<RectangleHitbox | CircleHitbox>) {
        super();
        this.hitboxes = hitboxes;
    }

    override collidesWith(that: Hitbox): boolean {
        return this.hitboxes.some(hitbox => hitbox.collidesWith(that));
    }

    override resolveCollision(that: Hitbox): void {
        if (that instanceof CircleHitbox) {
            return that.resolveCollision(this);
        }

        throw new Error("Not Implemented");
    }

    override distanceTo(that: CircleHitbox | RectangleHitbox): CollisionRecord {
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

    override clone(): ComplexHitbox {
        return new ComplexHitbox(...this.hitboxes);
    }

    override transform(position: Vector, scale?: number | undefined, orientation?: Orientation | undefined): ComplexHitbox {
        this.position = position;

        return new ComplexHitbox(
            ...this.hitboxes.map(hitbox => hitbox.transform(position, scale, orientation))
        );
    }

    override scale(scale: number): void {
        for (const hitbox of this.hitboxes) hitbox.scale(scale);
    }

    override intersectsLine(a: Vector, b: Vector): IntersectionResponse {
        const intersections: Array<{ readonly point: Vector, readonly normal: Vector }> = [];

        // get the closest intersection point from the start of the line
        for (const hitbox of this.hitboxes) {
            const intersection = hitbox.intersectsLine(a, b);
            if (intersection) intersections.push(intersection);
        }

        return intersections.sort((c, d) => distanceSquared(c.point, a) - distanceSquared(d.point, a))[0] ?? null;
    }

    override randomPoint(): Vector {
        return pickRandomInArray(this.hitboxes).randomPoint();
    }

    override toRectangle(): RectangleHitbox {
        const min = v(Number.MAX_VALUE, Number.MAX_VALUE);
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

    override isPointInside(point: Vector): boolean {
        for (const hitbox of this.hitboxes) {
            if (hitbox.isPointInside(point)) return true;
        }
        return false;
    }
}

export class PolygonHitbox extends Hitbox {
    points: Vector[];

    constructor(...points: Vector[]) {
        super();
        this.points = points;
    }

    override collidesWith(that: Hitbox): boolean {
        if (that instanceof RectangleHitbox) return rectPolyCollision(that.min, that.max, this.points);
        throw new Error("Not Implemented");
    }

    override resolveCollision(_that: Hitbox): void {
        throw new Error("Not Implemented");
    }

    override distanceTo(_that: CircleHitbox | RectangleHitbox): CollisionRecord {
        throw new Error("Not Implemented");
    }

    override clone(): PolygonHitbox {
        return new PolygonHitbox(...this.points);
    }

    override transform(position: Vector, scale: number = 1, orientation: Orientation = 0): PolygonHitbox {
        return new PolygonHitbox(
            ...this.points.map(point => vMul(addAdjust(position, point, orientation), scale))
        );
    }

    override scale(scale: number): void {
        for (let i = 0, length = this.points.length; i < length; i++) {
            this.points[i] = vMul(this.points[i], scale);
        }
    }

    override intersectsLine(a: Vector, b: Vector): IntersectionResponse {
        throw new Error("Not Implemented");
    }

    override randomPoint(): Vector {
        const rect = this.toRectangle();
        let point: Vector;

        do {
            point = rect.randomPoint();
        } while (!this.isPointInside(point));

        return point;
    }

    override toRectangle(): RectangleHitbox {
        const min = v(Number.MAX_VALUE, Number.MAX_VALUE);
        const max = v(0, 0);
        for (const point of this.points) {
            min.x = Math.min(min.x, point.x);
            min.y = Math.min(min.y, point.y);
            max.x = Math.max(max.x, point.x);
            max.y = Math.max(max.y, point.y);
        }

        return new RectangleHitbox(min, max);
    }

    override isPointInside(point: Vector): boolean {
        const { x, y } = point;
        let inside = false;
        const count = this.points.length;
        // take first and last
        // then take second and second last
        // so on
        for (let i = 0, j = count - 1; i < count; j = i++) {
            const { x: xi, y: yi } = this.points[i];
            const { x: xj, y: yj } = this.points[j];

            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }

        return inside;
    }
}
