import {
    v,
    vAdd,
    type Vector,
    vMul
} from "./vector";

import { type Orientation } from "../typings";

/**
 * Calculate the angle between two vectors.
 * @param a The first vector.
 * @param b The second vector.
 * @returns The angle, in radians, between the two vectors.
 */
export function angleBetween(a: Vector, b: Vector): number {
    const dy = a.y - b.y;
    const dx = a.x - b.x;
    return Math.atan2(dy, dx);
}

/**
 * Signed modulo operator.
 * @param a The dividend.
 * @param n The divisor.
 */
export const mod = (a: number, n: number): number => a - Math.floor(a / n) * n;

/**
 * Normalize an angle to a value between -π and π.
 * @param radians The angle, in radians.
 */
export const normalizeAngle = (radians: number): number => {
    return Math.atan2(Math.sin(radians), Math.cos(radians));
};

/**
 * Find the smallest angle between two vertices.
 * @param start The initial vertex, in radians.
 * @param end The final vertex, in radians.
 */
export const minimizeAngle = (start: number, end: number): number => {
    start = normalizeAngle(start);
    end = normalizeAngle(end);

    const CW = end - start;
    const CCW = -((Math.PI * 2) - CW);

    return Math.abs(CW) < Math.abs(CCW) ? CW : CCW;
};

/**
 * Converts degrees to radians.
 * @param degrees An angle in degrees.
 * @return The angle in radians.
 */
export const degreesToRadians = (degrees: number): number => degrees * (Math.PI / 180);

/**
 * Converts radians to degrees.
 * @param radians An angle in radians.
 * @return The angle in degrees.
 */
export const radiansToDegrees = (radians: number): number => (radians / Math.PI) * 180;

/**
 * Get the distance between two points.
 * @param a The first point.
 * @param b The second point.
 */
export const distance = (a: Vector, b: Vector): number => Math.sqrt(((b.x - a.x) ** 2) + ((b.y - a.y) ** 2));

/**
 * Get the distance between two points squared.
 * @param a The first point
 * @param b The second point
 */
export const distanceSquared = (a: Vector, b: Vector): number => ((b.x - a.x) ** 2) + ((b.y - a.y) ** 2);

export function lerp(start: number, end: number, percentage: number): number {
    return start * (1.0 - percentage) + end * percentage;
}

export function vecLerp(start: Vector, end: Vector, percentage: number): Vector {
    return vAdd(vMul(start, 1.0 - percentage), vMul(end, percentage));
}

/**
 * Check whether two circles collide.
 * @param pos1 The center of the first circle.
 * @param r1 The radius of the first circle.
 * @param pos2 The center of the second circle.
 * @param r2 The radius of the second circle.
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
 * Conform a number to specified bounds.
 * @param a The number to conform.
 * @param min The minimum value the number can hold.
 * @param max The maximum value the number can hold.
 */
function clamp(a: number, min: number, max: number): number {
    return a < max ? a > min ? a : min : max;
}

export function rectRectCollision(min1: Vector, max1: Vector, min2: Vector, max2: Vector): boolean {
    return min2.x < max1.x && min2.y < max1.y && min1.x < max2.x && min1.y < max2.y;
}

export interface CollisionRecord { collided: boolean, distance: number }

/**
 * Determine the distance between two circles.
 * @param pos1 The center of the first circle.
 * @param r1 The radius of the first circle.
 * @param pos2 The center of the second circle.
 * @param r2 The radius of the second circle.
 * @returns An object representation of whether the circles collide and the distance between their closest vertices.
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
    return { collided: distSquared < radSquared, distance: radSquared - distSquared };
}

export function addAdjust(position1: Vector, position2: Vector, orientation: Orientation): Vector {
    if (orientation === 0) return vAdd(position1, position2);
    let xOffset: number, yOffset: number;
    switch (orientation) {
        case 1:
            xOffset = -position2.y;
            // noinspection JSSuspiciousNameCombination
            yOffset = position2.x;
            break;
        case 2:
            xOffset = -position2.x;
            yOffset = -position2.y;
            break;
        case 3:
            // noinspection JSSuspiciousNameCombination
            xOffset = position2.y;
            yOffset = -position2.x;
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
                min = v(minX, maxY);
                max = v(maxX, minY);
                break;
            case 2:
                min = v(maxX, maxY);
                max = v(minX, minY);
                break;
            case 3:
                min = v(maxX, minY);
                max = v(minX, maxY);
                break;
        }
    }
    return {
        min: addAdjust(pos, min, orientation),
        max: addAdjust(pos, max, orientation)
    };
}
