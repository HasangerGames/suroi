import { type RectangleHitbox, type Hitbox } from "../../../common/src/utils/hitbox";
import { clamp } from "../../../common/src/utils/math";
import { type Vector, v } from "../../../common/src/utils/vector";

interface GameObject {
    readonly id: number
    readonly hitbox?: Hitbox
    readonly position: Vector
}

/**
 * A Grid to filter collision detection of game objects
 */
export class Grid<T extends GameObject> {
    readonly width: number;
    readonly height: number;
    readonly cellSize = 32;

    //                        X     Y     Object ID
    //                      __^__ __^__     ___^__
    private readonly _grid: Array<Array<Map<number, T>>>;

    // store the cells each game object is occupying
    // so removing the object from the grid is faster
    private readonly _objectsCells = new Map<number, Vector[]>();

    constructor(width: number, height: number) {
        this.width = Math.floor(width / this.cellSize);
        this.height = Math.floor(height / this.cellSize);

        // fill the grid X row with arrays for the Y column
        // maps are created on demand to save memory usage
        this._grid = Array.from({ length: this.width + 1 }, () => []);
    }

    /**
     * Add an object to the grid system
     */
    addObject(object: T): void {
        this.removeObject(object);

        const cells: Vector[] = [];

        if (object.hitbox === undefined) {
            const pos = this._roundToCells(object.position);
            (this._grid[pos.x][pos.y] ??= new Map()).set(object.id, object);
            cells.push(pos);
        } else {
            let rect: RectangleHitbox;
            if ("spawnHitbox" in object) {
                rect = (object.spawnHitbox as Hitbox).toRectangle();
            } else {
                rect = object.hitbox.toRectangle();
            }

            // Get the bounds of the hitbox
            // Round it to the grid cells
            const min = this._roundToCells(rect.min);
            const max = this._roundToCells(rect.max);

            // Add it to all grid cells that it intersects
            for (
                let x = min.x, maxX = max.x;
                x <= maxX;
                x++
            ) {
                const xRow = this._grid[x];
                for (
                    let y = min.y, maxY = max.y;
                    y <= maxY;
                    y++
                ) {
                    (xRow[y] ??= new Map()).set(object.id, object);
                    cells.push(v(x, y));
                }
            }
        }

        // Store the cells this object is occupying
        this._objectsCells.set(object.id, cells);
    }

    /**
     * Remove an object from the grid system
     */
    removeObject(object: T): void {
        const cells = this._objectsCells.get(object.id);
        if (!cells) return;

        for (const cell of cells) {
            this._grid[cell.x][cell.y].delete(object.id);
        }
        this._objectsCells.delete(object.id);
    }

    /**
     * Get all objects near this hitbox
     * This transforms the hitbox into a rectangle
     * and gets all objects intersecting it after rounding it to grid cells
     * @param hitbox The hitbox
     * @return A set with the objects near this hitbox
     */
    intersectsHitbox(hitbox: Hitbox): Set<T> {
        const rect = hitbox.toRectangle();

        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        const objects = new Set<T>();

        for (
            let x = min.x, maxX = max.x;
            x <= maxX;
            x++
        ) {
            const xRow = this._grid[x];
            for (
                let y = min.y, maxY = max.y;
                y <= maxY;
                y++
            ) {
                const objectsMap = xRow[y];
                if (!objectsMap) continue;

                for (const object of objectsMap.values()) {
                    objects.add(object);
                }
            }
        }

        return objects;
    }

    /**
     * Rounds a position to this grid cells
     */
    private _roundToCells(vector: Vector): Vector {
        return {
            x: clamp(Math.floor(vector.x / this.cellSize), 0, this.width),
            y: clamp(Math.floor(vector.y / this.cellSize), 0, this.height)
        };
    }
}
