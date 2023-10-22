import { PolygonHitbox, RectangleHitbox, type Hitbox } from "./hitbox";
import { angleBetweenPoints, clamp, distanceSquared } from "./math";
import { SeededRandom } from "./random";
import { v, vAdd, vClone, vRotate, vSub, type Vector } from "./vector";

export function jaggedRectangle(
    hitbox: RectangleHitbox,
    spacing: number,
    variation: number,
    random: SeededRandom
): Vector[] {
    const topLeft = vClone(hitbox.min);
    const topRight = v(hitbox.max.x, hitbox.min.y);
    const bottomRight = vClone(hitbox.max);
    const bottomLeft = v(hitbox.min.x, hitbox.max.y);

    const points: Vector[] = [];

    for (let x = topLeft.x + spacing; x < topRight.x; x += spacing) {
        points.push(v(x, topLeft.y + random.get(0, variation)));
    }
    for (let y = topRight.y + spacing; y < bottomRight.y; y += spacing) {
        points.push(v(topRight.x + random.get(0, variation), y));
    }
    for (let x = bottomRight.x - spacing; x > bottomLeft.x; x -= spacing) {
        points.push(v(x, bottomRight.y + random.get(0, variation)));
    }
    for (let y = bottomLeft.y - spacing; y > topLeft.y; y -= spacing) {
        points.push(v(bottomLeft.x + random.get(0, variation), y));
    }

    return points;
}

export interface FloorDefinition {
    debugColor: number
    speedMultiplier?: number
    overlay?: boolean
    particles?: boolean
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
        debugColor: 0x0055ff,
        speedMultiplier: 0.7,
        overlay: true,
        particles: true
    }
};

export class River {
    readonly width: number;
    readonly bankWidth: number;
    readonly points: Vector[];

    constructor(width: number, bankWidth: number, points: Vector[]) {
        this.width = width;
        this.bankWidth = bankWidth;
        this.points = points;
    }
}

export function generateTerrain(
    width: number,
    height: number,
    oceanSize: number,
    beachSize: number,
    seed: number,
    rivers: River[]
): {
        readonly beach: PolygonHitbox
        readonly grass: PolygonHitbox
        readonly rivers: Array<{
            readonly water: PolygonHitbox
            readonly bank: PolygonHitbox
        }>
        readonly riverSpawnHitboxes: PolygonHitbox[]
    } {
    // generate beach and grass
    const beachPadding = oceanSize + beachSize;

    const random = new SeededRandom(seed);

    const spacing = 16;
    const variation = 8;

    const beachHitbox = new RectangleHitbox(
        v(oceanSize, oceanSize),
        v(width - oceanSize, height - oceanSize)
    );

    const grassHitbox = new RectangleHitbox(
        v(beachPadding, beachPadding),
        v(width - beachPadding, height - beachPadding)
    );

    const beach = new PolygonHitbox(...jaggedRectangle(beachHitbox, spacing, variation, random));
    const grass = new PolygonHitbox(...jaggedRectangle(grassHitbox, spacing, variation, random));

    const generatedRivers: ReturnType<typeof generateTerrain>["rivers"] = [];
    const riverSpawnHitboxes: PolygonHitbox[] = [];

    for (const river of rivers) {
        // TODO Refactor this mess
        const getRiverPolygon = (width: number): PolygonHitbox => {
            const points: Vector[] = [];

            points.push(
                vAdd(
                    river.points[0],
                    vRotate(
                        v(width + 10, 0),
                        angleBetweenPoints(river.points[0], river.points[1]) + Math.PI / 2
                    )
                )
            );

            // TODO: ray cast to find an intersection position instead
            const findClosestBeachPoint = (i: number): void => {
                const pos = points[i];

                let dist = Number.MAX_VALUE;
                let closestPoint = v(0, 0);

                for (const point of beach.points) {
                    const newDist = distanceSquared(pos, point);
                    if (newDist < dist) {
                        closestPoint = point;
                        dist = newDist;
                    }
                }

                points[i] = closestPoint;
            };
            findClosestBeachPoint(0);
            // first loop, add points from start to end
            for (let i = 1, l = river.points.length - 1; i < l; i++) {
                const prev = river.points[i - 1];
                const current = river.points[i];
                const next = river.points[i + 1];

                const prevCurrent = vSub(current, prev);
                const nextCurrent = vSub(current, next);

                const prevAngle = angleBetweenPoints(v(0, 0), prevCurrent);
                const nextAngle = angleBetweenPoints(v(0, 0), nextCurrent);

                const angleToDivide = Math.abs(prevAngle - nextAngle);
                const angle = angleToDivide / 2 + (
                    prevAngle > nextAngle // convex check
                        ? angleBetweenPoints(current, next)
                        : angleBetweenPoints(prev, current)
                );

                points.push(
                    vAdd(
                        current,
                        vRotate(
                            v(width, 0),
                            angle
                        )
                    )
                );
            }

            points.push(
                vAdd(
                    river.points[river.points.length - 1],
                    vRotate(
                        v(width + 10, 0),
                        angleBetweenPoints(river.points[river.points.length - 2], river.points[river.points.length - 1]) + Math.PI / 2
                    )
                )
            );

            points.push(
                vAdd(
                    river.points[river.points.length - 1],
                    vRotate(
                        v(width + 10, 0),
                        angleBetweenPoints(river.points[river.points.length - 2], river.points[river.points.length - 1]) - Math.PI / 2
                    )
                )
            );
            findClosestBeachPoint(points.length - 2);
            findClosestBeachPoint(points.length - 1);
            // second loop, same thing but reverse and with inverted point
            for (let l = river.points.length, i = l - 2; i > 0; i--) {
                const prev = river.points[i - 1];
                const current = river.points[i];
                const next = river.points[i + 1];

                const prevCurrent = vSub(prev, current);
                const nextCurrent = vSub(next, current);

                const prevAngle = angleBetweenPoints(v(0, 0), prevCurrent);
                const nextAngle = angleBetweenPoints(v(0, 0), nextCurrent);

                const angleToDivide = Math.abs(prevAngle - nextAngle);
                const angle = angleToDivide / 2 + (
                    prevAngle > nextAngle // convex check
                        ? angleBetweenPoints(current, next)
                        : angleBetweenPoints(prev, current)
                );

                points.push(
                    vSub(
                        current,
                        vRotate(
                            v(width, 0),
                            angle
                        )
                    )
                );
            }

            points.push(
                vAdd(
                    river.points[0],
                    vRotate(
                        v(width + 10, 0),
                        angleBetweenPoints(river.points[0], river.points[1]) - Math.PI / 2
                    )
                )
            );
            findClosestBeachPoint(points.length - 1);

            return new PolygonHitbox(...points);
        };

        generatedRivers.push({
            water: getRiverPolygon(river.width / 2),
            bank: getRiverPolygon(river.width / 2 + river.bankWidth)
        });
        riverSpawnHitboxes.push(getRiverPolygon(river.width / 2 + river.bankWidth * 2));
    }

    return {
        beach,
        grass,
        rivers: generatedRivers,
        riverSpawnHitboxes
    };
}

// a grid used to store floor types
export class TerrainGrid {
    readonly width: number;
    readonly height: number;
    readonly cellSize = 32;

    readonly floors = new Map<Hitbox, string>();

    private readonly _grid: Record<number, Record<number, Array<{ readonly type: string, readonly hitbox: Hitbox }>>> = {};

    constructor(width: number, height: number) {
        this.width = Math.floor(width / this.cellSize);
        this.height = Math.floor(height / this.cellSize);

        for (let x = 0; x <= width; x++) {
            this._grid[x] = {};
            for (let y = 0; y <= height; y++) {
                this._grid[x][y] = [];
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
                this._grid[x][y].push({ type, hitbox });
            }
        }
    }

    getFloor(position: Vector): string {
        // assume if no floor was found at this position, its in the ocean
        let floorType = "water";

        const pos = this._roundToCells(position);
        for (const floor of this._grid[pos.x][pos.y]) {
            if (floor.hitbox.isPointInside(position)) {
                floorType = floor.type;
                break;
            }
        }

        return floorType;
    }

    intersectsHitbox(hitbox: RectangleHitbox): string {
        let floorType = "water";

        const rect = hitbox.toRectangle();
        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
                for (const floor of this._grid[x][y]) {
                    if (floor.hitbox.collidesWith(hitbox)) {
                        floorType = floor.type;
                        break;
                    }
                }
            }
        }
        return floorType;
    }

    private _roundToCells(vector: Vector): Vector {
        return v(
            clamp(Math.floor(vector.x / this.cellSize), 0, this.width),
            clamp(Math.floor(vector.y / this.cellSize), 0, this.height)
        );
    }
}
