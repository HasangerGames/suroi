import { ObjectCategory } from "../../../common/src/constants";
import { Buildings, type BuildingDefinition } from "../../../common/src/definitions/buildings";
import { type Orientation } from "../../../common/src/typings";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { type Timeout } from "../../../common/src/utils/misc";
import { type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { Events } from "../pluginManager";
import { Logger } from "../utils/misc";
import { BaseGameObject } from "./gameObject";
import { type Obstacle } from "./obstacle";

export class Building extends BaseGameObject<ObjectCategory.Building> {
    override readonly type = ObjectCategory.Building;
    override readonly fullAllocBytes = 8;
    override readonly partialAllocBytes = 4;

    readonly definition: BuildingDefinition;

    readonly scopeHitbox?: Hitbox;
    readonly spawnHitbox: Hitbox;
    readonly hitbox: Hitbox;

    private _wallsToDestroy: number;

    interactableObstacles = new Set<Obstacle>();

    // @ts-expect-error it makes the typings work :3
    declare rotation: Orientation;

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

    constructor(game: Game, definition: ReifiableDef<BuildingDefinition>, position: Vector, orientation: Orientation) {
        super(game, position);

        this.definition = Buildings.reify(definition);

        this.rotation = orientation;
        this._wallsToDestroy = this.definition.wallsToDestroy;
        this.spawnHitbox = this.definition.spawnHitbox.transform(this.position, 1, orientation);
        this.hitbox = this.spawnHitbox;

        if (this.definition.scopeHitbox !== undefined) {
            this.scopeHitbox = this.definition.scopeHitbox.transform(this.position, 1, orientation);
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
        if (this._wallsToDestroy === Infinity || this.dead) return;

        this.game.pluginManager.emit(Events.Building_CeilingDamage, {
            building: this,
            damage
        });

        this._wallsToDestroy -= damage;

        if (this._wallsToDestroy <= 0) {
            this.dead = true;
            this.setPartialDirty();
            this.game.pluginManager.emit(Events.Building_CeilingDestroy, this);
        }
    }

    override damage(): void { /* see damageCeiling method */ }

    override get data(): FullData<ObjectCategory.Building> {
        return {
            dead: this.dead,
            puzzle: this.puzzle,
            full: {
                definition: this.definition,
                position: this.position,
                rotation: this.rotation
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

        this.game.addTimeout(() => {
            puzzle.solved = true;
            this.setPartialDirty();
        }, puzzleDef.setSolvedImmediately ? 0 : puzzleDef.interactDelay);

        this.game.addTimeout(() => {
            for (const obstacle of this.interactableObstacles) {
                if (obstacle.definition.idString === puzzleDef.triggerInteractOn) {
                    obstacle.interact();
                }
            }
        }, puzzleDef.interactDelay);
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
