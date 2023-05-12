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
        x: randomFloat(minX, maxX),
        y: randomFloat(minY, maxY)
    };
}

/**
 * @return A random angle in radians.
 */
export function randomRotation(): number {
    return randomFloat(-Math.PI, Math.PI);
}
