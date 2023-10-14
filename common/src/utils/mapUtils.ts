import { type Hitbox, RectangleHitbox, PolygonHitbox } from "./hitbox";
import { angleBetweenPoints, angleBetweenVectors, clamp } from "./math";
import { SeededRandom } from "./random";
import { type Vector, v, vClone, vAdd, vRotate, vSub, vMul } from "./vector";

export function jaggedRectangle(hitbox: RectangleHitbox,
    spacing: number,
    variation: number,
    random: SeededRandom): Vector[] {
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
    water: {
        debugColor: 0x0055ff,
        speedMultiplier: 0.7,
        overlay: true,
        particles: true
    }
};

export class River {
    width: number;
    points: Vector[];
    constructor(width: number, points: Vector[]) {
        this.width = width;
        this.points = points;
    }
}

export function generateTerrain(
    width: number,
    height: number,
    oceanSize: number,
    beachSize: number,
    seed: number,
    rivers: River[]): {
        beach: PolygonHitbox
        grass: PolygonHitbox
        rivers: Array<{
            water: PolygonHitbox
            bank: PolygonHitbox
        }>
    } {
    // generate beanch and grass
    const beachPadding = oceanSize + beachSize;

    const random = new SeededRandom(seed);

    const spacing = 16;
    const variation = 8;

    const beachHitbox = new RectangleHitbox(v(oceanSize, oceanSize),
        v(width - oceanSize, height - oceanSize));

    const grassHitbox = new RectangleHitbox(v(beachPadding, beachPadding),
        v(width - beachPadding, height - beachPadding));

    const beach = new PolygonHitbox(jaggedRectangle(beachHitbox, spacing, variation, random));
    const grass = new PolygonHitbox(jaggedRectangle(grassHitbox, spacing, variation, random));

    const generatedRivers: ReturnType<typeof generateTerrain>["rivers"] = [];

    const halfPI = Math.PI / 2;

    for (const river of rivers) {
        const getRiverPolygon = (width: number): PolygonHitbox => {
            const temp = v(width, 0);

            // first loop, add points from start to end
            const points: Vector[] = [];
            for (let i = 1; i < river.points.length - 1; i++) {
                const prev = river.points[i - 1];
                const current = river.points[i];
                const next = river.points[i + 1];

                const prevCurrent = vSub(prev, current);
                const nextCurrent = vSub(next, current);

                const angleToDivide = angleBetweenVectors(prevCurrent, nextCurrent);
                const angle = angleToDivide / 2 + angleBetweenPoints(current, prev);

                points.push(vAdd(current, vRotate(temp, angle)));
            }

            // second loop, same thing but reverse and with inverted point
            for (let i = river.points.length - 2; i > 0; i--) {
                const prev = river.points[i - 1];
                const current = river.points[i];
                const next = river.points[i + 1];

                const prevCurrent = vSub(prev, current);
                const nextCurrent = vSub(next, current);

                const angleToDivide = angleBetweenVectors(prevCurrent, nextCurrent);
                const angle = angleToDivide / 2 + angleBetweenPoints(current, prev);

                points.push(vSub(current, vRotate(temp, angle)));
            }
            // add last point
            const point = river.points[0];
            const angle = angleBetweenPoints(point, river.points[1]);
            points.push(vAdd(point, vRotate(temp, angle - halfPI)));

            return new PolygonHitbox(points);
        };

        generatedRivers.push({
            water: getRiverPolygon(river.width / 2),
            // todo: hardcoded bank width
            bank: getRiverPolygon((river.width / 2) + 15)
        });
    }

    return {
        beach,
        grass,
        rivers: generatedRivers
    };
}

// a grid used to store floor types
export class TerrainGrid {
    readonly width: number;
    readonly height: number;
    readonly cellSize = 32;

    readonly floors = new Map<Hitbox, string>();

    private readonly _grid: Record<number, Record<number, Array<{ type: string, hitbox: Hitbox }>>> = {};

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
        return v(clamp(Math.floor(vector.x / this.cellSize), 0, this.width),
            clamp(Math.floor(vector.y / this.cellSize), 0, this.height));
    }
}
