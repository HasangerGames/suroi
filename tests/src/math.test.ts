import { Collision } from "@common/utils/math";
import { Vec, Vector } from "@common/utils/vector";
import { describe, expect, test } from "@jest/globals";

describe("line segment intersection detection", () => {
    test("vertical parallel line segments report no intersection", () => {
        const lineSegmentAStart = Vec(10, -5);
        const lineSegmentAEnd = Vec(10, 5);

        const lineSegmentBStart = Vec(15, -5);
        const lineSegmentBEnd = Vec(15, 5);

        const lineSegmentIntersectionPoint = Collision.lineSegmentIntersection(
            lineSegmentAStart, lineSegmentAEnd,
            lineSegmentBStart, lineSegmentBEnd
        );

        expect(lineSegmentIntersectionPoint).toBeNull();
    });

    test("horizontal parallel line segments report no intersection", () => {
        const lineSegmentAStart = Vec(-5, -5);
        const lineSegmentAEnd = Vec(5, -5);

        const lineSegmentBStart = Vec(-3, 2);
        const lineSegmentBEnd = Vec(3, 2);

        const lineSegmentIntersectionPoint = Collision.lineSegmentIntersection(
            lineSegmentAStart, lineSegmentAEnd,
            lineSegmentBStart, lineSegmentBEnd
        );

        expect(lineSegmentIntersectionPoint).toBeNull();
    });

    test("collinear line segments report no intersection", () => {
        const lineSegmentAStart: Vector = Vec(-4, -4);
        const lineSegmentAEnd: Vector = Vec(1, 1);

        // Goes from (-4, 1) to (1, 1) or straight to the right.
        const lineSegmentBStart: Vector = Vec(-1, -1);
        const lineSegmentBEnd: Vector = Vec(4, 4);

        const lineSegmentIntersectionPoint: Vector | null = Collision.lineSegmentIntersection(
            lineSegmentAStart, lineSegmentAEnd,
            lineSegmentBStart, lineSegmentBEnd
        );

        expect(lineSegmentIntersectionPoint).toBeNull();
    });

    test("line segments that share a starting point intersect at that point", () => {
        const lineSegmentAStart: Vector = Vec(0, 0);
        const lineSegmentAEnd: Vector = Vec(3, 2);

        const lineSegmentBStart: Vector = Vec(0, 0);
        const lineSegmentBEnd: Vector = Vec(-8, 6);

        const lineSegmentIntersectionPoint: Vector | null = Collision.lineSegmentIntersection(
            lineSegmentAStart, lineSegmentAEnd,
            lineSegmentBStart, lineSegmentBEnd
        );

        expect(lineSegmentIntersectionPoint).toBeDefined();
        expect(lineSegmentIntersectionPoint?.x).toBe(0);
        expect(lineSegmentIntersectionPoint?.y).toBe(0);
    });

    test("line segments that share an ending point intersect at that point", () => {
        const lineSegmentAStart: Vector = Vec(1, 5);
        const lineSegmentAEnd: Vector = Vec(3, 2);

        const lineSegmentBStart: Vector = Vec(-10, 4);
        const lineSegmentBEnd: Vector = Vec(3, 2);

        const lineSegmentIntersectionPoint: Vector | null = Collision.lineSegmentIntersection(
            lineSegmentAStart, lineSegmentAEnd,
            lineSegmentBStart, lineSegmentBEnd
        );

        expect(lineSegmentIntersectionPoint).toBeDefined();
        expect(lineSegmentIntersectionPoint?.x).toBe(3);
        expect(lineSegmentIntersectionPoint?.y).toBe(2);
    });

    test("line segments that are tip-to-tail intersect at the overlapping point", () => {
        // Goes from (1, 1) to (1, 5) or straight up.
        const lineSegmentAStart: Vector = Vec(1, 1);
        const lineSegmentAEnd: Vector = Vec(1, 5);

        // Goes from (-4, 1) to (1, 1) or straight to the right.
        const lineSegmentBStart: Vector = Vec(-4, 1);
        const lineSegmentBEnd: Vector = Vec(1, 1);

        const lineSegmentIntersectionPoint: Vector | null = Collision.lineSegmentIntersection(
            lineSegmentAStart, lineSegmentAEnd,
            lineSegmentBStart, lineSegmentBEnd
        );

        expect(lineSegmentIntersectionPoint).toBeDefined();
        expect(lineSegmentIntersectionPoint?.x).toBe(1);
        expect(lineSegmentIntersectionPoint?.y).toBe(1);
    });

    test("line segments that form a T intersect at the junction", () => {
        // Top of the T shape.
        const lineSegmentAStart: Vector = Vec(-3, 5);
        const lineSegmentAEnd: Vector = Vec(3, 5);

        // Stem of the T shape.
        const lineSegmentBStart: Vector = Vec(0, 0);
        const lineSegmentBEnd: Vector = Vec(0, 5);

        const lineSegmentIntersectionPoint: Vector | null = Collision.lineSegmentIntersection(
            lineSegmentAStart, lineSegmentAEnd,
            lineSegmentBStart, lineSegmentBEnd
        );

        expect(lineSegmentIntersectionPoint).toBeDefined();
        expect(lineSegmentIntersectionPoint?.x).toBe(0);
        expect(lineSegmentIntersectionPoint?.y).toBe(5);
    });

    test("line segments that form a square X intersect in the middle", () => {
        const lineSegmentAStart: Vector = Vec(-5, 5);
        const lineSegmentAEnd: Vector = Vec(5, -5);

        const lineSegmentBStart: Vector = Vec(5, 5);
        const lineSegmentBEnd: Vector = Vec(-5, -5);

        const lineSegmentIntersectionPoint: Vector | null = Collision.lineSegmentIntersection(
            lineSegmentAStart, lineSegmentAEnd,
            lineSegmentBStart, lineSegmentBEnd
        );

        expect(lineSegmentIntersectionPoint).toBeDefined();
        expect(lineSegmentIntersectionPoint?.x).toBe(0);
        expect(lineSegmentIntersectionPoint?.y).toBe(0);
    });
});
