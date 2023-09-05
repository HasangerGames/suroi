import { type RectangleHitbox } from "../../../common/src/utils/hitbox";
import { clamp } from "../../../common/src/utils/math";
import { type Vector, v } from "../../../common/src/utils/vector";
import { type GameObject } from "../types/gameObject";

// TODO: function to remove an object from the grid
export class Grid {
    readonly width: number;
    readonly height: number;
    readonly cellSize: number;

    _grid: Record<number, Record<number, Set<GameObject>>> = {};

    constructor(width: number, height: number, cellSize: number) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;

        for (let x = 0; x <= width; x += cellSize) {
            this._grid[x] = {};
            for (let y = 0; y <= height; y += cellSize) {
                this._grid[x][y] = new Set();
            }
        }
    }

    addObject(object: GameObject): void {
        if (object.hitbox === undefined) return;

        const rect = object.hitbox.toRectangle();

        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        for (let x = min.x; x <= max.x; x += this.cellSize) {
            for (let y = min.y; y <= max.y; y += this.cellSize) {
                this._grid[x][y].add(object);
            }
        }
    }

    intersectsRect(rect: RectangleHitbox): Set<GameObject> {
        let objects = new Set<GameObject>();

        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        for (let x = min.x; x <= max.x; x += this.cellSize) {
            for (let y = min.y; y <= max.y; y += this.cellSize) {
                objects = new Set([...objects, ...this._grid[x][y]]);
            }
        }

        return objects;
    }

    private _roundToCells(vector: Vector): Vector {
        return v(clamp(Math.floor(vector.x / this.cellSize) * this.cellSize, 0, this.width),
            clamp(Math.floor(vector.y / this.cellSize) * this.cellSize, 0, this.height));
    }
}
