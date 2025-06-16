import { type Orientation } from "../typings";

/**
 * An interface to represent a 2D vector. The x and y values are coordinates in a 2D space
 */
export interface Vector {
    x: number
    y: number
}

export const Vec = Object.freeze({
    /**
     * Creates a new `Vector`
     * @param x The horizontal (x-axis) coordinate
     * @param y The vertical (y-axis) coordinate
     * @returns A new `Vector` object with the provided x and y coordinates
     */
    create(x: number, y: number): Vector {
        return { x, y };
    },
    /**
     * Adds two `Vector`s together
     * @param a The first `Vector`
     * @param b The second `Vector`
     * @returns A new `Vector` resulting from the addition of vectors `a` and `b`
     */
    add(a: Vector, b: Vector): Vector {
        return this.create(a.x + b.x, a.y + b.y);
    },
    /**
     * Adds two vectors together
     * @param a The first `Vector`
     * @param x The x-coordinate of the second vector
     * @param y The y-coordinate of the second vector
     * @returns A new `Vector` resulting from the addition of `a`, and `x` and `y`
     */
    addComponent(a: Vector, x: number, y: number): Vector {
        return this.create(a.x + x, a.y + y);
    },
    /**
     * Subtracts one `Vector` from another
     * @param a The `Vector` to be subtracted from
     * @param b The `Vector` to subtract
     * @returns A new `Vector` resulting from the subtraction of vector `b` from vector `a`
     */
    sub(a: Vector, b: Vector): Vector {
        return this.create(a.x - b.x, a.y - b.y);
    },
    /**
     * Subtracts one vector from another
     * @param a The `Vector` to be subtracted from
     * @param x The x-coordinate of the second vector
     * @param y The y-coordinate of the second vector
     * @returns A new `Vector` resulting from the subtraction of `x` and `y` from `b`
     */
    subComponent(a: Vector, x: number, y: number): Vector {
        return this.create(a.x - x, a.y - y);
    },
    /**
     * Multiplies a `Vector` by a scalar
     * @param a The `Vector` to be multiplied
     * @param n The scalar value to multiply the `Vector` by
     * @returns A new `Vector` resulting from the multiplication of vector `a` and scalar `n`
     */
    scale(a: Vector, n: number): Vector {
        return this.create(a.x * n, a.y * n);
    },
    /**
     * Clones a `Vector`
     * @param vector The `Vector` to be cloned
     * @returns A new `Vector` with the same components as the input `Vector`
     */
    clone(vector: Vector): Vector {
        return this.create(vector.x, vector.y);
    },
    /**
     * Rotates a `Vector` by a given angle
     * @param vector The `Vector` to be rotated
     * @param angle The angle in radians to rotate the `Vector` by
     * @returns A new `Vector` resulting from the rotation of the input `Vector` by the given angle
     */
    rotate(vector: Vector, angle: number): Vector {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return this.create(vector.x * cos - vector.y * sin, vector.x * sin + vector.y * cos);
    },
    /**
     * Returns the squared length of a `Vector`
     * @param a The `Vector` to be measured
     * @returns The length of the `Vector` `a`, squared
     */
    squaredLength(a: Vector): number {
        return a.x * a.x + a.y * a.y;
    },
    /**
     * Returns the length of a `Vector`
     * @param a The vector to be measured
     * @returns The length of the `Vector` `a`
     */
    length(a: Vector): number {
        return Math.sqrt(Vec.squaredLength(a));
    },
    /**
     * Returns the direction of a given vector in radians
     * @param a The vector whose direction needs to be known
     */
    direction(a: Vector) {
        return Math.atan2(a.y, a.x);
    },
    /**
     * Performs the dot product between two vectors, returning the result. This operation is commutative
     * @param a The first `Vector`
     * @param b The second `Vector`
     * @returns The result of performing the dot product using the component method
     */
    dotProduct(a: Vector, b: Vector): number {
        return a.x * b.x + a.y * b.y;
    },
    /**
     * Projects a `Vector` onto another
     * @param projected The `Vector` to be projected
     * @param projectOnto The `Vector` that will be projected onto
     * @returns A new `Vector` parallel to `projectOnto` which is the projection of `projected`
     */
    project(projected: Vector, projectOnto: Vector): Vector {
        return this.scale(projectOnto, this.dotProduct(projected, projectOnto) / this.squaredLength(projectOnto));
    },
    /**
     * Creates a new `Vector` parallel to the original, but whose length is 1
     * @param a The `Vector` to normalize
     * @param fallback A `Vector` to clone and return in case the normalization operation fails
     * @returns A `Vector` whose length is 1 and is parallel to the original vector
     */
    normalizeSafe(a: Vector, fallback?: Vector): Vector {
        fallback ??= this.create(1.0, 0.0);
        const eps = 0.000001;
        const len = Vec.length(a);
        return len > eps
            ? {
                x: a.x / len,
                y: a.y / len
            }
            : Vec.clone(fallback);
    },
    /**
     * Creates a new `Vector` parallel to the original, but whose length is 1
     * @param a The `Vector` to normalize
     * @returns A `Vector` whose length is 1 and is parallel to the original vector
     */
    normalize(a: Vector): Vector {
        const eps = 0.000001;
        const len = Vec.length(a);
        return len > eps
            ? {
                x: a.x / len,
                y: a.y / len
            }
            : Vec.clone(a);
    },
    /**
     * Returns the additive inverse of this vector; in other words, a `Vector` that, when added to this one, gives the zero vector
     * @param a The `Vector` to invert
     * @returns A `Vector` whose components are -1 multiplied by the corresponding component in the original `Vector`
     */
    invert(a: Vector): Vector {
        return this.create(-a.x, -a.y);
    },
    /**
     * Tests whether two `Vectors` are equal, within a certain tolerance
     * @param a The first `Vector`
     * @param b The second `Vector`
     * @param epsilon The largest difference in any component that will be accepted as being "equal"
     * @returns Whether or not the two vectors are considered equal with the given epsilon
     */
    equals(a: Vector, b: Vector, epsilon = 0.001): boolean {
        return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
    },
    /**
     * Returns the angle between two vectors
     * @param a The first vector
     * @param b The second vector
     */
    angleBetweenVectors(a: Vector, b: Vector): number {
        return Math.acos((a.x * b.x + a.y * b.y) / Math.sqrt(Vec.length(a) * Vec.length(b)));
    },
    /**
     * Interpolate between two `Vector`s
     * @param start The start `Vector`
     * @param end The end `Vector`
     * @param interpFactor The interpolation factor ranging from 0 to 1
     *
     */
    lerp(start: Vector, end: Vector, interpFactor: number): Vector {
        return Vec.add(Vec.scale(start, 1 - interpFactor), Vec.scale(end, interpFactor));
    },
    /**
     * Takes a polar representation of a vector and converts it into a cartesian one
     * @param angle The vector's angle in radians
     * @param magnitude The vector's length. Defaults to 1
     * @returns A new vector whose length is `magnitude` and whose direction is `angle`
     */
    fromPolar(angle: number, magnitude = 1): Vector {
        return {
            x: Math.cos(angle) * magnitude,
            y: Math.sin(angle) * magnitude
        };
    },
    /**
     * Add a `Vector` to another one and rotate it by the given orientation
     * @param position1 The initial `Vector`
     * @param position2 The `Vector` to add to the first one
     * @param orientation The orientation to rotate the second vector by
     * @return A new `Vector`
     */
    addAdjust(position1: Vector, position2: Vector, orientation: Orientation): Vector {
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
});
