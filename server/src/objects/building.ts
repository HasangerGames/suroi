import { ObjectCategory } from "@common/constants";
import { Buildings, type BuildingDefinition } from "@common/definitions/buildings";
import { type Orientation } from "@common/typings";
import { type Hitbox } from "@common/utils/hitbox";
import { Angle } from "@common/utils/math";
import { type Timeout } from "@common/utils/misc";
import { type ReifiableDef } from "@common/utils/objectDefinitions";
import { type FullData } from "@common/utils/objectsSerializations";
import { type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { Logger } from "../utils/misc";
import { BaseGameObject } from "./gameObject";
import { type Obstacle } from "./obstacle";

export class Building extends BaseGameObject.derive(ObjectCategory.Building) {
    override readonly fullAllocBytes = 8;
    override readonly partialAllocBytes = 6;

    readonly definition: BuildingDefinition;

    readonly scopeHitbox?: Hitbox;
    readonly spawnHitbox: Hitbox;
    readonly hitbox?: Hitbox;

    readonly collidable: boolean;

    private _wallsToDestroy: number;

    interactableObstacles = new Set<Obstacle>();

    orientation: Orientation;

    private readonly _puzzle?: {
        inputOrder: string[]
        solved: boolean
        errorSeq: boolean
        resetTimeout?: Timeout
    } | undefined;

    public get puzzle(): {
        readonly inputOrder: string[]
        readonly solved: boolean
        readonly errorSeq: boolean
        readonly resetTimeout?: Timeout
    } | undefined { return this._puzzle; }

    get hasPuzzle(): boolean { return this.puzzle !== undefined; }

    readonly puzzlePieces: Obstacle[] = [];

    constructor(game: Game, definition: ReifiableDef<BuildingDefinition>, position: Vector, orientation: Orientation, layer: number) {
        super(game, position);

        this.definition = Buildings.reify(definition);

        this.layer = layer;

        this.rotation = Angle.orientationToRotation(this.orientation = orientation);
        this._wallsToDestroy = this.definition.wallsToDestroy;
        this.spawnHitbox = this.definition.spawnHitbox.transform(this.position, 1, orientation);
        this.hitbox = this.definition.hitbox?.transform(this.position, 1, orientation);
        this.collidable = this.damageable = !!this.definition.hitbox;

        if (this.definition.ceilingHitbox !== undefined && this.definition.ceilingScopeEffect) {
            this.scopeHitbox = this.definition.ceilingHitbox.transform(this.position, 1, orientation);
        }

        if (this.definition.puzzle) {
            this._puzzle = {
                ...this.definition.puzzle,
                inputOrder: [],
                solved: false,
                errorSeq: false
            };
        }
    }

    damageCeiling(damage = 1): void {
        if (
            this._wallsToDestroy === Infinity
            || this.dead
            || this.game.pluginManager.emit("building_will_damage_ceiling", {
                building: this,
                damage
            })
        ) return;

        this._wallsToDestroy -= damage;

        this.game.pluginManager.emit("building_did_damage_ceiling", {
            building: this,
            damage
        });

        if (this._wallsToDestroy <= 0) {
            this.dead = true;
            this.setPartialDirty();
            this.game.pluginManager.emit("building_did_destroy_ceiling", this);
            if (this.definition.destroyUponCeilingCollapse && this.scopeHitbox) {
                for (const object of this.game.grid.intersectsHitbox(this.scopeHitbox)) {
                    if ((object.isObstacle && this.definition.destroyUponCeilingCollapse.includes(object.definition.idString)) && object.hitbox.collidesWith(this.spawnHitbox)) {
                        if (object.definition.isWindow) object.collidable = false;
                        object.damage({
                            source: this,
                            amount: object.health
                        });
                    }
                }
            }
        }
    }

    override damage(): void { /* see damageCeiling method */ }

    override get data(): FullData<ObjectCategory.Building> {
        return {
            dead: this.dead,
            puzzle: this.puzzle,
            layer: this.layer,
            full: {
                definition: this.definition,
                position: this.position,
                orientation: this.orientation
            }
        };
    }

    togglePuzzlePiece(piece: Obstacle): void {
        if (!piece.puzzlePiece) {
            console.warn(`Not a puzzle piece: ${piece.definition.idString}`);
            return;
        }
        const puzzle = this._puzzle;

        if (!puzzle) {
            console.warn("Attempting to toggle puzzle piece when no puzzle is present");
            return;
        }

        if (!("order" in puzzle)) {
            this.solvePuzzle();
            return;
        }

        if (puzzle.resetTimeout) puzzle.resetTimeout.kill();

        puzzle.inputOrder.push(piece.puzzlePiece as string);

        // we hope that puzzle and puzzle.order are sync'd correctly with the definition
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const order = this.definition.puzzle!.order!;

        // hack to compare two arrays :boffy:
        if (JSON.stringify(puzzle.inputOrder) === JSON.stringify(Object.values(order))) {
            this.solvePuzzle();
        } else if (puzzle.inputOrder.length >= order.length) {
            puzzle.errorSeq = !puzzle.errorSeq;
            this.setPartialDirty();
            puzzle.resetTimeout = this.game.addTimeout(this.resetPuzzle.bind(this), 1000);
        } else {
            puzzle.resetTimeout = this.game.addTimeout(() => {
                puzzle.errorSeq = !puzzle.errorSeq;
                this.setPartialDirty();
                this.game.addTimeout(this.resetPuzzle.bind(this), 1000);
            }, 10000);
        }
    }

    solvePuzzle(): void {
        const puzzle = this._puzzle;
        if (!puzzle) {
            Logger.warn("Attempting to solve puzzle when no puzzle is present");
            return;
        }

        // we hope the `this.puzzle` field is sync'd with the definition
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const puzzleDef = this.definition.puzzle!;

        const runOrWait = (cb: () => void, delay: number): void => {
            if (delay === 0) cb();
            else this.game.addTimeout(cb, delay);
        };

        runOrWait(
            () => {
                puzzle.solved = true;
                this.setPartialDirty();
            },
            puzzleDef.setSolvedImmediately ? 0 : puzzleDef.delay
        );

        runOrWait(
            () => {
                for (const obstacle of this.interactableObstacles) {
                    if (obstacle.definition.idString === puzzleDef.triggerOnSolve) {
                        if (obstacle.door) obstacle.door.locked = false;

                        if (!puzzleDef.unlockOnly) obstacle.interact(undefined);
                        else obstacle.setDirty();
                    }
                }
            },
            puzzleDef.delay
        );
    }

    resetPuzzle(): void {
        if (!this._puzzle) {
            Logger.warn("Attempting to reset puzzle when no puzzle is present");
            return;
        }
        this._puzzle.inputOrder = [];
        for (const piece of this.puzzlePieces) {
            piece.activated = false;
            piece.setDirty();
        }
        this.setPartialDirty();
    }
}
