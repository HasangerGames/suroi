import { type ObstacleDefinition } from "../definitions/obstacles";
import { type Orientation } from "../typings";
import { RectangleHitbox } from "./hitbox";
import { Vec, type Vector } from "./vector";

export const π = Math.PI;
export const halfπ = π / 2;
export const τ = 2 * π;

// For accessibility

export const PI = π;
export const HALF_PI = π / 2;
export const TAU = 2 * π;

export const Angle = Object.freeze({
    /**
     * Draws a line between two points and returns that line's angle with respect to the horizontal axis
     * @param a The first point, used as the tail of the vector
     * @param b The second point, used as the head of the vector
     * @returns The angle, in radians, of the line going from `a` to `b`
     */
    betweenPoints(a: Vector, b: Vector): number {
        return Math.atan2(a.y - b.y, a.x - b.x);
    },
    /**
     * Normalize an angle to a value between `-π` and `π`
     * @param radians The angle, in radians
     */
    normalize(radians: number): number {
        return Numeric.absMod(radians - π, τ) - π;
    },
    /**
     * Find the smallest difference between two angles
     * (the difference between 10º and 350º can be either -340º or 20º—chances are, you're looking for the latter)
     * @param start The initial angle, in radians
     * @param end The final angle, in radians
     * @returns The smallest difference between the two angles
     */
    minimize(start: number, end: number): number {
        return Numeric.absMod(end - start + π, τ) - π;
    },
    /**
     * Converts degrees to radians
     * @param degrees An angle in degrees
     * @return The angle in radians
     */
    degreesToRadians(degrees: number): number {
        return degrees * π / 180;
    },
    /**
     * Converts radians to degrees
     * @param radians An angle in radians
     * @return The angle in degrees
     */
    radiansToDegrees(radians: number): number {
        return radians / π * 180;
    },
    orientationToRotation(orientation: number): number {
        return -this.normalize(orientation * halfπ);
    }
});

export const Numeric = Object.freeze({
    /**
     * Works like regular modulo, but negative numbers cycle back around:
     * `absMod(-1, 4)` gives `3` and `-1 % 4` gives `-1`
     * @param a The dividend
     * @param n The divisor
     */
    absMod(a: number, n: number): number {
        return a >= 0
            ? a % n
            : (a % n + n) % n;
    },
    /**
     * Interpolates between two values
     * @param start The start value
     * @param end The end value
     * @param interpFactor The interpolation factor
     * @returns A number corresponding to the linear interpolation between `a` and `b` at factor `interpFactor`
     */
    lerp(start: number, end: number, interpFactor: number): number {
        return start * (1 - interpFactor) + end * interpFactor;
    },
    delerp(t: number, a: number, b: number) {
        return Numeric.clamp((t - a) / (b - a), 0.0, 1.0);
    },
    /**
     * Conform a number to specified bounds
     * @param value The number to conform
     * @param min The minimum value the number can be
     * @param max The maximum value the number can be
     * @returns The value, clamped to the interval `[min, max]`
     */
    clamp<N extends number | bigint>(value: N, min: N, max: N): N {
        return value < max ? value > min ? value : min : max;
    },
    /**
     * Add two orientations
     * @param n1 The first orientation
     * @param n2 The second orientation
     * @return The sum of the two `Orientation`s
     */
    addOrientations(n1: Orientation, n2: Orientation): Orientation {
        return (n1 + n2) % 4 as Orientation;
    },
    /**
     * Remaps a value from a range to another
     * @param value The value to remap
     * @param min0 The minimum of the range the value currently belongs to
     * @param max0 The maximum of the range the value currently belongs to
     * @param min1 The minimum of the range the value should be remapped to
     * @param max1 The maximum of the range the value should be remapped to
     */
    remap(value: number, min0: number, max0: number, min1: number, max1: number) {
        return Numeric.lerp(min1, max1, Numeric.clamp((value - min0) / (max0 - min0), 0, 1));
    },
    /**
     * Returns the smaller of two values
     * @param a The first value
     * @param b The second value
     * @returns The smallest of the two
     */
    min<N extends number | bigint>(a: N, b: N): N {
        return a < b ? a : b;
    },
    /**
     * Returns the larger of two values
     * @param a The first value
     * @param b The second value
     * @returns The largest of the two
     */
    max<N extends number | bigint>(a: N, b: N): N {
        return a > b ? a : b;
    },
    /**
     * Tests whether two numbers are equal, within a certain tolerance
     * @param a The first number
     * @param b The second number
     * @param epsilon The largest difference between the numbers that will be accepted as being "equal"
     * @returns Whether or not the two numbers are considered equal with the given epsilon
     */
    equals(a: number, b: number, epsilon = 0.001): boolean {
        return Math.abs(a - b) <= epsilon;
    }
});

export const Geometry = Object.freeze({
    /**
     * Get the distance between two points
     * @param a The first point
     * @param b The second point
     */
    distance(a: Vector, b: Vector): number {
        return Math.sqrt(this.distanceSquared(a, b));
    },
    /**
     * Get the squared distance between two points
     * @param a The first point
     * @param b The second point
     */
    distanceSquared(a: Vector, b: Vector): number {
        return (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    },
    /**
     * Returns the area of a triangle whose vertices are the three vectors passed in
     * @param a The first vertex
     * @param b The second vertex
     * @param c The third vertex
     * @returns The area of the triangle formed by the three provided vectors
     */
    signedAreaTri(a: Vector, b: Vector, c: Vector): number {
        return (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x);
    },
    /**
     * Transform a rectangle by a given position and orientation
     * @param pos The position to transform the rectangle by
     * @param min The rectangle min `Vector`
     * @param max The rectangle max `Vector`
     * @param scale The rectangle's scale
     * @param orientation The orientation to rotate it
     * @return A new Rectangle transformed by the given position and orientation
     */
    transformRectangle(pos: Vector, min: Vector, max: Vector, scale: number, orientation: Orientation): { readonly min: Vector, readonly max: Vector } {
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
            min: Vec.addAdjust(pos, min, orientation),
            max: Vec.addAdjust(pos, max, orientation)
        };
    }
});

export const Statistics = Object.freeze({
    average(values: readonly number[]): number {
        return values.reduce((acc, cur) => acc + cur, 0) / values.length;
    },
    geomAvg(values: readonly number[]): number {
        return values.reduce((acc, cur) => acc * cur, 1) ** (1 / values.length);
    },
    stddev(values: readonly number[]): number {
        const avg = Statistics.average(values);
        return Math.sqrt(Statistics.average(values.map(v => (v - avg) ** 2)));
    },
    median(values: readonly number[]): number {
        if (values.length % 2) {
            return Array.from(values).sort((a, b) => a - b)[values.length >> 1];
        }
        const sorted = Array.from(values).sort((a, b) => a - b); // mfw no toSorted cuz lib < es2023

        const halfLength = values.length / 2;
        return (sorted[halfLength] + sorted[halfLength - 1]) / 2;
    }
});

export const Collision = Object.freeze({
    /**
     * Check if two circles are colliding
     * @param centerA The center of the first circle
     * @param radiusA The radius of the first circle
     * @param centerB The center of the second circle
     * @param radiusB The radius of the second circle
     */
    circleCollision(centerA: Vector, radiusA: number, centerB: Vector, radiusB: number): boolean {
        const a = radiusA + radiusB;
        const x = centerA.x - centerB.x;
        const y = centerA.y - centerB.y;

        return a * a > x * x + y * y;
    },
    /**
     * Check if a circle and a rectangle are colliding
     * @param min The min Vector of the rectangle
     * @param max The max vector of the rectangle
     * @param pos The center of the circle
     * @param rad The radius of the circle
     */
    rectangleCollision(min: Vector, max: Vector, pos: Vector, rad: number): boolean {
        const cpt = {
            x: Numeric.clamp(pos.x, min.x, max.x),
            y: Numeric.clamp(pos.y, min.y, max.y)
        };

        const distX = pos.x - cpt.x;
        const distY = pos.y - cpt.y;
        const distSquared = distX * distX + distY * distY;

        return (distSquared < rad * rad) || (pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y);
    },
    /**
     * Check if two rectangles collide
     * @param min1 The min `Vector` of the first rectangle
     * @param max1 The max `Vector` of the first rectangle
     * @param min2 The min `Vector` of the second rectangle
     * @param max2 The max `Vector` of the second rectangle
     * @returns `true` if the two rectangles collide, `false` if not
     */
    rectRectCollision(min1: Vector, max1: Vector, min2: Vector, max2: Vector): boolean {
        return min2.x < max1.x && min2.y < max1.y && min1.x < max2.x && min1.y < max2.y;
    },
    /**
     * Determines the distance between two circles
     * @param centerA The center of the first circle
     * @param radiusA The radius of the first circle
     * @param centerB The center of the second circle
     * @param radiusB The radius of the second circle
     * @returns An object containing a boolean indicating whether the two circles are colliding and a number indicating the distance between them
     */
    distanceBetweenCircles(centerA: Vector, radiusA: number, centerB: Vector, radiusB: number): CollisionRecord {
        const a = radiusA + radiusB;
        const x = centerA.x - centerB.x;
        const y = centerA.y - centerB.y;
        const a2 = a * a;
        const xy = x * x + y * y;
        return { collided: a2 > xy, distance: xy - a2 };
    },
    /**
     * Determines the distance between a circle and a rectangle
     * @param min The min `Vector` of the rectangle
     * @param max The max `Vector` of the rectangle
     * @param circlePos The center of the circle
     * @param circleRad The radius of the circle
     * @returns An object containing a boolean indicating whether the two shapes are colliding and a number indicating the distance between them
     */
    distanceBetweenRectangleCircle(min: Vector, max: Vector, circlePos: Vector, circleRad: number): CollisionRecord {
        const distX = Numeric.clamp(circlePos.x, min.x, max.x) - circlePos.x;
        const distY = Numeric.clamp(circlePos.y, min.y, max.y) - circlePos.y;
        const radSquared = circleRad * circleRad;
        const distSquared = distX * distX + distY * distY;
        return { collided: distSquared < radSquared, distance: distSquared - radSquared };
    },
    /**
     * Determines the distance between two rectangles
     * @param min1 The min `Vector` of the first rectangle
     * @param max1 The max `Vector` of the first rectangle
     * @param min2 The min `Vector` of the second rectangle
     * @param max2 The max `Vector` of the second rectangle
     * @returns An object containing a boolean indicating whether the two rectangles are colliding and a number indicating the distance between them
     */
    distanceBetweenRectangles(min1: Vector, max1: Vector, min2: Vector, max2: Vector): CollisionRecord {
        const distX = Numeric.max(min1.x, Math.min(max1.x, min2.x, max2.x)) - Numeric.min(min1.x, Math.max(max1.x, min2.x, max2.x));
        const distY = Numeric.max(min1.y, Math.min(max1.y, min2.y, max2.y)) - Numeric.min(min1.y, Math.max(max1.y, min2.y, max2.y));

        // If distX or distY is negative, the rectangles are overlapping in that dimension, and the distance is 0
        if (distX < 0 || distY < 0) {
            return { collided: true, distance: 0 };
        }

        // Calculate the squared distance between the rectangles
        const distSquared = distX * distX + distY * distY;
        return { collided: false, distance: distSquared };
    },
    /**
     * Determines where a line intersects another line
     * @param startA The start of the first line
     * @param endA The end of the first line
     * @param startB The start of the second line
     * @param endB The end of the second line
     * @return The intersection position and null if no such intersection exists
     */
    lineIntersectsLine(startA: Vector, endA: Vector, startB: Vector, endB: Vector): Vector | null {
        const x1 = Geometry.signedAreaTri(startA, endA, endB);
        const x2 = Geometry.signedAreaTri(startA, endA, startB);

        if (x1 !== 0 && x2 !== 0 && x1 * x2 < 0) {
            const x3 = Geometry.signedAreaTri(startB, endB, startA);
            const x4 = x3 + x2 - x1;

            if (x3 * x4 < 0) {
                return Vec.add(
                    startA,
                    Vec.scale(
                        Vec.sub(endA, startA),
                        x3 / (x3 - x4)
                    )
                );
            }
        }

        return null;
    },
    /**
     * Determines the Vector describing the point in which two line segments, each described by a pair of Vector points,
     * intersect, if at all.
     *
     * This method uses the parametric definition of lines to quickly find a point of intersection.
     *
     * @param segmentAStart - A Vector describing the point at which the first line segment begins.
     * @param segmentAEnd - A Vector describing the point at which the first line segment ends.
     * @param segmentBStart - A Vector describing the point at which the second line segment begins.
     * @param segmentBEnd - A Vector describing the point at which the second line segment ends.
     *
     * @returns The point of intersection between the two line segments, if it exists. `null` if an intersection does
     * not exist.
     */
    lineSegmentIntersection(segmentAStart: Vector, segmentAEnd: Vector, segmentBStart: Vector, segmentBEnd: Vector): Vector | null {
        // Calculate the vectors representing the two line segments.
        // These vectors describe the direction and length of travel to go from the start to the end of the respective
        // line segments.
        const Sa: Vector = Vec.sub(segmentAEnd, segmentAStart);
        const Sb: Vector = Vec.sub(segmentBEnd, segmentBStart);

        // Calculate the determinate of these two vectors.
        // This value provides information about how the two line segment vectors relate to one another.
        //
        // | S_a.x  S_b.x |
        // | S_a.y  S_b.y | = (S_a.x * S_b.y) - (S_b.x * S_a.y)
        //
        const lineSegmentDeterminant = (Sa.x * Sb.y) - (Sb.x * Sa.y);

        // When the determinant is 0, it means that the lines are either parallel or collinear, and so we would not
        // consider them intersecting lines. An argument can be made that collinear lines constitute an infinite number
        // of intersecting points, but this method only deals with a single discrete point of intersection.
        if (lineSegmentDeterminant === 0) {
            return null;
        }

        // These line segments can be described by the parametric equation
        // P(t) = p_start + t * (p_end - p_start)
        // Where `p_start` is the point where the line segment starts.
        // Where `p_end` is the point where the line segment ends.
        // Where `t` is a scalar value in the interval [0, 1].
        // This equation is saying that the line segment is described by the starting position and some progression
        // along the segment until the ending position.

        // If there is a point of intersection between the two lines segments, then it must hold that...
        //   S_a_start + t_a * (S_a_end - S_a_start) = S_b_start + t_b * (S_b_end - S_b_start)
        // ...for some values of `t_a` and `t_b`.
        // Rearrange this to isolate in terms of `t_a` and `t_b`
        // S_a_start + t_a * (S_a_end - S_a_start) = S_b_start + t_b * (S_b_end - S_b_start)
        // t_a * (S_a_end - S_a_start) - t_b * (S_b_end - S_b_start) = S_b_start - S_a_start
        // This can be represented by in vector definitions...
        // t_a * S_a→ - t_b * S_b→ = R→
        // Where R→ is the vector S_a_start to S_b_start.

        // dedl0x: This should be the other way around but it doesn't work when it is. Everything works when it's like
        // this. Still don't know why.
        const R = Vec.sub(segmentAStart, segmentBStart);

        // The above equation is a system of linear equations...
        //       [ S_a_x ]         [ S_b_x ]   [ R_x ]
        // t_a * [ S_a_y ] - t_b * [ S_b_y ] = [ R_y ]
        // or in matrix form...
        // [ S_a_x  -S_b_x ] [ t_a ]   [ R_x ]
        // [ S_a_y  -S_b_y ] [ t_b ] = [ R_y ]
        // Cramer's rule states that for a system Ax→ = b→, where A is a matrix and x→ and b→ are vectors, the solution
        // is given by...
        // x_i = det(A_i) / det(A)
        // Where A_i is the matrix formed by replacing the i'th column of A with b→.
        // So to solve for `t_a` and `t_b`, we only need to calculate the determinants.
        const determinantForTa = (R.x * (-1 * Sb.y)) - ((-1 * Sb.x) * R.y);
        const determinantForTb = (Sa.x * R.y) - (R.x * Sa.y);

        // t_a = det(A_t_a) / det(A)
        const ta = determinantForTa / lineSegmentDeterminant;
        // t_b = det(A_t_b) / det(A)
        const tb = determinantForTb / lineSegmentDeterminant;

        // It's important to note that the parametric representation of the line segments, as detailed above, states
        // that the value of `t` should be in the interval [0, 1] for points that exist within the line segment. Values
        // outside of this interval describe extrapolated points. We performed a check earlier against the determinant
        // to rule out the segments being parallel or collinear, and so these lines must intersect at some point. Our
        // concern is whether or not they intersect within the boundaries of the line segment ([0, 1]).
        if ((0 <= ta && ta <= 1) && (0 <= tb && tb <= 1)) {
            return Vec.create(
                segmentAStart.x + (ta * Sa.x),
                segmentAStart.y + (ta * Sa.y)
            );
        }

        // An intersection between the two line segments was not found.
        return null;
    },
    /**
     * Determines where a line intersects a circle
     * @param s0 The start of the line
     * @param s1 The end of the line
     * @param pos The position of the circle
     * @param rad The radius of the circle
     * @return An intersection response with the intersection position and normal `Vector`s, or `null` if they don't intersect
     */
    lineIntersectsCircle(s0: Vector, s1: Vector, pos: Vector, rad: number): IntersectionResponse {
        let d = Vec.sub(s1, s0);
        const len = Numeric.max(Vec.length(d), 0.000001);
        d = Vec.normalizeSafe(d);

        const m = Vec.sub(s0, pos);
        const b = Vec.dotProduct(m, d);
        const c = Vec.dotProduct(m, m) - rad * rad;

        if (c > 0 && b > 0) return null;

        const discSq = b * b - c;
        if (discSq < 0) return null;

        const disc = Math.sqrt(discSq);
        const t = -b < disc
            ? disc - b
            : -b - disc;

        if (t <= len) {
            const point = Vec.add(s0, Vec.scale(d, t));
            return {
                point,
                normal: Vec.normalize(Vec.sub(point, pos))
            };
        }

        return null;
    },
    /**
     * Determines where a line intersects a rectangle
     * @param s0 The start of the line
     * @param s1 The end of the line
     * @param min The min Vector of the rectangle
     * @param max The max Vector of the rectangle
     * @return An intersection response with the intersection position and normal `Vector`s, or `null` if they don't intersect
     */
    lineIntersectsRect(s0: Vector, s1: Vector, min: Vector, max: Vector): IntersectionResponse {
        let tmin = 0;
        let tmax = Number.MAX_VALUE;

        const eps = 1e-5;
        const r = s0;

        let d = Vec.sub(s1, s0);
        const dist = Vec.length(d);
        d = Vec.normalizeSafe(d);

        let absDx = Math.abs(d.x);
        let absDy = Math.abs(d.y);

        if (absDx < eps) {
            d.x = eps * 2;
            absDx = d.x;
        }

        if (absDy < eps) {
            d.y = eps * 2;
            absDy = d.y;
        }

        if (absDx > eps) {
            const tx1 = (min.x - r.x) / d.x;
            const tx2 = (max.x - r.x) / d.x;

            tmin = Numeric.max(tmin, Numeric.min(tx1, tx2));
            tmax = Numeric.min(tmax, Numeric.max(tx1, tx2));

            if (tmin > tmax) return null;
        }

        if (absDy > eps) {
            const ty1 = (min.y - r.y) / d.y;
            const ty2 = (max.y - r.y) / d.y;

            tmin = Numeric.max(tmin, Numeric.min(ty1, ty2));
            tmax = Numeric.min(tmax, Numeric.max(ty1, ty2));

            if (tmin > tmax) return null;
        }

        if (tmin > dist) return null;

        // Hit
        const p = Vec.add(s0, Vec.scale(d, tmin));

        // Intersection normal
        const c = Vec.add(min, Vec.scale(Vec.sub(max, min), 0.5));
        const p0 = Vec.sub(p, c);
        const d0 = Vec.scale(Vec.sub(min, max), 0.5);

        const x = p0.x / Math.abs(d0.x) * 1.001;
        const y = p0.y / Math.abs(d0.y) * 1.001;

        return {
            point: p,
            normal: Vec.normalizeSafe(
                Vec.create(Math.trunc(x), Math.trunc(y)),
                Vec.create(1, 0)
            )
        };
    },
    /**
     * Checks if a line intersects a rectangle
     * @param s0 The start of the line
     * @param s1 The end of the line
     * @param min The min Vector of the rectangle
     * @param max The max Vector of the rectangle
     * @return `true` if the line intersects, `false` otherwise
     */
    lineIntersectsRectTest(s0: Vector, s1: Vector, min: Vector, max: Vector): boolean {
        let tmin = 0;
        let tmax = Number.MAX_VALUE;

        const eps = 1e-5;
        let d = Vec.sub(s1, s0);
        const dist = Vec.length(d);
        d = Vec.normalizeSafe(d);

        let absDx = Math.abs(d.x);
        let absDy = Math.abs(d.y);

        if (absDx < eps) {
            d.x = eps * 2;
            absDx = d.x;
        }

        if (absDy < eps) {
            d.y = eps * 2;
            absDy = d.y;
        }

        if (absDx > eps) {
            const tx1 = (min.x - s0.x) / d.x;
            const tx2 = (max.x - s0.x) / d.x;

            tmin = Numeric.max(tmin, Numeric.min(tx1, tx2));
            tmax = Numeric.min(tmax, Numeric.max(tx1, tx2));

            if (tmin > tmax) return false;
        }

        if (absDy > eps) {
            const ty1 = (min.y - s0.y) / d.y;
            const ty2 = (max.y - s0.y) / d.y;

            tmin = Numeric.max(tmin, Numeric.min(ty1, ty2));
            tmax = Numeric.min(tmax, Numeric.max(ty1, ty2));

            if (tmin > tmax) return false;
        }

        return tmin <= dist;
    },
    circleCircleIntersection(centerA: Vector, radiusA: number, centerB: Vector, radiusB: number): CollisionResponse {
        const r = radiusA + radiusB;
        const toP1 = Vec.sub(centerB, centerA);
        const distSqr = Vec.squaredLength(toP1);

        return distSqr < r * r
            ? {
                dir: Vec.normalizeSafe(toP1),
                pen: r - Math.sqrt(distSqr)
            }
            : null;
    },
    rectCircleIntersection(min: Vector, max: Vector, pos: Vector, radius: number): CollisionResponse {
        if (
            min.x <= pos.x && pos.x <= max.x
            && min.y <= pos.y && pos.y <= max.y
        ) {
            // circle center inside rectangle

            const halfDimension = Vec.scale(Vec.sub(max, min), 0.5);
            const p = Vec.sub(pos, Vec.add(min, halfDimension));
            const xp = Math.abs(p.x) - halfDimension.x - radius;
            const yp = Math.abs(p.y) - halfDimension.y - radius;

            return xp > yp
                ? {
                    dir: Vec.create(
                        p.x > 0 ? -1 : 1,
                        0
                    ),
                    pen: -xp
                }
                : {
                    dir: Vec.create(
                        0,
                        p.y > 0 ? -1 : 1
                    ),
                    pen: -yp
                };
        }

        const dir = Vec.sub(
            Vec.create(
                Numeric.clamp(pos.x, min.x, max.x),
                Numeric.clamp(pos.y, min.y, max.y)
            ),
            pos
        );
        const dstSqr = Vec.squaredLength(dir);

        if (dstSqr < radius * radius) {
            const dst = Math.sqrt(dstSqr);
            return {
                dir: Vec.normalizeSafe(dir),
                pen: radius - dst
            };
        }

        return null;
    },
    distanceToLine(p: Vector, a: Vector, b: Vector): number {
        const ab = Vec.sub(b, a);

        return Vec.squaredLength(
            Vec.sub(
                Vec.add(
                    a,
                    Vec.scale(
                        ab,
                        Numeric.clamp(
                            Vec.dotProduct(Vec.sub(p, a), ab) / Vec.dotProduct(ab, ab),
                            0, 1
                        )
                    )
                ),
                p
            )
        );
    },
    distToSegmentSq(p: Vector, a: Vector, b: Vector) {
        const ab = Vec.sub(b, a);
        const c = Vec.dotProduct(Vec.sub(p, a), ab) / Vec.dotProduct(ab, ab);
        const d = Vec.add(a, Vec.scale(ab, Numeric.clamp(c, 0.0, 1.0)));
        const e = Vec.sub(d, p);
        return Vec.dotProduct(e, e);
    },
    distToPolygonSq(p: Vector, poly: Vector[]) {
        let closestDistSq = Number.MAX_VALUE;
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = i === poly.length - 1 ? poly[0] : poly[i + 1];
            const distSq = Collision.distToSegmentSq(p, a, b);
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
            }
        }
        return closestDistSq;
    },
    distToPolygon(p: Vector, poly: Vector[]) {
        return Math.sqrt(Collision.distToPolygonSq(p, poly));
    },
    /**
     * Source
     * @link http://ahamnett.blogspot.com/2012/06/raypolygon-intersections.html
     */
    rayIntersectsLine(origin: Vector, direction: Vector, lineA: Vector, lineB: Vector): number | null {
        const segment = Vec.sub(lineB, lineA);
        const segmentPerp = Vec.create(segment.y, -segment.x);
        const perpDotDir = Vec.dotProduct(direction, segmentPerp);

        // If lines are parallel, no intersection
        if (Math.abs(perpDotDir) <= 1e-7) return null;

        const d = Vec.sub(lineA, origin);
        const distanceAlongRay = Vec.dotProduct(segmentPerp, d) / perpDotDir;
        const distanceAlongLine = Vec.dotProduct(Vec.create(direction.y, -direction.x), d) / perpDotDir;

        // If t is positive and s lies within the line it intersects; returns t
        return distanceAlongRay >= 0 && distanceAlongLine >= 0 && distanceAlongLine <= 1 ? distanceAlongRay : null;
    },
    rayIntersectsPolygon(origin: Vector, direction: Vector, polygon: Vector[]): number | null {
        let t = Number.MAX_VALUE;

        let intersected = false;
        for (
            let i = 0, length = polygon.length, j = length - 1;
            i < length;
            j = i++
        ) {
            const dist = Collision.rayIntersectsLine(origin, direction, polygon[j], polygon[i]);

            if (dist !== null && dist < t) {
                intersected = true;
                t = dist;
            }
        }

        // Returns closest intersection
        return intersected ? t : null;
    },
    rectRectIntersection(min0: Vector, max0: Vector, min1: Vector, max1: Vector): CollisionResponse {
        const e0 = Vec.scale(Vec.sub(max0, min0), 0.5);
        const e1 = Vec.scale(Vec.sub(max1, min1), 0.5);
        const n = Vec.sub(
            Vec.add(min1, e1),
            Vec.add(min0, e0)
        );
        const xo = e0.x + e1.x - Math.abs(n.x);
        const yo = e0.y + e1.y - Math.abs(n.y);

        return xo > 0 && yo > 0
            ? xo > yo
                ? {
                    dir: Vec.create(Math.sign(n.x) || 1, 0),
                    pen: xo
                }
                : {
                    dir: Vec.create(0, Math.sign(n.y) || 1),
                    pen: yo
                }
            : null;
    }
});

export interface CollisionRecord {
    readonly collided: boolean
    readonly distance: number
}

export type IntersectionResponse = {
    readonly point: Vector
    readonly normal: Vector
} | null;

export type CollisionResponse = {
    readonly dir: Vector
    readonly pen: number
} | null;

export function calculateDoorHitboxes<
    U extends (ObstacleDefinition & { readonly isDoor: true })["operationStyle"]
>(
    definition: ObstacleDefinition & { readonly isDoor: true, readonly operationStyle?: U },
    position: Vector,
    rotation: Orientation
): U extends "slide"
        ? { readonly openHitbox: RectangleHitbox }
        : { readonly openHitbox: RectangleHitbox, readonly openAltHitbox: RectangleHitbox } {
    if (!(definition.hitbox instanceof RectangleHitbox) || !definition.isDoor) {
        throw new Error("Unable to calculate hitboxes for door: Not a door or hitbox is non-rectangular");
    }

    type Swivel = typeof definition & { readonly operationStyle: "swivel" };
    type Slide = typeof definition & { readonly operationStyle: "slide" };
    type Return = U extends "slide"
        ? { readonly openHitbox: RectangleHitbox }
        : { readonly openHitbox: RectangleHitbox, readonly openAltHitbox: RectangleHitbox };

    switch (definition.operationStyle) {
        case "slide": {
            const openHitbox = Geometry.transformRectangle(
                Vec.addAdjust(
                    position,
                    Vec.create(
                        (definition.hitbox.min.x - definition.hitbox.max.x) * ((definition as Slide).slideFactor ?? 1),
                        0
                    ),
                    rotation
                ),
                definition.hitbox.min,
                definition.hitbox.max,
                1,
                rotation
            );

            return {
                openHitbox: new RectangleHitbox(openHitbox.min, openHitbox.max)
            } as Return;
        }
        case "swivel":
        default: {
            const openRectangle = Geometry.transformRectangle(
                Vec.addAdjust(position, Vec.add((definition as Swivel).hingeOffset, Vec.create(-(definition as Swivel).hingeOffset.y, (definition as Swivel).hingeOffset.x)), rotation),
                definition.hitbox.min,
                definition.hitbox.max,
                1,
                Numeric.absMod(rotation + 1, 4) as Orientation
            );
            const openAltRectangle = Geometry.transformRectangle(
                Vec.addAdjust(position, Vec.add((definition as Swivel).hingeOffset, Vec.create((definition as Swivel).hingeOffset.y, -(definition as Swivel).hingeOffset.x)), rotation),
                definition.hitbox.min,
                definition.hitbox.max,
                1,
                Numeric.absMod(rotation - 1, 4) as Orientation
            );

            return {
                openHitbox: new RectangleHitbox(openRectangle.min, openRectangle.max),
                openAltHitbox: new RectangleHitbox(openAltRectangle.min, openAltRectangle.max)
            } as Return;
        }
    }
}

/**
* Resolves the interaction between a given game object or bullet and this stair by determining what layer the object should move to
* Two things are assumed and are prerequisite:
* - This `Obstacle` instance is indeed one corresponding to a stair (such that `this.definition.isStair`)
* - The given game object or bullet's hitbox overlaps this obstacle's (such that `gameObject.hitbox.collidesWith(this.hitbox)`)
*
* @returns the layer on which the game object should be placed after the interaction has been resolved
*/
export function resolveStairInteraction(
    definition: ObstacleDefinition,
    obstacleOrientation: Orientation,
    obstacleHitbox: RectangleHitbox,
    obstacleLayer: number,
    targetPosition: Vector
): number {
    if (!definition.isStair) {
        console.error("Tried to handle a stair interaction as a non-stair obstacle");
        return obstacleLayer;
    }

    const { activeEdges: { high: highDef, low: lowDef } } = definition;
    const [high, low] = [
        Numeric.absMod(highDef - obstacleOrientation, 4),
        Numeric.absMod(lowDef - obstacleOrientation, 4)
    ];

    /*
       reminder for the numbering system used:
            0
         ┌─────┐
       3 │     │ 1
         └─────┘
            2

       checking to see if high and low are opposites is thus
       as simple as checking to see if the absolute difference
       between them is 2 (and checking for adjacency requires
       a check for an absolute difference of 1)

       having them be opposite is really cool cuz it's the most
       intuitive case.

       if they're opposite, then we can basically project the
       object's position onto an axis that runs between the two
       sides, and do a bounds check. for example, let's say that
       low = 3 and high = 1; we therefore have a staircase going
       from, let's say, layer 0 on the left up to layer 2 on the
       right.

       to know what layer to place an object on, we just consider
       where it is in relation to sides 3 and 1; if it's left of
       3, we put it on layer 0; right of 1 and it's on layer 2;
       in between is on layer 1.

       layer 0│  1  │layer 2
       ←──────│←───→│──────→
              ┌─────┐
              │     │
              └─────┘
   */

    const { min, max } = obstacleHitbox;

    let newLayer = obstacleLayer;

    if (Math.abs(high - low) === 2) {
        // the odd-numbered sides lie on the horizontal
        const prop = high % 2 !== 0 ? "x" : "y";
        // where the "low" side is
        const minIsLow = low === 0 || low === 3;
        const objComponent = targetPosition[prop];

        if (objComponent <= min[prop]) {
            newLayer += minIsLow ? -1 : 1;
        } else if (objComponent >= max[prop]) {
            newLayer += minIsLow ? 1 : -1;
        }

        return newLayer;
    }

    /*
        Otherwise, they're adjacent, which is slightly harder to
        reason about. We'll divide the world into a few sections,
        and assign a layer consequently, as visualized below.
        For the diagram, assume that low = 0 and that high = 1.

                     ╱
                    ╱
        layer 0    ╱
            ┌─────┐
            │     │
            │  1  │
            │     │
            └─────┘   layer 2
           ╱
          ╱
         ╱

        in theory, only two sides of the stair would be accessible,
        and the other two would be clipped off with walls, but it's
        not too much expensive to extend our diagram and computations,
        so we do it.
    */

    const objIsLeft = targetPosition.x <= min.x;
    const objIsRight = targetPosition.x >= max.x;
    const objIsAbove = targetPosition.y <= min.y;
    const objIsBelow = targetPosition.y >= max.y;

    const intersectX = !objIsLeft && !objIsRight;
    const intersectY = !objIsAbove && !objIsBelow;

    if (intersectX && intersectY) {
        // if it's inside the stair, then the high/low isn't relevant: we match the stair's layer
        return obstacleLayer;
    }

    // otherwise we gotta figure out a) which way the line cuts b) what region the game object is in

    /*
        bl/tr
        high === 0 && low === 1
        high === 1 && low === 0
        high === 2 && low === 3
        high === 3 && low === 2

        br/tl
        high === 0 && low === 3
        high === 1 && low === 2
        high === 2 && low === 1
        high === 3 && low === 0

        as can be seen here, all the pairs that yield a bottom-right/top-left
        diagonal have the sum of high and low equal to 3.
    */
    const isBottomRightToTopLeft = high + low === 3;
    const ratio = (max.y - min.y) / (max.x - min.x);

    if (isBottomRightToTopLeft) {
        const topRightIsHigh = high < 2;
        if (
            objIsRight // trivial rhs check
            || (objIsAbove && !objIsLeft) // above the box (and neither to its left nor its right)
            || ratio * (targetPosition.x - max.x) > (targetPosition.y - max.y) // on the right of the diagonal
        ) {
            newLayer += topRightIsHigh ? 1 : -1;
        } else {
            newLayer += topRightIsHigh ? -1 : 1;
        }
    } else {
        const topLeftIsHigh = high === 0 || high === 3;
        if (
            objIsLeft // trivial lhs check
            || (objIsAbove && !objIsRight) // above the box (and neither to its left nor its right)
            || ratio * (targetPosition.x - max.x) > (targetPosition.y - min.y) // on the left of the diagonal
        ) {
            newLayer += topLeftIsHigh ? 1 : -1;
        } else {
            newLayer += topLeftIsHigh ? -1 : 1;
        }
    }

    return newLayer;
}

type NameGenerator<T extends string> = `${T}In` | `${T}Out` | `${T}InOut`;

function generatePolynomialEasingTriplet<T extends string>(degree: number, type: T): Readonly<Record<NameGenerator<T>, (t: number) => number>> {
    const coeffCache = 2 ** (degree - 1);

    return Object.freeze({
        [`${type}In`]: (t: number) => t ** degree,
        [`${type}Out`]: (t: number) => 1 - (1 - t) ** degree,
        [`${type}InOut`]: (t: number) => t < 0.5
            ? coeffCache * t ** degree
            : 1 - (coeffCache * (1 - t) ** degree)
    } as Record<NameGenerator<T>, (t: number) => number>);
}

export type EasingFunction = (t: number) => number;

/**
 * A collection of functions for easing, based on
 * [this helpful reference](https://easings.net) and others
 */
export const EaseFunctions = Object.freeze({
    linear: (t: number) => t,

    sineIn: (t: number) => 1 - Math.cos(t * halfπ),
    sineOut: (t: number) => Math.sin(t * halfπ),
    sineInOut: (t: number) => (1 - Math.cos(π * t)) / 2,

    circIn: (t: number) => 1 - Math.sqrt(1 - (t * t)),
    circOut: (t: number) => Math.sqrt(1 - (t - 1) ** 2),
    circInOut: (t: number) => t < 0.5
        ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2
        : (Math.sqrt(1 - (-2 * (1 - t)) ** 2) + 1) / 2,

    elasticIn: (t: number) => t === 0 || t === 1
        ? t
        : -(2 ** (10 * (t - 1))) * Math.sin(π * (40 * (t - 1) - 3) / 6),
    elasticOut: (t: number) => t === 0 || t === 1
        ? t
        : 2 ** (-10 * t) * Math.sin(π * (40 * t - 3) / 6) + 1,
    elasticInOut: (t: number) => t === 0 || t === 1
        ? t
        : t < 0.5
            ? -(2 ** (10 * (2 * t - 1) - 1)) * Math.sin(π * (80 * (2 * t - 1) - 9) / 18)
            : 2 ** (-10 * (2 * t - 1) - 1) * Math.sin(π * (80 * (2 * t - 1) - 9) / 18) + 1,
    elasticOut2: (t: number) => (Math.pow(2, t * -10) * Math.sin(((t - 0.75 / 4) * (π * 2)) / 0.75) + 1),

    ...generatePolynomialEasingTriplet(2, "quadratic"),
    ...generatePolynomialEasingTriplet(3, "cubic"),
    ...generatePolynomialEasingTriplet(4, "quartic"),
    ...generatePolynomialEasingTriplet(5, "quintic"),
    ...generatePolynomialEasingTriplet(6, "sextic"),

    expoIn: (t: number) => t <= 0
        ? 0
        : 2 ** (-10 * (1 - t)),
    expoOut: (t: number) => t >= 1
        ? 1
        : 1 - 2 ** -(10 * t),
    expoInOut: (t: number) => t === 0 || t === 1
        ? t
        : t < 0.5
            ? 2 ** (10 * (2 * t - 1) - 1)
            : 1 - 2 ** (-10 * (2 * t - 1) - 1),

    backIn: (t: number) => (Math.sqrt(3) * (t - 1) + t) * t ** 2,
    backOut: (t: number) => 1 + ((Math.sqrt(3) + 1) * t - 1) * (t - 1) ** 2,
    backInOut: (t: number) => t < 0.5
        ? 4 * t * t * (3.6 * t - 1.3)
        : 4 * (t - 1) ** 2 * (3.6 * t - 2.3) + 1
});
