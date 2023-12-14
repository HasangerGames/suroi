import { type ObstacleDefinition } from "../definitions/obstacles";
import { type Orientation } from "../typings";
import { RectangleHitbox } from "./hitbox";
import { ObstacleSpecialRoles } from "./objectDefinitions";
import { Vec, type Vector } from "./vector";

/**
 * Draws a line between two points and returns that line's angle
 * @param a The first point, used as the head of the vector
 * @param b The second point, used as the tail of the vector
 * @returns The angle, in radians, of the line going from b to a
 */
export function angleBetweenPoints(a: Vector, b: Vector): number {
    const dy = a.y - b.y;
    const dx = a.x - b.x;
    return Math.atan2(dy, dx);
}

/**
 * Returns the angle between two vectors
 * @param a The first vector
 * @param b The second vector
 */
export function angleBetweenVectors(a: Vector, b: Vector): number {
    return Math.acos((a.x * b.x + a.y * b.y) / Math.sqrt(distanceSquared(Vec.create(0, 0), a) * distanceSquared(Vec.create(0, 0), b)));
}

/**
 * Works like regular modulo, but negative numbers cycle back around: hence,
 * `-1 % 4` gives `3` and not `-1`
 * @param a The dividend
 * @param n The divisor
 */
export function absMod(a: number, n: number): number {
    return a >= 0 ? a % n : (a % n + n) % n;
}

/**
 * Normalize an angle to a value between -π and π
 * @param radians The angle, in radians
 */
export function normalizeAngle(radians: number): number {
    const π = Math.PI;
    return absMod(radians - π, 2 * π) - π;
}

/**
 * Find the smallest angle between two vertices
 * @param start The initial vertex, in radians
 * @param end The final vertex, in radians
 */
export function minimizeAngle(start: number, end: number): number {
    start = normalizeAngle(start);
    end = normalizeAngle(end);

    const CW = end - start;
    const CCW = -((Math.PI * 2) - CW);

    return Math.abs(CW) < Math.abs(CCW) ? CW : CCW;
}

/**
 * Converts degrees to radians
 * @param degrees An angle in degrees
 * @return The angle in radians
 */
export function degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 * @param radians An angle in radians
 * @return The angle in degrees
 */
export function radiansToDegrees(radians: number): number {
    return (radians / Math.PI) * 180;
}

/**
 * Get the distance between two points
 * @param a The first point
 * @param b The second point
 */
export function distance(a: Vector, b: Vector): number {
    return Math.sqrt(distanceSquared(a, b));
}

/**
 * Get the distance between two points squared
 * @param a The first point
 * @param b The second point
 */
export function distanceSquared(a: Vector, b: Vector): number {
    return ((b.x - a.x) ** 2) + ((b.y - a.y) ** 2);
}

/**
 * Interpolate between two values
 * @param start The start value
 * @param end The end value
 * @param interpFactor The interpolation factor ranging from 0 to 1
 *
 */
export function lerp(start: number, end: number, interpFactor: number): number {
    return start * (1 - interpFactor) + end * interpFactor;
}

/**
 * Interpolate between two Vectors
 * @param start The start Vector
 * @param end The end Vector
 * @param interpFactor The interpolation factor ranging from 0 to 1
 *
 */
export function vLerp(start: Vector, end: Vector, interpFactor: number): Vector {
    return Vec.add(Vec.scale(start, 1 - interpFactor), Vec.scale(end, interpFactor));
}

/**
 * Check whether two circles collide
 * @param pos1 The center of the first circle
 * @param r1 The radius of the first circle
 * @param pos2 The center of the second circle
 * @param r2 The radius of the second circle
 */
export function circleCollision(pos1: Vector, r1: number, pos2: Vector, r2: number): boolean {
    const a = r1 + r2;
    const x = pos1.x - pos2.x;
    const y = pos1.y - pos2.y;

    return a * a > x * x + y * y;
}

/**
 * Check whether a circle and a rectangle collide
 * @param min The min Vector of the rectangle
 * @param max The max vector of the rectangle
 * @param pos2 The center of the circle
 * @param r2 The radius of the circle
 */
export function rectangleCollision(min: Vector, max: Vector, pos: Vector, rad: number): boolean {
    const cpt = {
        x: clamp(pos.x, min.x, max.x),
        y: clamp(pos.y, min.y, max.y)
    };

    const distX = pos.x - cpt.x; const distY = pos.y - cpt.y;
    const distSquared = distX * distX + distY * distY;

    return (distSquared < rad * rad) || (pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y);
}

/**
 * Conform a number to specified bounds
 * @param value The number to conform
 * @param min The minimum value the number can hold
 * @param max The maximum value the number can hold
 */
export function clamp(value: number, min: number, max: number): number {
    return value < max ? value > min ? value : min : max;
}

/**
 *
 * Check whether two rectangles collide
 * @param min The min Vector of the first rectangle
 * @param max The max vector of the first rectangle
 * @param min2 The min Vector of the second rectangle
 * @param max2 The max vector of the second rectangle
 */
export function rectRectCollision(min1: Vector, max1: Vector, min2: Vector, max2: Vector): boolean {
    return min2.x < max1.x && min2.y < max1.y && min1.x < max2.x && min1.y < max2.y;
}

/**
 * Takes a polar representation of a vector and converts it into a cartesian one
 * @param angle The vector's angle
 * @param magnitude The vector's length. Defaults to 1
 * @returns A new vector whose length is `magnitude` and whose direction is `angle`
 */
export function polarToVector(angle: number, magnitude = 1): Vector {
    return {
        x: Math.cos(angle) * magnitude,
        y: Math.sin(angle) * magnitude
    };
}

export interface CollisionRecord { readonly collided: boolean, readonly distance: number }

/**
 * Determine the distance between two circles
 * @param pos1 The center of the first circle
 * @param r1 The radius of the first circle
 * @param pos2 The center of the second circle
 * @param r2 The radius of the second circle
 * @returns An object representation of whether the circles collide and the distance between their closest vertices
 */
export function distanceToCircle(pos1: Vector, r1: number, pos2: Vector, r2: number): CollisionRecord {
    const a = r1 + r2;
    const x = pos1.x - pos2.x;
    const y = pos1.y - pos2.y;
    const a2 = a * a;
    const xy = (x * x + y * y);
    return { collided: a2 > xy, distance: a2 - xy };
}

/**
 * Determine the distance between a circle and a rectangle
 * @param min The min Vector of the rectangle
 * @param max The max vector of the rectangle
 * @param pos2 The center of the circle
 * @param r2 The radius of the circle
 * @returns An object representation of whether the circles collide and the distance between their closest vertices
 */
export function distanceToRectangle(min: Vector, max: Vector, circlePos: Vector, circleRad: number): CollisionRecord {
    const distX = Math.max(min.x, Math.min(max.x, circlePos.x)) - circlePos.x;
    const distY = Math.max(min.y, Math.min(max.y, circlePos.y)) - circlePos.y;
    const radSquared = circleRad * circleRad;
    const distSquared = (distX * distX + distY * distY);
    return { collided: distSquared < radSquared, distance: distSquared - radSquared };
}

/**
 * Determine the distance between two rectangles
 * @param min The min Vector of the first rectangle
 * @param max The max vector of the first rectangle
 * @param min2 The min Vector of the second rectangle
 * @param max2 The max vector of the second rectangle
 * @returns An object representation of whether the circles collide and the distance between their closest vertices
 */
export function rectangleDistanceToRectangle(min1: Vector, max1: Vector, min2: Vector, max2: Vector): CollisionRecord {
    const distX = Math.max(min1.x, Math.min(max1.x, min2.x, max2.x)) - Math.min(min1.x, Math.max(max1.x, min2.x, max2.x));
    const distY = Math.max(min1.y, Math.min(max1.y, min2.y, max2.y)) - Math.min(min1.y, Math.max(max1.y, min2.y, max2.y));

    // If distX or distY is negative, the rectangles are overlapping in that dimension, and the distance is 0
    if (distX < 0 || distY < 0) {
        return { collided: true, distance: 0 };
    }

    // Calculate the squared distance between the rectangles
    const distSquared = distX * distX + distY * distY;
    return { collided: false, distance: distSquared };
}

/**
 * Add two orientations
 * @param n1 The first orientation
 * @param n2 The second orientation
 * @return Both orientations added
 */
export function addOrientations(n1: Orientation, n2: Orientation): Orientation {
    return (n1 + n2) % 4 as Orientation;
}

/**
 * Add a Vector to another one and rotate it by the given orientation
 * @param position1 The initial Vector
 * @param position2 The Vector to add to the first one
 * @param orientation The orientation to rotate the second vector by
 * @return A new Vector
 */
export function addAdjust(position1: Vector, position2: Vector, orientation: Orientation): Vector {
    if (orientation === 0) return Vec.add(position1, position2);
    let xOffset: number, yOffset: number;
    switch (orientation) {
        case 1:
            // noinspection JSSuspiciousNameCombination
            xOffset = position2.y;
            yOffset = -position2.x;
            break;
        case 2:
            xOffset = -position2.x;
            yOffset = -position2.y;
            break;
        case 3:
            xOffset = -position2.y;
            // noinspection JSSuspiciousNameCombination
            yOffset = position2.x;
            break;
    }
    return Vec.add(position1, Vec.create(xOffset, yOffset));
}

/**
 * Transform a rectangle by a given position and orientation
 * @param pos The position to transform the rectangle by
 * @param min The rectangle min Vector
 * @param max The rectangle max Vector
 * @param scale The scale
 * @param orientation The orientation to rotate it
 * @return A new Rectangle transformed by the given position and orientation
 */
export function transformRectangle(pos: Vector, min: Vector, max: Vector, scale: number, orientation: Orientation): { readonly min: Vector, readonly max: Vector } {
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
        min: addAdjust(pos, min, orientation),
        max: addAdjust(pos, max, orientation)
    };
}

export function signedAreaTri(a: Vector, b: Vector, c: Vector): number {
    return (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x);
}

/**
 * Checks if a line intersects another line
 * @param a0 The start of the first line
 * @param a1 The end of the first line
 * @param b0 The start of the second line
 * @param b1 The end of the second line
 * @return The intersection position if it happened, if not returns null
*/
export function lineIntersectsLine(a0: Vector, a1: Vector, b0: Vector, b1: Vector): Vector | null {
    const x1 = signedAreaTri(a0, a1, b1);
    const x2 = signedAreaTri(a0, a1, b0);
    if (x1 !== 0.0 && x2 !== 0.0 && x1 * x2 < 0.0) {
        const x3 = signedAreaTri(b0, b1, a0);
        const x4 = x3 + x2 - x1;
        if (x3 * x4 < 0.0) {
            const t = x3 / (x3 - x4);
            return Vec.add(a0, Vec.scale(Vec.subtract(a1, a0), t));
        }
    }
    return null;
}

export type IntersectionResponse = { readonly point: Vector, readonly normal: Vector } | null;

/**
 * Checks if a line intersects a circle
 * @param s0 The start of the line
 * @param s1 The end of the line
 * @param pos The position of the circle
 * @param rad The radius of the circle
 * @return An intersection response with the intersection position and normal Vectors, returns null if they don't intersect
*/
export function lineIntersectsCircle(s0: Vector, s1: Vector, pos: Vector, rad: number): IntersectionResponse {
    let d = Vec.subtract(s1, s0);
    const len = Math.max(Vec.length(d), 0.000001);
    d = Vec.normalizeSafe(d);
    const m = Vec.subtract(s0, pos);
    const b = Vec.dotProduct(m, d);
    const c = Vec.dotProduct(m, m) - rad * rad;
    if (c > 0.0 && b > 0.0) {
        return null;
    }
    const discSq = b * b - c;
    if (discSq < 0.0) {
        return null;
    }
    const disc = Math.sqrt(discSq);
    let t = -b - disc;
    if (t < 0.0) {
        t = -b + disc;
    }
    if (t <= len) {
        const point = Vec.add(s0, Vec.scale(d, t));
        return {
            point,
            normal: Vec.normalize(Vec.subtract(point, pos))
        };
    }
    return null;
}

/**
 * Checks if a line intersects a rectangle
 * @param s0 The start of the line
 * @param s1 The end of the line
 * @param min The min Vector of the rectangle
 * @param max The max Vector of the rectangle
 * @return An intersection response with the intersection position and normal Vectors, returns null if they don't intersect
*/
export function lineIntersectsRect(s0: Vector, s1: Vector, min: Vector, max: Vector): IntersectionResponse {
    let tmin = 0;
    let tmax = Number.MAX_VALUE;
    const eps = 0.00001;
    const r = s0;
    let d = Vec.subtract(s1, s0);
    const dist = Vec.length(d);
    d = Vec.normalizeSafe(d);

    let absDx = Math.abs(d.x);
    let absDy = Math.abs(d.y);

    if (absDx < eps) {
        d.x = eps * 2.0;
        absDx = d.x;
    }
    if (absDy < eps) {
        d.y = eps * 2.0;
        absDy = d.y;
    }

    if (absDx > eps) {
        const tx1 = (min.x - r.x) / d.x;
        const tx2 = (max.x - r.x) / d.x;
        tmin = Math.max(tmin, Math.min(tx1, tx2));
        tmax = Math.min(tmax, Math.max(tx1, tx2));
        if (tmin > tmax) {
            return null;
        }
    }
    if (absDy > eps) {
        const ty1 = (min.y - r.y) / d.y;
        const ty2 = (max.y - r.y) / d.y;
        tmin = Math.max(tmin, Math.min(ty1, ty2));
        tmax = Math.min(tmax, Math.max(ty1, ty2));
        if (tmin > tmax) {
            return null;
        }
    }
    if (tmin > dist) {
        return null;
    }
    // Hit
    const p = Vec.add(s0, Vec.scale(d, tmin));
    // Intersection normal
    const c = Vec.add(min, Vec.scale(Vec.subtract(max, min), 0.5));
    const p0 = Vec.subtract(p, c);
    const d0 = Vec.scale(Vec.subtract(min, max), 0.5);

    const x = p0.x / Math.abs(d0.x) * 1.001;
    const y = p0.y / Math.abs(d0.y) * 1.001;
    const n = Vec.normalizeSafe(Vec.create(x < 0.0 ? Math.ceil(x) : Math.floor(x), y < 0.0 ? Math.ceil(y) : Math.floor(y)), Vec.create(1.0, 0.0));
    return {
        point: p,
        normal: n
    };
}

/**
 * Checks if a line intersects a rectangle
 * @param s0 The start of the line
 * @param s1 The end of the line
 * @param min The min Vector of the rectangle
 * @param max The max Vector of the rectangle
 * @return true if the line intersects, false otherwise
 */
export function lineIntersectsRect2(s0: Vector, s1: Vector, min: Vector, max: Vector): boolean {
    let tmin = 0;
    let tmax = Number.MAX_VALUE;
    const eps = 0.00001;
    const r = s0;
    let d = Vec.subtract(s1, s0);
    const dist = Vec.length(d);
    d = Vec.normalizeSafe(d);

    let absDx = Math.abs(d.x);
    let absDy = Math.abs(d.y);

    if (absDx < eps) {
        d.x = eps * 2.0;
        absDx = d.x;
    }

    if (absDy < eps) {
        d.y = eps * 2.0;
        absDy = d.y;
    }

    if (absDx > eps) {
        const tx1 = (min.x - r.x) / d.x;
        const tx2 = (max.x - r.x) / d.x;
        tmin = Math.max(tmin, Math.min(tx1, tx2));
        tmax = Math.min(tmax, Math.max(tx1, tx2));
        if (tmin > tmax) {
            return false;
        }
    }

    if (absDy > eps) {
        const ty1 = (min.y - r.y) / d.y;
        const ty2 = (max.y - r.y) / d.y;
        tmin = Math.max(tmin, Math.min(ty1, ty2));
        tmax = Math.min(tmax, Math.max(ty1, ty2));
        if (tmin > tmax) {
            return false;
        }
    }

    return tmin <= dist;
}

export type CollisionResponse = { readonly dir: Vector, readonly pen: number } | null;

export function circleCircleIntersection(centerA: Vector, radiusA: number, centerB: Vector, radiusB: number): CollisionResponse {
    const r = radiusA + radiusB;
    const toP1 = Vec.subtract(centerB, centerA);
    const distSqr = Vec.squaredLength(toP1);

    if (distSqr < r * r) {
        const dist = Math.sqrt(distSqr);
        return {
            dir: Vec.normalizeSafe(toP1),
            pen: r - dist
        };
    }
    return null;
}

export function rectCircleIntersection(min: Vector, max: Vector, pos: Vector, radius: number): CollisionResponse {
    if (pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y) {
        const e = Vec.scale(Vec.subtract(max, min), 0.5);
        const c = Vec.add(min, e);
        const p = Vec.subtract(pos, c);
        const xp = Math.abs(p.x) - e.x - radius;
        const yp = Math.abs(p.y) - e.y - radius;
        if (xp > yp) {
            return {
                dir: Vec.create(p.x > 0.0 ? 1.0 : -1.0, 0.0),
                pen: -xp
            };
        }
        return {
            dir: Vec.create(0.0, p.y > 0.0 ? 1.0 : -1.0),
            pen: -yp
        };
    }

    const cpt = Vec.create(clamp(pos.x, min.x, max.x), clamp(pos.y, min.y, max.y));
    let dir = Vec.subtract(pos, cpt);

    dir = Vec.subtract(cpt, pos);

    const dstSqr = Vec.squaredLength(dir);
    if (dstSqr < radius * radius) {
        const dst = Math.sqrt(dstSqr);
        return {
            dir: Vec.normalizeSafe(dir),
            pen: radius - dst
        };
    }

    return null;
}

export function distanceToLine(p: Vector, a: Vector, b: Vector): number {
    const ab = Vec.subtract(b, a);
    const c = Vec.dotProduct(Vec.subtract(p, a), ab) / Vec.dotProduct(ab, ab);
    const d = Vec.add(a, Vec.scale(ab, clamp(c, 0, 1)));
    const e = Vec.subtract(d, p);
    return Vec.dotProduct(e, e);
}

// http://ahamnett.blogspot.com/2012/06/raypolygon-intersections.html
export function rayIntersectsLine(origin: Vector, direction: Vector, lineA: Vector, lineB: Vector): number | null {
    const segment = Vec.subtract(lineB, lineA);
    const segmentPerp = Vec.create(segment.y, -segment.x);
    const perpDotDir = Vec.dotProduct(direction, segmentPerp);

    // If lines are parallel, no intersection
    if (Math.abs(perpDotDir) <= 0.000001) return null;

    const d = Vec.subtract(lineA, origin);

    const distanceAlongRay = Vec.dotProduct(segmentPerp, d) / perpDotDir;

    const distanceAlongLine = Vec.dotProduct(Vec.create(direction.y, -direction.x), d) / perpDotDir;

    // If t is positive and s lies within the line it intersects; returns t
    return distanceAlongRay >= 0 && distanceAlongLine >= 0 && distanceAlongLine <= 1 ? distanceAlongRay : null;
}

export function rayIntersectsPolygon(origin: Vector, direction: Vector, polygon: Vector[]): number | null {
    let t = Number.MAX_VALUE;

    let intersected = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const dist = rayIntersectsLine(origin, direction, polygon[j], polygon[i]);
        if (dist !== null && dist < t) {
            intersected = true;
            t = dist;
        }
    }

    // Returns closest intersection
    return intersected ? t : null;
}

export function rectRectIntersection(min0: Vector, max0: Vector, min1: Vector, max1: Vector): CollisionResponse {
    const e0 = Vec.scale(Vec.subtract(max0, min0), 0.5);
    const c0 = Vec.add(min0, e0);
    const e1 = Vec.scale(Vec.subtract(max1, min1), 0.5);
    const c1 = Vec.add(min1, e1);
    const n = Vec.subtract(c1, c0);
    const xo = e0.x + e1.x - Math.abs(n.x);
    if (xo > 0.0) {
        const yo = e0.y + e1.y - Math.abs(n.y);
        if (yo > 0.0) {
            if (xo > yo) {
                return {
                    dir: n.x < 0 ? Vec.create(-1, 0) : Vec.create(1, 0),
                    pen: xo
                };
            }
            return {
                dir: n.y < 0 ? Vec.create(0, -1) : Vec.create(0, 1),
                pen: yo
            };
        }
    }
    return null;
}

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
            const openHitbox = transformRectangle(
                addAdjust(position, Vec.create((definition.hitbox.min.x - definition.hitbox.max.x) * ((definition as Slide).slideFactor ?? 1), 0), rotation),
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
            const openRectangle = transformRectangle(
                addAdjust(position, Vec.add((definition as Swivel).hingeOffset, Vec.create(-(definition as Swivel).hingeOffset.y, (definition as Swivel).hingeOffset.x)), rotation),
                definition.hitbox.min,
                definition.hitbox.max,
                1,
                absMod(rotation + 1, 4) as Orientation
            );
            const openAltRectangle = transformRectangle(
                addAdjust(position, Vec.add((definition as Swivel).hingeOffset, Vec.create((definition as Swivel).hingeOffset.y, -(definition as Swivel).hingeOffset.x)), rotation),
                definition.hitbox.min,
                definition.hitbox.max,
                1,
                absMod(rotation - 1, 4) as Orientation
            );

            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            return {
                openHitbox: new RectangleHitbox(openRectangle.min, openRectangle.max),
                openAltHitbox: new RectangleHitbox(openAltRectangle.min, openAltRectangle.max)
            } as Return;
        }
    }
}
