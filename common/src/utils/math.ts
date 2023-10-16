import { type ObstacleDefinition } from "../definitions/obstacles";
import { type Orientation } from "../typings";
import { type Hitbox, RectangleHitbox } from "./hitbox";
import {
    v,
    vAdd,
    vDiv,
    vDot,
    type Vector,
    vLength,
    vLengthSqr,
    vMul,
    vNormalize,
    vNormalizeSafe,
    vSub
} from "./vector";

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
    return Math.acos((a.x * b.x + a.y * b.y) / Math.sqrt(distanceSquared(v(0, 0), a) * distanceSquared(v(0, 0), b)));
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
export function vecLerp(start: Vector, end: Vector, interpFactor: number): Vector {
    return vAdd(vMul(start, 1 - interpFactor), vMul(end, interpFactor));
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
 * @param a The number to conform
 * @param min The minimum value the number can hold
 * @param max The maximum value the number can hold
 */
export function clamp(a: number, min: number, max: number): number {
    return a < max ? a > min ? a : min : max;
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

export function velFromAngle(angle: number, multiplier = 1): Vector {
    return {
        x: Math.cos(angle) * multiplier,
        y: Math.sin(angle) * multiplier
    };
}

export interface CollisionRecord { collided: boolean, distance: number }

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
 * @param orientation The orientation to rotate it
 * @return A new Vector
 */
export function addAdjust(position1: Vector, position2: Vector, orientation: Orientation): Vector {
    if (orientation === 0) return vAdd(position1, position2);
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
    return vAdd(position1, v(xOffset, yOffset));
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
export function transformRectangle(pos: Vector, min: Vector, max: Vector, scale: number, orientation: Orientation): { min: Vector, max: Vector } {
    min = vMul(min, scale);
    max = vMul(max, scale);
    if (orientation !== 0) {
        const minX = min.x; const minY = min.y;
        const maxX = max.x; const maxY = max.y;
        switch (orientation) {
            case 1:
                min = v(maxX, minY);
                max = v(minX, maxY);
                break;
            case 2:
                min = v(maxX, maxY);
                max = v(minX, minY);
                break;
            case 3:
                min = v(minX, maxY);
                max = v(maxX, minY);
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
            return vAdd(a0, vMul(vSub(a1, a0), t));
        }
    }
    return null;
}

export type IntersectionResponse = { point: Vector, normal: Vector } | null;

/**
 * Checks if a line intersects a circle
 * @param s0 The start of the line
 * @param s1 The end of the line
 * @param pos The position of the circle
 * @param rad The radius of the circle
 * @return An intersection response with the intersection position and normal Vectors, returns null if they don't intersect
*/
export function lineIntersectsCircle(s0: Vector, s1: Vector, pos: Vector, rad: number): IntersectionResponse {
    let d = vSub(s1, s0);
    const len = Math.max(vLength(d), 0.000001);
    d = vDiv(d, len);
    const m = vSub(s0, pos);
    const b = vDot(m, d);
    const c = vDot(m, m) - rad * rad;
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
        const point = vAdd(s0, vMul(d, t));
        return {
            point,
            normal: vNormalize(vSub(point, pos))
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
    let d = vSub(s1, s0);
    const dist = vLength(d);
    d = dist > eps ? vDiv(d, dist) : v(1.0, 0.0);

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
    const p = vAdd(s0, vMul(d, tmin));
    // Intersection normal
    const c = vAdd(min, vMul(vSub(max, min), 0.5));
    const p0 = vSub(p, c);
    const d0 = vMul(vSub(min, max), 0.5);

    const x = p0.x / Math.abs(d0.x) * 1.001;
    const y = p0.y / Math.abs(d0.y) * 1.001;
    const n = vNormalizeSafe(v(x < 0.0 ? Math.ceil(x) : Math.floor(x), y < 0.0 ? Math.ceil(y) : Math.floor(y)), v(1.0, 0.0));
    return {
        point: p,
        normal: n
    };
}

export type CollisionResponse = { dir: Vector, pen: number } | null;

export function circleCircleIntersection(pos0: Vector, rad0: number, pos1: Vector, rad1: number): CollisionResponse {
    const r = rad0 + rad1;
    const toP1 = vSub(pos1, pos0);
    const distSqr = vLengthSqr(toP1);
    if (distSqr < r * r) {
        const dist = Math.sqrt(distSqr);
        return {
            dir: dist > 0.00001 ? vDiv(toP1, dist) : v(1.0, 0.0),
            pen: r - dist
        };
    }
    return null;
}

export function rectCircleIntersection(min: Vector, max: Vector, pos: Vector, radius: number): CollisionResponse {
    if (pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y) {
        const e = vMul(vSub(max, min), 0.5);
        const c = vAdd(min, e);
        const p = vSub(pos, c);
        const xp = Math.abs(p.x) - e.x - radius;
        const yp = Math.abs(p.y) - e.y - radius;
        if (xp > yp) {
            return {
                dir: v(p.x > 0.0 ? 1.0 : -1.0, 0.0),
                pen: -xp
            };
        }
        return {
            dir: v(0.0, p.y > 0.0 ? 1.0 : -1.0),
            pen: -yp
        };
    }
    const cpt = v(clamp(pos.x, min.x, max.x), clamp(pos.y, min.y, max.y));
    let dir = vSub(pos, cpt);

    dir = vSub(cpt, pos);

    const dstSqr = vLengthSqr(dir);
    if (dstSqr < radius * radius) {
        const dst = Math.sqrt(dstSqr);
        return {
            dir: dst > 0.0001 ? vDiv(dir, dst) : v(1.0, 0.0),
            pen: radius - dst
        };
    }

    return null;
}

export function calculateDoorHitboxes(definition: ObstacleDefinition, position: Vector, rotation: Orientation): { openHitbox: Hitbox, openAltHitbox: Hitbox } {
    if (!(definition.hitbox instanceof RectangleHitbox) || !definition.isDoor) {
        throw new Error("Unable to calculate hitboxes for door: Not a door or hitbox is non-rectangular");
    }
    // noinspection JSSuspiciousNameCombination
    const openRectangle = transformRectangle(
        addAdjust(position, vAdd(definition.hingeOffset, v(-definition.hingeOffset.y, definition.hingeOffset.x)), rotation),
        definition.hitbox.min,
        definition.hitbox.max,
        1,
        absMod(rotation + 1, 4) as Orientation
    );
    // noinspection JSSuspiciousNameCombination
    const openAltRectangle = transformRectangle(
        addAdjust(position, vAdd(definition.hingeOffset, v(definition.hingeOffset.y, -definition.hingeOffset.x)), rotation),
        definition.hitbox.min,
        definition.hitbox.max,
        1,
        absMod(rotation - 1, 4) as Orientation
    );
    return {
        openHitbox: new RectangleHitbox(openRectangle.min, openRectangle.max),
        openAltHitbox: new RectangleHitbox(openAltRectangle.min, openAltRectangle.max)
    };
}
