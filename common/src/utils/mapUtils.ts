import { type Hitbox, RectangleHitbox } from "./hitbox";
import { clamp } from "./math";
import { SeededRandom } from "./random";
import { type Vector, v, vClone } from "./vector";

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

export function generateTerrain(width: number, height: number, oceanSize: number, beachSize: number, seed: number): {
    readonly beachPoints: Vector[]
    readonly grassPoints: Vector[]
} {
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

    const beachPoints = jaggedRectangle(beachHitbox, spacing, variation, random);
    const grassPoints = jaggedRectangle(grassHitbox, spacing, variation, random);

    return {
        beachPoints,
        grassPoints
    };
}

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
    metal: {
        debugColor: 0x808080
    },
    sand: {
        debugColor: 0xff5500
    },
    water: {
        debugColor: 0x0055ff,
        speedMultiplier: 0.8,
        overlay: true,
        particles: true
    }
};

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
