import {
    v,
    vAdd,
    type Vector,
    vMul,
    vSub,
    vLength,
    vDiv,
    vDot
} from "./vector";

import { type Orientation } from "../typings";
import { type Hitbox, RectangleHitbox } from "./hitbox";
import { type ObstacleDefinition } from "../definitions/obstacles";

/**
 * Calculate the angle between two vectors
 * @param a The first vector
 * @param b The second vector
 * @returns The angle, in radians, between the two vectors
 */
export function angleBetween(a: Vector, b: Vector): number {
    const dy = a.y - b.y;
    const dx = a.x - b.x;
    return Math.atan2(dy, dx);
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
    return Math.atan2(Math.sin(radians), Math.cos(radians));
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

export function lerp(start: number, end: number, interpFactor: number): number {
    return start * (1 - interpFactor) + end * interpFactor;
}

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

export function rectRectCollision(min1: Vector, max1: Vector, min2: Vector, max2: Vector): boolean {
    return min2.x < max1.x && min2.y < max1.y && min1.x < max2.x && min1.y < max2.y;
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

export function distanceToRectangle(min: Vector, max: Vector, circlePos: Vector, circleRad: number): CollisionRecord {
    const distX = Math.max(min.x, Math.min(max.x, circlePos.x)) - circlePos.x;
    const distY = Math.max(min.y, Math.min(max.y, circlePos.y)) - circlePos.y;
    const radSquared = circleRad * circleRad;
    const distSquared = (distX * distX + distY * distY);
    return { collided: distSquared < radSquared, distance: distSquared - radSquared };
}

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

export function addOrientations(n1: Orientation, n2: Orientation): Orientation {
    return (n1 + n2) % 4 as Orientation;
}

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

export type intersectionResponse = { point: Vector, normal: Vector } | null;

export function lineIntersectsCircle(s0: Vector, s1: Vector, pos: Vector, rad: number): Vector | null {
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
        return point;
    }
    return null;
}

export function lineIntersectsRect(s0: Vector, s1: Vector, min: Vector, max: Vector): Vector | null {
    let tmin = 0;
    let tmax = Number.MAX_VALUE;
    const eps = 0.00001;
    const r = s0;
    let d = vSub(s1, s0);
    const dist = vLength(d);
    d = dist > eps ? vDiv(d, dist) : v(1.0, 0.0);

    let absDx = Math.abs(d.x);
    let absDy = Math.abs(d.y);

    // @HACK: fix this function
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

    return p;
}

export function lineIntersectsRect2(s0: Vector, s1: Vector, min: Vector, max: Vector): Vector | null {
    // Returns proper intersection point if the segment
    // begins inside of the aabb
    const segments = [{ a: v(min.x, min.y), b: v(max.x, min.y) }, { a: v(max.x, min.y), b: v(max.x, max.y) }, { a: v(max.x, max.y), b: v(min.x, max.y) }, { a: v(min.x, max.y), b: v(min.x, min.y) }];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const res = intersectSegmentSegment(s0, s1, seg.a, seg.b);
        if (res) {
            return res;
        }
    }
    return null;
}

export function calculateDoorHitboxes(definition: ObstacleDefinition, position: Vector, rotation: Orientation): { openHitbox: Hitbox, openAltHitbox: Hitbox } {
    if (!(definition.hitbox instanceof RectangleHitbox) || !definition.isDoor) {
        throw new Error("Unable to calculate hitboxes for door: Not a door or hitbox is non-rectangular");
    }
    const openRectangle = transformRectangle(
        addAdjust(position, vAdd(definition.hingeOffset, v(definition.hingeOffset.y, definition.hingeOffset.x)), rotation),
        definition.hitbox.min,
        definition.hitbox.max,
        1,
        absMod(rotation - 1, 4) as Orientation
    );
    // noinspection JSSuspiciousNameCombination
    const openAltRectangle = transformRectangle(
        addAdjust(position, vAdd(definition.hingeOffset, v(-definition.hingeOffset.y, -definition.hingeOffset.x)), rotation),
        definition.hitbox.min,
        definition.hitbox.max,
        1,
        absMod(rotation + 1, 4) as Orientation
    );
    return {
        openHitbox: new RectangleHitbox(openRectangle.min, openRectangle.max),
        openAltHitbox: new RectangleHitbox(openAltRectangle.min, openAltRectangle.max)
    };
}
