/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { type Vector } from "./vector";

/**
 * Generate a random floating-point value.
 * @param min The minimum value that can be generated.
 * @param max The maximum value that can be generated.
 */
export function randomFloat(min: number, max: number): number {
    return (Math.random() * (max - min) + min);
}

/**
 * Generate a random integer.
 * @param min The minimum value that can be generated.
 * @param max The maximum value that can be generated.
 */
export function random(min: number, max: number): number {
    return Math.floor(randomFloat(min, max + 1));
}

/**
 * Generate a vector of random direction and magnitude.
 * @param minX The minimum length in the x-direction.
 * @param maxX The maximum length in the x-direction.
 * @param minY The minimum length in the y-direction.
 * @param maxY The maximum length in the y-direction.
 */
export function randomVector(minX: number, maxX: number, minY: number, maxY: number): Vector {
    return {
        x: random(minX, maxX),
        y: random(minY, maxY)
    };
}

/**
 * Signed modulo operator.
 * @param a The dividend.
 * @param n The divisor.
 */
export const signedModulo = (a: number, n: number): number => a - Math.floor(a / n) * n;

/**
 * Normalize an angle to a value between 0 and 2π.
 * @param radians The angle, in radians.
 */
export const normalizeAngle = (radians: number): number => {
    if (radians === 0) return radians;
    radians %= Math.PI * 2;

    if (radians < 0) return (Math.PI * 2) - Math.abs(radians);
    else return radians;
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
 * Get the distance between two positions.
 * @param p1 The first position.
 * @param p2 The second position.
 */
export const distance = (p1: Vector, p2: Vector): number => Math.sqrt(((p2.x - p1.x) ** 2) + ((p2.y - p1.y) ** 2));

/**
 * Linearly interpolate between two values.
 * @param start The initial value.
 * @param end The final value.
 * @param amount The size of an interpolation step.
 */
export const lerp = (start: number, end: number, amount: number): number => (1 - amount) * start + amount * end;
