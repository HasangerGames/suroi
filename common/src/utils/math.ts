import { type ObstacleDefinition } from "../definitions/obstacles";
import { type Orientation } from "../typings";
import { RectangleHitbox } from "./hitbox";
import { ObstacleSpecialRoles } from "./objectDefinitions";
import { Vec, type Vector } from "./vector";

const π = Math.PI;
const halfπ = π / 2;
const τ = 2 * π;
export const Angle = Object.freeze({
    /**
     * Draws a line between two points and returns that line's angle
     * @param a The first point, used as the head of the vector
     * @param b The second point, used as the tail of the vector
     * @returns The angle, in radians, of the line going from b to a
     */
    betweenPoints(a: Vector, b: Vector): number {
        return Math.atan2(a.y - b.y, a.x - b.x);
    },
    /**
     * Normalize an angle to a value between -π and π
     * @param radians The angle, in radians
     */
    normalize(radians: number): number {
        return Numeric.absMod(radians - π, τ) - π;
    },
    /**
     * Find the smallest difference between two angles
     * (the difference between 10º and 350º can be either -340º or 20º—chances are, you're looking for the latter)
     * @param start The initial angle, in radians
     * @param end The final angle, in radians
     */
    minimize(start: number, end: number): number {
        return Numeric.absMod(end - start + π, τ) - π;
    },
    /**
     * Converts degrees to radians
     * @param degrees An angle in degrees
     * @return The angle in radians
     */
    degreesToRadians(degrees: number): number {
        return degrees * π / 180;
    },
    /**
     * Converts radians to degrees
     * @param radians An angle in radians
     * @return The angle in degrees
     */
    radiansToDegrees(radians: number): number {
        return radians / π * 180;
    },
    orientationToRotation(orientation: number): number {
        return -this.normalize(orientation * halfπ);
    },
    /**
     * Converts a unit vector to radians
     * @param v The vector to convert
     */
    unitVectorToRadians(v: Vector) {
        return Math.atan2(v.y, v.x);
    }
});

export const Numeric = Object.freeze({
    /**
     * Works like regular modulo, but negative numbers cycle back around: hence,
     * `-1 % 4` gives `3` and not `-1`
     * @param a The dividend
     * @param n The divisor
     */
    absMod(a: number, n: number): number {
        return a >= 0
            ? a % n
            : (a % n + n) % n;
    },
    /**
     * Interpolate between two values
     * @param start The start value
     * @param end The end value
     * @param interpFactor The interpolation factor
     * @returns A number corresponding to the linear interpolation between `a` and `b` at factor `interpFactor`
     */
    lerp(start: number, end: number, interpFactor: number): number {
        return start * (1 - interpFactor) + end * interpFactor;
    },
    /**
     * Conform a number to specified bounds
     * @param value The number to conform
     * @param min The minimum value the number can be
     * @param max The maximum value the number can be
     */
    clamp(value: number, min: number, max: number): number {
        return value < max ? value > min ? value : min : max;
    },
    /**
     * Add two orientations
     * @param n1 The first orientation
     * @param n2 The second orientation
     * @return The sum of the two `Orientation`s
     */
    addOrientations(n1: Orientation | number, n2: Orientation | number): Orientation {
        return (n1 + n2) % 4 as Orientation;
    }
});

export const Geometry = Object.freeze({
    /**
     * Get the distance between two points
     * @param a The first point
     * @param b The second point
     */
    distance(a: Vector, b: Vector): number {
        return Math.sqrt(this.distanceSquared(a, b));
    },
    /**
     * Get the distance between two points squared
     * @param a The first point
     * @param b The second point
     */
    distanceSquared(a: Vector, b: Vector): number {
        return (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    },
    /**
     * Returns the area of a triangle whose vertices are the three vectors passed in
     * @param a The first vertex
     * @param b The second vertex
     * @param c The third vertex
     * @returns The area of the triangle formed by the three provided vectors
     */
    signedAreaTri(a: Vector, b: Vector, c: Vector): number {
        return (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x);
    },
    /**
     * Transform a rectangle by a given position and orientation
     * @param pos The position to transform the rectangle by
     * @param min The rectangle min `Vector`
     * @param max The rectangle max `Vector`
     * @param scale The rectangle's scale
     * @param orientation The orientation to rotate it
     * @return A new Rectangle transformed by the given position and orientation
     */
    transformRectangle(pos: Vector, min: Vector, max: Vector, scale: number, orientation: Orientation): { readonly min: Vector, readonly max: Vector } {
        min = Vec.scale(min, scale);
        max = Vec.scale(max, scale);
        if (orientation !== 0) {
            const minX = min.x; const minY = min.y;
            const maxX = max.x; const maxY = max.y;
            switch (orientation) {
                case 1:
                    min = Vec.create(maxX, minY);
                    max = Vec.create(minX, maxY);
                    break;
                case 2:
                    min = Vec.create(maxX, maxY);
                    max = Vec.create(minX, minY);
                    break;
                case 3:
                    min = Vec.create(minX, maxY);
                    max = Vec.create(maxX, minY);
                    break;
            }
        }
        return {
            min: Vec.addAdjust(pos, min, orientation),
            max: Vec.addAdjust(pos, max, orientation)
        };
    }
});

export const Collision = Object.freeze({
    /**
     * Check if two circles are colliding
     * @param centerA The center of the first circle
     * @param radiusA The radius of the first circle
     * @param centerB The center of the second circle
     * @param radiusB The radius of the second circle
     */
    circleCollision(centerA: Vector, radiusA: number, centerB: Vector, radiusB: number): boolean {
        const a = radiusA + radiusB;
        const x = centerA.x - centerB.x;
        const y = centerA.y - centerB.y;

        return a * a > x * x + y * y;
    },
    /**
     * Check if a circle and a rectangle are colliding
     * @param min The min Vector of the rectangle
     * @param max The max vector of the rectangle
     * @param pos The center of the circle
     * @param rad The radius of the circle
     */
    rectangleCollision(min: Vector, max: Vector, pos: Vector, rad: number): boolean {
        const cpt = {
            x: Numeric.clamp(pos.x, min.x, max.x),
            y: Numeric.clamp(pos.y, min.y, max.y)
        };

        const distX = pos.x - cpt.x;
        const distY = pos.y - cpt.y;
        const distSquared = distX * distX + distY * distY;

        return (distSquared < rad * rad) || (pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y);
    },
    /**
     * Check if two rectangles collide
     * @param min1 The min `Vector` of the first rectangle
     * @param max1 The max `Vector` of the first rectangle
     * @param min2 The min `Vector` of the second rectangle
     * @param max2 The max `Vector` of the second rectangle
     * @returns `true` if the two rectangles collide, `false` if not
     */
    rectRectCollision(min1: Vector, max1: Vector, min2: Vector, max2: Vector): boolean {
        return min2.x < max1.x && min2.y < max1.y && min1.x < max2.x && min1.y < max2.y;
    },
    /**
     * Determines the distance between two circles
     * @param centerA The center of the first circle
     * @param radiusA The radius of the first circle
     * @param centerB The center of the second circle
     * @param radiusB The radius of the second circle
     * @returns An object containing a boolean indicating whether the two circles are colliding and a number indicating the distance between them
     */
    distanceBetweenCircles(centerA: Vector, radiusA: number, centerB: Vector, radiusB: number): CollisionRecord {
        const a = radiusA + radiusB;
        const x = centerA.x - centerB.x;
        const y = centerA.y - centerB.y;
        const a2 = a * a;
        const xy = x * x + y * y;
        return { collided: a2 > xy, distance: a2 - xy };
    },
    /**
     * Determines the distance between a circle and a rectangle
     * @param min The min `Vector` of the rectangle
     * @param max The max `Vector` of the rectangle
     * @param circlePos The center of the circle
     * @param circleRad The radius of the circle
     * @returns An object containing a boolean indicating whether the two shapes are colliding and a number indicating the distance between them
     */
    distanceBetweenRectangleCircle(min: Vector, max: Vector, circlePos: Vector, circleRad: number): CollisionRecord {
        const distX = Math.max(min.x, Math.min(max.x, circlePos.x)) - circlePos.x;
        const distY = Math.max(min.y, Math.min(max.y, circlePos.y)) - circlePos.y;
        const radSquared = circleRad * circleRad;
        const distSquared = distX * distX + distY * distY;
        return { collided: distSquared < radSquared, distance: distSquared - radSquared };
    },
    /**
     * Determines the distance between two rectangles
     * @param min1 The min `Vector` of the first rectangle
     * @param max1 The max `Vector` of the first rectangle
     * @param min2 The min `Vector` of the second rectangle
     * @param max2 The max `Vector` of the second rectangle
     * @returns An object containing a boolean indicating whether the two rectangles are colliding and a number indicating the distance between them
     */
    distanceBetweenRectangles(min1: Vector, max1: Vector, min2: Vector, max2: Vector): CollisionRecord {
        const distX = Math.max(min1.x, Math.min(max1.x, min2.x, max2.x)) - Math.min(min1.x, Math.max(max1.x, min2.x, max2.x));
        const distY = Math.max(min1.y, Math.min(max1.y, min2.y, max2.y)) - Math.min(min1.y, Math.max(max1.y, min2.y, max2.y));

        // If distX or distY is negative, the rectangles are overlapping in that dimension, and the distance is 0
        if (distX < 0 || distY < 0) {
            return { collided: true, distance: 0 };
        }

        // Calculate the squared distance between the rectangles
        const distSquared = distX * distX + distY * distY;
        return { collided: false, distance: distSquared };
    },
    /**
     * Determines where a line intersects another line
     * @param startA The start of the first line
     * @param endA The end of the first line
     * @param startB The start of the second line
     * @param endB The end of the second line
     * @return The intersection position and null if no such intersection exists
     */
    lineIntersectsLine(startA: Vector, endA: Vector, startB: Vector, endB: Vector): Vector | null {
        const x1 = Geometry.signedAreaTri(startA, endA, endB);
        const x2 = Geometry.signedAreaTri(startA, endA, startB);

        if (x1 !== 0 && x2 !== 0 && x1 * x2 < 0) {
            const x3 = Geometry.signedAreaTri(startB, endB, startA);
            const x4 = x3 + x2 - x1;

            if (x3 * x4 < 0) {
                return Vec.add(
                    startA,
                    Vec.scale(
                        Vec.sub(endA, startA),
                        x3 / (x3 - x4)
                    )
                );
            }
        }

        return null;
    },
    /**
     * Determines where a line intersects a circle
     * @param s0 The start of the line
     * @param s1 The end of the line
     * @param pos The position of the circle
     * @param rad The radius of the circle
     * @return An intersection response with the intersection position and normal `Vector`s, or `null` if they don't intersect
     */
    lineIntersectsCircle(s0: Vector, s1: Vector, pos: Vector, rad: number): IntersectionResponse {
        let d = Vec.sub(s1, s0);
        const len = Math.max(Vec.length(d), 0.000001);
        d = Vec.normalizeSafe(d);

        const m = Vec.sub(s0, pos);
        const b = Vec.dotProduct(m, d);
        const c = Vec.dotProduct(m, m) - rad * rad;

        if (c > 0 && b > 0) return null;

        const discSq = b * b - c;
        if (discSq < 0) return null;

        const disc = Math.sqrt(discSq);
        const t = -b < disc
            ? disc - b
            : -b - disc;

        if (t <= len) {
            const point = Vec.add(s0, Vec.scale(d, t));
            return {
                point,
                normal: Vec.normalize(Vec.sub(point, pos))
            };
        }

        return null;
    },
    /**
     * Determines where a line intersects a rectangle
     * @param s0 The start of the line
     * @param s1 The end of the line
     * @param min The min Vector of the rectangle
     * @param max The max Vector of the rectangle
     * @return An intersection response with the intersection position and normal `Vector`s, or `null` if they don't intersect
     */
    lineIntersectsRect(s0: Vector, s1: Vector, min: Vector, max: Vector): IntersectionResponse {
        let tmin = 0;
        let tmax = Number.MAX_VALUE;

        const eps = 1e-5;
        const r = s0;

        let d = Vec.sub(s1, s0);
        const dist = Vec.length(d);
        d = Vec.normalizeSafe(d);

        let absDx = Math.abs(d.x);
        let absDy = Math.abs(d.y);

        if (absDx < eps) {
            d.x = eps * 2;
            absDx = d.x;
        }

        if (absDy < eps) {
            d.y = eps * 2;
            absDy = d.y;
        }

        if (absDx > eps) {
            const tx1 = (min.x - r.x) / d.x;
            const tx2 = (max.x - r.x) / d.x;

            tmin = Math.max(tmin, Math.min(tx1, tx2));
            tmax = Math.min(tmax, Math.max(tx1, tx2));

            if (tmin > tmax) return null;
        }

        if (absDy > eps) {
            const ty1 = (min.y - r.y) / d.y;
            const ty2 = (max.y - r.y) / d.y;

            tmin = Math.max(tmin, Math.min(ty1, ty2));
            tmax = Math.min(tmax, Math.max(ty1, ty2));

            if (tmin > tmax) return null;
        }

        if (tmin > dist) return null;

        // Hit
        const p = Vec.add(s0, Vec.scale(d, tmin));

        // Intersection normal
        const c = Vec.add(min, Vec.scale(Vec.sub(max, min), 0.5));
        const p0 = Vec.sub(p, c);
        const d0 = Vec.scale(Vec.sub(min, max), 0.5);

        const x = p0.x / Math.abs(d0.x) * 1.001;
        const y = p0.y / Math.abs(d0.y) * 1.001;

        return {
            point: p,
            normal: Vec.normalizeSafe(
                Vec.create(Math.trunc(x), Math.trunc(y)),
                Vec.create(1, 0)
            )
        };
    },
    /**
     * Checks if a line intersects a rectangle
     * @param s0 The start of the line
     * @param s1 The end of the line
     * @param min The min Vector of the rectangle
     * @param max The max Vector of the rectangle
     * @return `true` if the line intersects, `false` otherwise
     */
    lineIntersectsRectTest(s0: Vector, s1: Vector, min: Vector, max: Vector): boolean {
        let tmin = 0;
        let tmax = Number.MAX_VALUE;

        const eps = 1e-5;
        let d = Vec.sub(s1, s0);
        const dist = Vec.length(d);
        d = Vec.normalizeSafe(d);

        let absDx = Math.abs(d.x);
        let absDy = Math.abs(d.y);

        if (absDx < eps) {
            d.x = eps * 2;
            absDx = d.x;
        }

        if (absDy < eps) {
            d.y = eps * 2;
            absDy = d.y;
        }

        if (absDx > eps) {
            const tx1 = (min.x - s0.x) / d.x;
            const tx2 = (max.x - s0.x) / d.x;

            tmin = Math.max(tmin, Math.min(tx1, tx2));
            tmax = Math.min(tmax, Math.max(tx1, tx2));

            if (tmin > tmax) return false;
        }

        if (absDy > eps) {
            const ty1 = (min.y - s0.y) / d.y;
            const ty2 = (max.y - s0.y) / d.y;

            tmin = Math.max(tmin, Math.min(ty1, ty2));
            tmax = Math.min(tmax, Math.max(ty1, ty2));

            if (tmin > tmax) return false;
        }

        return tmin <= dist;
    },
    circleCircleIntersection(centerA: Vector, radiusA: number, centerB: Vector, radiusB: number): CollisionResponse {
        const r = radiusA + radiusB;
        const toP1 = Vec.sub(centerB, centerA);
        const distSqr = Vec.squaredLength(toP1);

        return distSqr < r * r
            ? {
                dir: Vec.normalizeSafe(toP1),
                pen: r - Math.sqrt(distSqr)
            }
            : null;
    },
    rectCircleIntersection(min: Vector, max: Vector, pos: Vector, radius: number): CollisionResponse {
        if (
            min.x <= pos.x && pos.x <= max.x &&
            min.y <= pos.y && pos.y <= max.y
        ) {
            // circle center inside rectangle

            const halfDimension = Vec.scale(Vec.sub(max, min), 0.5);
            const p = Vec.sub(pos, Vec.add(min, halfDimension));
            const xp = Math.abs(p.x) - halfDimension.x - radius;
            const yp = Math.abs(p.y) - halfDimension.y - radius;

            return xp > yp
                ? {
                    dir: Vec.create(
                        p.x > 0 ? 1 : -1,
                        0
                    ),
                    pen: -xp
                }
                : {
                    dir: Vec.create(
                        0,
                        p.y > 0 ? 1 : -1
                    ),
                    pen: -yp
                };
        }

        const dir = Vec.sub(
            Vec.create(
                Numeric.clamp(pos.x, min.x, max.x),
                Numeric.clamp(pos.y, min.y, max.y)
            ),
            pos
        );
        const dstSqr = Vec.squaredLength(dir);

        if (dstSqr < radius * radius) {
            const dst = Math.sqrt(dstSqr);
            return {
                dir: Vec.normalizeSafe(dir),
                pen: radius - dst
            };
        }

        return null;
    },
    distanceToLine(p: Vector, a: Vector, b: Vector): number {
        const ab = Vec.sub(b, a);

        return Vec.squaredLength(
            Vec.sub(
                Vec.add(
                    a,
                    Vec.scale(
                        ab,
                        Numeric.clamp(
                            Vec.dotProduct(Vec.sub(p, a), ab) / Vec.dotProduct(ab, ab),
                            0, 1
                        )
                    )
                ),
                p
            )
        );
    },
    /**
     * Source
     * @link http://ahamnett.blogspot.com/2012/06/raypolygon-intersections.html
     */
    rayIntersectsLine(origin: Vector, direction: Vector, lineA: Vector, lineB: Vector): number | null {
        const segment = Vec.sub(lineB, lineA);
        const segmentPerp = Vec.create(segment.y, -segment.x);
        const perpDotDir = Vec.dotProduct(direction, segmentPerp);

        // If lines are parallel, no intersection
        if (Math.abs(perpDotDir) <= 1e-7) return null;

        const d = Vec.sub(lineA, origin);
        const distanceAlongRay = Vec.dotProduct(segmentPerp, d) / perpDotDir;
        const distanceAlongLine = Vec.dotProduct(Vec.create(direction.y, -direction.x), d) / perpDotDir;

        // If t is positive and s lies within the line it intersects; returns t
        return distanceAlongRay >= 0 && distanceAlongLine >= 0 && distanceAlongLine <= 1 ? distanceAlongRay : null;
    },
    rayIntersectsPolygon(origin: Vector, direction: Vector, polygon: Vector[]): number | null {
        let t = Number.MAX_VALUE;

        let intersected = false;
        for (
            let i = 0, length = polygon.length, j = length - 1;
            i < length;
            j = i++
        ) {
            const dist = Collision.rayIntersectsLine(origin, direction, polygon[j], polygon[i]);

            if (dist !== null && dist < t) {
                intersected = true;
                t = dist;
            }
        }

        // Returns closest intersection
        return intersected ? t : null;
    },
    rectRectIntersection(min0: Vector, max0: Vector, min1: Vector, max1: Vector): CollisionResponse {
        const e0 = Vec.scale(Vec.sub(max0, min0), 0.5);
        const e1 = Vec.scale(Vec.sub(max1, min1), 0.5);
        const n = Vec.sub(
            Vec.add(min1, e1),
            Vec.add(min0, e0)
        );
        const xo = e0.x + e1.x - Math.abs(n.x);
        const yo = e0.y + e1.y - Math.abs(n.y);

        return xo > 0 && yo > 0
            ? xo > yo
                ? {
                    dir: Vec.create(Math.sign(n.x), 0),
                    pen: xo
                }
                : {
                    dir: Vec.create(0, Math.sign(n.y)),
                    pen: yo
                }
            : null;
    }
});

export interface CollisionRecord {
    readonly collided: boolean
    readonly distance: number
}

export type IntersectionResponse = {
    readonly point: Vector
    readonly normal: Vector
} | null;

export type CollisionResponse = {
    readonly dir: Vector
    readonly pen: number
} | null;

export function calculateDoorHitboxes<
    // tf are you talking about
    // eslint-disable-next-line space-before-function-paren
    U extends (ObstacleDefinition & { readonly role: ObstacleSpecialRoles.Door })["operationStyle"]
>(
    definition: ObstacleDefinition & { readonly role: ObstacleSpecialRoles.Door, readonly operationStyle?: U },
    position: Vector,
    rotation: Orientation
): U extends "slide"
        ? { readonly openHitbox: RectangleHitbox }
        : { readonly openHitbox: RectangleHitbox, readonly openAltHitbox: RectangleHitbox } {
    if (!(definition.hitbox instanceof RectangleHitbox) || definition.role !== ObstacleSpecialRoles.Door) {
        throw new Error("Unable to calculate hitboxes for door: Not a door or hitbox is non-rectangular");
    }

    type Swivel = typeof definition & { readonly operationStyle: "swivel" };
    type Slide = typeof definition & { readonly operationStyle: "slide" };
    type Return = U extends "slide"
        ? { readonly openHitbox: RectangleHitbox }
        : { readonly openHitbox: RectangleHitbox, readonly openAltHitbox: RectangleHitbox };

    switch (definition.operationStyle) {
        case "slide": {
            const openHitbox = Geometry.transformRectangle(
                Vec.addAdjust(position, Vec.create((definition.hitbox.min.x - definition.hitbox.max.x) * ((definition as Slide).slideFactor ?? 1), 0), rotation),
                definition.hitbox.min,
                definition.hitbox.max,
                1,
                rotation
            );

            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            return {
                openHitbox: new RectangleHitbox(openHitbox.min, openHitbox.max)
            } as Return;
        }
        case "swivel":
        default: {
            const openRectangle = Geometry.transformRectangle(
                Vec.addAdjust(position, Vec.add((definition as Swivel).hingeOffset, Vec.create(-(definition as Swivel).hingeOffset.y, (definition as Swivel).hingeOffset.x)), rotation),
                definition.hitbox.min,
                definition.hitbox.max,
                1,
                Numeric.absMod(rotation + 1, 4) as Orientation
            );
            const openAltRectangle = Geometry.transformRectangle(
                Vec.addAdjust(position, Vec.add((definition as Swivel).hingeOffset, Vec.create((definition as Swivel).hingeOffset.y, -(definition as Swivel).hingeOffset.x)), rotation),
                definition.hitbox.min,
                definition.hitbox.max,
                1,
                Numeric.absMod(rotation - 1, 4) as Orientation
            );

            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            return {
                openHitbox: new RectangleHitbox(openRectangle.min, openRectangle.max),
                openAltHitbox: new RectangleHitbox(openAltRectangle.min, openAltRectangle.max)
            } as Return;
        }
    }
}

type NameGenerator<T extends string> = `${T}In` | `${T}Out` | `${T}InOut`;

function generatePolynomialEasingTriplet<T extends string>(degree: number, type: T): { readonly [K in NameGenerator<T>]: (t: number) => number } {
    const coeffCache = 2 ** (degree - 1);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return Object.freeze({
        [`${type}In`]: (t: number) => t ** degree,
        [`${type}Out`]: (t: number) => 1 - (1 - t) ** degree,
        [`${type}InOut`]: (t: number) => t < 0.5
            ? coeffCache * t ** degree
            : 1 - (coeffCache * (1 - t) ** degree)
    } as { [K in NameGenerator<T>]: (t: number) => number });
}

export type EasingFunction = (t: number) => number;

/**
 * A collection of functions for easing, based on
 * [this helpful reference](https://easings.net) and others
 */
export const EaseFunctions = Object.freeze({
    linear: (t: number) => t,

    sineIn: (t: number) => 1 - Math.cos(t * halfπ),
    sineOut: (t: number) => Math.sin(t * halfπ),
    sineInOut: (t: number) => (1 - Math.cos(π * t)) / 2,

    circIn: (t: number) => 1 - Math.sqrt(1 - (t * t)),
    circOut: (t: number) => Math.sqrt(1 - (t - 1) ** 2),
    circInOut: (t: number) => t < 0.5
        ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2
        : (Math.sqrt(1 - (-2 * (1 - t)) ** 2) + 1) / 2,

    elasticIn: (t: number) => t === 0 || t === 1
        ? t
        : -(2 ** (10 * (t - 1))) * Math.sin(π * (40 * (t - 1) - 3) / 6),
    elasticOut: (t: number) => t === 0 || t === 1
        ? t
        : 2 ** (-10 * t) * Math.sin(π * (40 * t - 3) / 6) + 1,
    elasticInOut: (t: number) => t === 0 || t === 1
        ? t
        : t < 0.5
            ? -(2 ** (10 * (2 * t - 1) - 1)) * Math.sin(π * (80 * (2 * t - 1) - 9) / 18)
            : 2 ** (-10 * (2 * t - 1) - 1) * Math.sin(π * (80 * (2 * t - 1) - 9) / 18) + 1,

    ...generatePolynomialEasingTriplet(2, "quadratic"),
    ...generatePolynomialEasingTriplet(3, "cubic"),
    ...generatePolynomialEasingTriplet(4, "quartic"),
    ...generatePolynomialEasingTriplet(5, "quintic"),
    ...generatePolynomialEasingTriplet(6, "sextic"),

    expoIn: (t: number) => t <= 0
        ? 0
        : 2 ** (-10 * (1 - t)),
    expoOut: (t: number) => t >= 1
        ? 1
        : 1 - 2 ** -(10 * t),
    expoInOut: (t: number) => t === 0 || t === 1
        ? t
        : t < 0.5
            ? 2 ** (10 * (2 * t - 1) - 1)
            : 1 - 2 ** (-10 * (2 * t - 1) - 1),

    backIn: (t: number) => (Math.sqrt(3) * (t - 1) + t) * t ** 2,
    backOut: (t: number) => 1 + ((Math.sqrt(3) + 1) * t - 1) * (t - 1) ** 2,
    backInOut: (t: number) => t < 0.5
        ? 4 * t * t * (3.6 * t - 1.3)
        : 4 * (t - 1) ** 2 * (3.6 * t - 2.3) + 1
});
