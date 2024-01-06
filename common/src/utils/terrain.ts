import { PolygonHitbox, RectangleHitbox, type Hitbox } from "./hitbox";
import { Collision, Numeric } from "./math";
import { SeededRandom } from "./random";
import { Vec, type Vector } from "./vector";

export interface FloorDefinition {
    readonly debugColor: number
    readonly speedMultiplier?: number
    readonly overlay?: boolean
    readonly particles?: boolean
}

export const FloorTypes: Record<string, FloorDefinition> = {
    grass: {
        debugColor: 0x005500
    },
    stone: {
        debugColor: 0x121212
    },
    wood: {
        debugColor: 0x7f5500
    },
    sand: {
        debugColor: 0xff5500
    },
    metal: {
        debugColor: 0x808080
    },
    water: {
        debugColor: 0x00ddff,
        speedMultiplier: 0.7,
        overlay: true,
        particles: true
    }
};

export class Terrain {
    readonly width: number;
    readonly height: number;
    readonly cellSize = 64;

    readonly floors = new Map<Hitbox, string>();

    readonly rivers: River[];

    readonly beachHitbox: PolygonHitbox;
    readonly grassHitbox: PolygonHitbox;

    readonly groundRect: RectangleHitbox;

    private readonly _grid: Array<Array<{
        rivers: River[]
        floors: Array<{ readonly type: string, readonly hitbox: Hitbox }>
    }>> = [];

    constructor(
        width: number,
        height: number,
        oceanSize: number,
        beachSize: number,
        seed: number,
        rivers: River[]
    ) {
        this.width = Math.floor(width / this.cellSize);
        this.height = Math.floor(height / this.cellSize);

        for (let x = 0; x <= this.width; x++) {
            this._grid[x] = [];
            for (let y = 0; y <= this.height; y++) {
                this._grid[x][y] = {
                    rivers: [],
                    floors: []
                };
            }
        }

        // generate beach and grass
        const beachPadding = oceanSize + beachSize;

        const random = new SeededRandom(seed);

        const spacing = 16;
        const variation = 8;

        const beachRect = this.groundRect = new RectangleHitbox(
            Vec.create(oceanSize, oceanSize),
            Vec.create(width - oceanSize, height - oceanSize)
        );

        const grassRect = new RectangleHitbox(
            Vec.create(beachPadding, beachPadding),
            Vec.create(width - beachPadding, height - beachPadding)
        );

        this.beachHitbox = new PolygonHitbox(jaggedRectangle(beachRect, spacing, variation, random));
        this.grassHitbox = new PolygonHitbox(jaggedRectangle(grassRect, spacing, variation, random));

        this.rivers = rivers;

        // add rivers
        for (const river of rivers) {
            const rect = river.bankHitbox.toRectangle();

            const min = this._roundToCells(rect.min);
            const max = this._roundToCells(rect.max);

            for (let x = min.x; x <= max.x; x++) {
                for (let y = min.y; y <= max.y; y++) {
                    const min = Vec.create(x * this.cellSize, y * this.cellSize);
                    const rect = new RectangleHitbox(
                        min,
                        Vec.add(min, Vec.create(this.cellSize, this.cellSize))
                    );
                    // only add it to cells it collides with
                    if (river.bankHitbox.collidesWith(rect)) {
                        this._grid[x][y].rivers.push(river);
                    }
                }
            }
        }
    }

    addFloor(type: string, hitbox: Hitbox): void {
        this.floors.set(hitbox, type);
        // get the bounds of the hitbox
        const rect = hitbox.toRectangle();
        // round it to the grid cells
        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        // add it to all grid cells that it intersects
        for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
                this._grid[x][y].floors.push({ type, hitbox });
            }
        }
    }

    getFloor(position: Vector): string {
        const pos = this._roundToCells(position);
        let floor = "water";

        const isInsideMap = this.beachHitbox.isPointInside(position);
        if (isInsideMap) {
            floor = "sand";

            if (this.grassHitbox.isPointInside(position)) {
                floor = "grass";
            }
        }

        const cell = this._grid[pos.x][pos.y];

        // rivers need to be clipped inside the map polygon
        if (isInsideMap) {
            for (const river of cell.rivers) {
                if (river.bankHitbox.isPointInside(position)) {
                    floor = "sand";
                }

                if (river.waterHitbox.isPointInside(position)) {
                    floor = "water";
                    break;
                }
            }
        }

        for (const floor of cell.floors) {
            if (floor.hitbox.isPointInside(position)) {
                return floor.type;
            }
        }

        // assume if no floor was found at this position, it's in the ocean
        return floor;
    }

    /**
     * Get rivers near a position
     */
    getRiversInPosition(position: Vector): River[] {
        const pos = this._roundToCells(position);
        return this._grid[pos.x][pos.y].rivers;
    }

    /**
     * Get rivers near a hitbox
     */
    getRiversInHitbox(hitbox: Hitbox): River[] {
        const rivers = new Set<River>();

        const rect = hitbox.toRectangle();
        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
                for (const river of this._grid[x][y].rivers) {
                    rivers.add(river);
                }
            }
        }
        return [...rivers];
    }

    private _roundToCells(vector: Vector): Vector {
        return Vec.create(
            Numeric.clamp(Math.floor(vector.x / this.cellSize), 0, this.width),
            Numeric.clamp(Math.floor(vector.y / this.cellSize), 0, this.height)
        );
    }
}

function catmullRomDerivative(t: number, p0: number, p1: number, p2: number, p3: number): number {
    return 0.5 * (-p0 + p2 + 2 * t * (2 * p0 - 5 * p1 + 4 * p2 - p3) + 3 * t * t * (-p0 + 3 * p1 - 3 * p2 + p3));
}

function catmullRom(t: number, p0: number, p1: number, p2: number, p3: number): number {
    return 0.5 * (2 * p1 + t * (-p0 + p2) + t * t * (2 * p0 - 5 * p1 + 4 * p2 - p3) + t * t * t * (-p0 + 3 * p1 - 3 * p2 + p3));
}

export class River {
    readonly width: number;
    readonly bankWidth: number;
    readonly points: Vector[];

    readonly waterHitbox: PolygonHitbox;
    readonly bankHitbox: PolygonHitbox;

    constructor(width: number, points: Vector[], otherRivers: River[], bounds: RectangleHitbox) {
        this.width = width;
        this.points = points;

        const length = this.points.length - 1;

        this.bankWidth = Numeric.clamp(this.width * 0.75, 12, 20);

        const waterPoints: Vector[] = new Array(length * 2);
        const bankPoints: Vector[] = new Array(length * 2);

        const endsOnMapBounds = !bounds.isPointInside(this.points[this.points.length - 1]);

        for (let i = 0; i < this.points.length; i++) {
            const current = this.points[i];
            const normal = this.getNormal(i / length);

            let bankWidth = this.bankWidth;

            // find closest colliding river to adjust the bank width and clip this river
            let collidingRiver: River | null = null;
            for (const river of otherRivers) {
                const length = Vec.length(
                    Vec.sub(
                        river.getPosition(river.getClosestT(current)),
                        current
                    )
                );

                if (length < river.width * 2) {
                    bankWidth = Math.max(bankWidth, river.bankWidth);
                }

                if ((i === 0 || i === this.points.length - 1) && length < 48) {
                    collidingRiver = river;
                }
            }

            let width = this.width;

            const end = 2 * (Math.max(1 - i / length, i / length) - 0.5);
            // increase river width near map bounds
            if (i < (this.points.length / 2) || endsOnMapBounds) {
                width = (1 + end ** 3 * 1.5) * this.width;
            }

            const clipRayToPoly = (point: Vector, direction: Vector, polygon: PolygonHitbox): Vector => {
                const end = Vec.add(point, direction);
                if (!polygon.isPointInside(end)) {
                    const t = Collision.rayIntersectsPolygon(point, direction, polygon.points);
                    if (t) {
                        return Vec.scale(direction, t);
                    }
                }
                return direction;
            };

            const finalBankWidth = width + bankWidth;

            let waterRay1 = Vec.scale(normal, width);
            let waterRay2 = Vec.scale(normal, -width);
            let bankRay1 = Vec.scale(normal, finalBankWidth);
            let bankRay2 = Vec.scale(normal, -finalBankWidth);

            if (collidingRiver) {
                waterRay1 = clipRayToPoly(current, waterRay1, collidingRiver.waterHitbox);
                waterRay2 = clipRayToPoly(current, waterRay2, collidingRiver.waterHitbox);
                bankRay1 = clipRayToPoly(current, bankRay1, collidingRiver.bankHitbox);
                bankRay2 = clipRayToPoly(current, bankRay2, collidingRiver.bankHitbox);
            }

            const waterPoint1 = Vec.add(current, waterRay1);
            const waterPoint2 = Vec.add(current, waterRay2);

            waterPoints[i] = waterPoint1;
            waterPoints[this.points.length + length - i] = waterPoint2;

            const bankPoint1 = Vec.add(current, bankRay1);
            const bankPoint2 = Vec.add(current, bankRay2);

            bankPoints[i] = bankPoint1;
            bankPoints[this.points.length + length - i] = bankPoint2;
        }

        this.waterHitbox = new PolygonHitbox(waterPoints);
        this.bankHitbox = new PolygonHitbox(bankPoints);
    }

    getControlPoints(t: number): {
        pt: number
        p0: Vector
        p1: Vector
        p2: Vector
        p3: Vector
    } {
        const count = this.points.length;
        t = Numeric.clamp(t, 0, 1);
        const i = ~~(t * (count - 1));
        const i1 = i === count - 1 ? i - 1 : i;
        const i2 = i1 + 1;
        const i0 = i1 > 0 ? i1 - 1 : i1;
        const i3 = i2 < count - 1 ? i2 + 1 : i2;

        return {
            pt: t * (count - 1) - i1,
            p0: this.points[i0],
            p1: this.points[i1],
            p2: this.points[i2],
            p3: this.points[i3]
        };
    }

    getTangent(t: number): Vector {
        const { pt, p0, p1, p2, p3 } = this.getControlPoints(t);
        return {
            x: catmullRomDerivative(pt, p0.x, p1.x, p2.x, p3.x),
            y: catmullRomDerivative(pt, p0.y, p1.y, p2.y, p3.y)
        };
    }

    getNormal(t: number): Vector {
        const tangent = this.getTangent(t);
        const vec = Vec.normalizeSafe(tangent, Vec.create(1, 0));
        return Vec.create(-vec.y, vec.x);
    }

    getPosition(t: number): Vector {
        const { pt, p0, p1, p2, p3 } = this.getControlPoints(t);

        return {
            x: catmullRom(pt, p0.x, p1.x, p2.x, p3.x),
            y: catmullRom(pt, p0.y, p1.y, p2.y, p3.y)
        };
    }

    getClosestT(position: Vector): number {
        let closestDistSq = Number.MAX_VALUE;
        let closestSegIdx = 0;
        for (let i = 0; i < this.points.length - 1; i++) {
            const distSq = Collision.distanceToLine(position, this.points[i], this.points[i + 1]);
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
                closestSegIdx = i;
            }
        }

        const idx0 = closestSegIdx;
        const idx1 = idx0 + 1;
        const s0 = this.points[idx0];
        const s1 = this.points[idx1];
        const seg = Vec.sub(s1, s0);
        const t = Numeric.clamp(Vec.dotProduct(Vec.sub(position, s0), seg) / Vec.dotProduct(seg, seg), 0, 1);
        const len = this.points.length - 1;
        const tMin = Numeric.clamp((idx0 + t - 0.1) / len, 0, 1);
        const tMax = Numeric.clamp((idx0 + t + 0.1) / len, 0, 1);

        // Refine closest point by testing near the closest segment point
        let nearestT = (idx0 + t) / len;
        let nearestDistSq = Number.MAX_VALUE;
        const kIter = 8;
        for (let i = 0; i <= kIter; i++) {
            const testT = Numeric.lerp(i / kIter, tMin, tMax);
            const testPos = this.getPosition(testT);
            const testDistSq = Vec.squaredLength(Vec.sub(testPos, position));
            if (testDistSq < nearestDistSq) {
                nearestT = testT;
                nearestDistSq = testDistSq;
            }
        }

        // Refine by offsetting along the spline tangent
        const tangent = this.getTangent(nearestT);
        const tanLen = Vec.length(tangent);
        if (tanLen > 0) {
            const nearest = this.getPosition(nearestT);
            const offset = Vec.dotProduct(tangent, Vec.sub(position, nearest)) / tanLen;
            const offsetT = nearestT + offset / (tanLen * len);
            if (Vec.squaredLength(Vec.sub(position, this.getPosition(offsetT))) < Vec.squaredLength(Vec.sub(position, nearest))) {
                nearestT = offsetT;
            }
        }

        return nearestT;
    }
}

function jaggedRectangle(
    hitbox: RectangleHitbox,
    spacing: number,
    variation: number,
    random: SeededRandom
): Vector[] {
    const topLeft = Vec.clone(hitbox.min);
    const topRight = Vec.create(hitbox.max.x, hitbox.min.y);
    const bottomRight = Vec.clone(hitbox.max);
    const bottomLeft = Vec.create(hitbox.min.x, hitbox.max.y);

    const points: Vector[] = [];

    variation = variation / 2;
    const getVariation = (): number => random.get(-variation, variation);

    for (let x = topLeft.x + spacing; x < topRight.x; x += spacing) {
        points.push(Vec.create(x, topLeft.y + getVariation()));
    }
    for (let y = topRight.y + spacing; y < bottomRight.y; y += spacing) {
        points.push(Vec.create(topRight.x + getVariation(), y));
    }
    for (let x = bottomRight.x - spacing; x > bottomLeft.x; x -= spacing) {
        points.push(Vec.create(x, bottomRight.y + getVariation()));
    }
    for (let y = bottomLeft.y - spacing; y > topLeft.y; y -= spacing) {
        points.push(Vec.create(bottomLeft.x + getVariation(), y));
    }

    return points;
}
