import { Layer, ObjectCategory } from "@common/constants";
import { type Hitbox } from "@common/utils/hitbox";
import { adjacentOrEquivLayer } from "@common/utils/layer";
import { Numeric } from "@common/utils/math";
import { ObjectPool } from "@common/utils/objectPool";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { type GameObject, type ObjectMapping } from "../objects/gameObject";
import { Logger } from "./misc";

/**
 * A Grid to filter collision detection of game objects
 */
export class Grid {
    readonly width: number;
    readonly height: number;
    readonly cellSize = 32;

    //                        X     Y     Object ID
    //                      __^__ __^__     ___^__
    private readonly _grid: Array<Array<Map<number, GameObject>>>;

    // store the cells each game object is occupying
    // so removing the object from the grid is faster
    private readonly _objectsCells = new Map<number, Vector[]>();

    readonly pool = new ObjectPool<ObjectMapping>();

    constructor(public readonly game: Game, width: number, height: number) {
        this.width = Math.floor(width / this.cellSize);
        this.height = Math.floor(height / this.cellSize);

        // fill the grid X row with arrays for the Y column
        // maps are created on-demand to save memory usage
        this._grid = Array.from({ length: this.width + 1 }, () => []);
    }

    /**
     * Add an object to the grid system and pool
     */
    addObject(object: GameObject): void {
        if (this.pool.has(object)) {
            Logger.warn(`[Grid] Tried to add object ${ObjectCategory[object.type]} again`);
            return;
        }
        this.pool.add(object);
        this.updateObject(object);
        this.game.updateObjects = true;
    }

    /**
     * Update an object position on the grid system
     * This removes it from the grid and re-adds it
     */
    updateObject(object: GameObject): void {
        this._removeFromGrid(object);
        const cells: Vector[] = [];

        const hasSpawnHitbox = "spawnHitbox" in object;
        const hitbox = object.hitbox;

        if (hitbox === undefined && !hasSpawnHitbox) {
            const pos = this._roundToCells(object.position);
            (this._grid[pos.x][pos.y] ??= new Map()).set(object.id, object);
            cells.push(pos);
        } else {
            const rect = (
                hasSpawnHitbox
                    ? object.spawnHitbox
                    // can't be undefined cuz then hasSpawnHitbox would be true, meaning we'd pick the ternary's other branch
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    : hitbox!
            ).toRectangle();

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
                    cells.push(Vec.create(x, y));
                }
            }
        }

        // Store the cells this object is occupying
        this._objectsCells.set(object.id, cells);
    }

    private _removeFromGrid(object: GameObject): void {
        const cells = this._objectsCells.get(object.id);
        if (!cells) return;

        for (const cell of cells) {
            this._grid[cell.x][cell.y].delete(object.id);
        }
        this._objectsCells.delete(object.id);
    }

    /**
     * Remove an object from the grid system and object pool
     */
    removeObject(object: GameObject): void {
        this._removeFromGrid(object);
        this.pool.delete(object);
    }

    /**
     * Get all objects near this hitbox. This transforms the hitbox into a rectangle
     * and gets all objects intersecting it after rounding it to grid cells
     *
     * @param hitbox The hitbox
     * @param layer An optional layer to filter by; if omitted, all objects intersecting the hitbox—regardless of their layer—are returned
     * @return A set with the objects near this hitbox
     */
    intersectsHitbox(hitbox: Hitbox, layer?: Layer): Set<GameObject> {
        const rect = hitbox.toRectangle();

        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        const objects = new Set<GameObject>();
        const includeAll = layer === undefined;

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
                    // Only filter intersecting objects by their layer if a layer was specified.
                    if (includeAll || (object.layer !== undefined && adjacentOrEquivLayer(object, layer))) {
                        objects.add(object);
                    }
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
            x: Numeric.clamp(Math.floor(vector.x / this.cellSize), 0, this.width),
            y: Numeric.clamp(Math.floor(vector.y / this.cellSize), 0, this.height)
        };
    }
}
