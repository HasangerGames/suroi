import { Numeric } from "./math";
import { type Vector } from "./vector";

/**
 * Generate a random floating-point value.
 * @param min The minimum value that can be generated. (inclusive)
 * @param max The maximum value that can be generated. (exclusive)
 */
export function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

/**
 * Generate a random integer.
 * @param min The minimum value that can be generated. (inclusive)
 * @param max The maximum value that can be generated. (inclusive)
 * @returns A random integer between `min` and `max`
 */
export function random(min: number, max: number): number {
    return Math.floor(randomFloat(min, max + 1));
}

/**
 * @returns A random boolean.
 */
export function randomBoolean(): boolean {
    return Math.random() < 0.5;
}

/**
 * @returns Either `-1` or `1`
 */
export function randomSign(): -1 | 1 {
    return randomBoolean() ? -1 : 1;
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

/**
 * Generate a random point inside of a circle.
 * @param position The center of the circle.
 * @param maxRadius The maximum radius of the circle.
 * @param minRadius The minimum radius of the circle. Defaults to 0.
 * @returns A vector representation of the randomized point.
 */
export function randomPointInsideCircle(position: Vector, maxRadius: number, minRadius?: number): Vector {
    const angle = randomFloat(0, Math.PI * 2);
    const length = randomFloat(minRadius ?? 0, maxRadius);
    return {
        x: position.x + (Math.cos(angle) * length),
        y: position.y + (Math.sin(angle) * length)
    };
}

/**
 * Pick a random element from a weighted series of elements.
 * @param items The elements to choose from.
 * @param weights A legend of the elements' relative weights.
 */
export function weightedRandom<T>(items: readonly T[], weights: number[]): T {
    let i: number;
    for (i = 1; i < weights.length; i++) weights[i] += weights[i - 1];

    const random = Math.random() * weights[weights.length - 1];
    for (i = 0; i < weights.length; i++) { if (weights[i] > random) break; }
    return items[i];
}

export function pickRandomInArray<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

export class SeededRandom {
    private _rng = 0;

    constructor(seed: number) {
        this._rng = seed;
    }

    /**
     * @param [min = 0] min value (included)
     * @param [max = 1] max value (excluded)
     */
    get(min = 0, max = 1): number {
        this._rng = this._rng * 16807 % 2147483647;
        return Numeric.lerp(min, max, this._rng / 2147483647);
    }

    /**
     * @param [min = 0] min value (included)
     * @param [max = 1] max value (excluded)
     */
    getInt(min = 0, max = 1): number {
        return Math.round(this.get(min, max));
    }
}
