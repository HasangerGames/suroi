import { v, type Vector } from "./vector";

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
 * @return A random boolean.
 */
export function randomBoolean(): boolean {
    return Math.random() < 0.5;
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
 * @link https://stackoverflow.com/a/51727716/5905216
 * @param position The center of the circle.
 * @param radius The radius of the circle.
 * A vector representation of the randomized point.
 */
export function randomPointInsideCircle(position: Vector, radius: number): Vector {
    /*
        Easier method:

        Use the Pythagorean theorem:
        x*x + y*y = 1

        Isolate y
        y = ±√(1 - x*x)

        So for some x, the expression above yields y coordinates
        which lie on the unit circle
        Thus,

        const randomSign = () => Math.random() > 0.5 ? -1 : 1;
        const x = randomSign() * Math.random();

        return Vec2(x * radius, randomSign() * Math.sqrt(1 - x*x)).add(position);
    */

    let x: number, y: number;
    do {
        x = 2 * Math.random() - 1.0; // range [-1, +1)
        y = 2 * Math.random() - 1.0;
    } while ((x * x + y * y) >= 1); // check unit circle

    // scale and translate the points
    return v(x * radius + position.x, y * radius + position.y);
}
