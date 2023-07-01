/**
 * An interface to represent a 2D vector. The x and y values are coordinates in a 2D space.
 */
export interface Vector {
    x: number
    y: number
}

/**
 * Creates a new Vector.
 * @param x - The horizontal (x-axis) coordinate.
 * @param y - The vertical (y-axis) coordinate.
 * @returns A new Vector object with the provided x and y coordinates.
 */
export function v(x: number, y: number): Vector {
    return { x, y };
}

/**
 * Adds two Vectors together.
 * @param a - The first Vector.
 * @param b - The second Vector.
 * @returns A new Vector resulting from the addition of vectors a and b.
 */
export function vAdd(a: Vector, b: Vector): Vector {
    return v(a.x + b.x, a.y + b.y);
}

/**
 * Subtracts one Vector from another.
 * @param a - The Vector to be subtracted from.
 * @param b - The Vector to subtract.
 * @returns A new Vector resulting from the subtraction of vector b from vector a.
 */
export function vSub(a: Vector, b: Vector): Vector {
    return v(a.x - b.x, a.y - b.y);
}

/**
 * Multiplies a Vector by a scalar.
 * @param a - The Vector to be multiplied.
 * @param n - The scalar value to multiply the Vector by.
 * @returns A new Vector resulting from the multiplication of vector a and scalar n.
 */
export function vMul(a: Vector, n: number): Vector {
    return v(a.x * n, a.y * n);
}

/**
 * Clones a Vector.
 * @param vector - The Vector to be cloned.
 * @returns A new Vector with the same coordinates as the input Vector.
 */
export function vClone(vector: Vector): Vector {
    return v(vector.x, vector.y);
}

/**
 * Rotates a Vector by a given angle.
 * @param vector - The Vector to be rotated.
 * @param angle - The angle in radians to rotate the Vector by.
 * @returns A new Vector resulting from the rotation of the input Vector by the given angle.
 */
export function vRotate(vector: Vector, angle: number): Vector {
    const cos = Math.cos(angle); 
    const sin = Math.sin(angle);
    return v(vector.x * cos - vector.y * sin, vector.x * sin + vector.y * cos);
}
