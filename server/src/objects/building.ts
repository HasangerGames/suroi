import { ObjectCategory } from "../../../common/src/constants";
import { Buildings, type BuildingDefinition } from "../../../common/src/definitions/buildings";
import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { type Orientation } from "../../../common/src/typings";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { type Timeout } from "../../../common/src/utils/misc";
import { type ReferenceTo, type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { BaseGameObject } from "./gameObject";
import { type Obstacle } from "./obstacle";

export class Building extends BaseGameObject<ObjectCategory.Building> {
    override readonly type = ObjectCategory.Building;

    readonly definition: BuildingDefinition;

    readonly scopeHitbox?: Hitbox;
    readonly spawnHitbox: Hitbox;
    readonly hitbox: Hitbox;

    private _wallsToDestroy?: number;

    interactableObstacles = new Set<Obstacle>();

    // @ts-expect-error it makes the typings work :3
    declare rotation: Orientation;

    hasPuzzle = false;
    puzzle?: {
        triggerInteractOn: ReferenceTo<ObstacleDefinition>
        completeInteractDelay: number
        errorResetDelay: number
        pieceResetDelay: number
        order: string[]
        inputOrder: string[]
        solved: boolean
        errorSeq: boolean
        resetTimeout?: Timeout
    };

    puzzlePieces: Obstacle[] = [];

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
            this.hasPuzzle = true;
            this.puzzle = {
                ...this.definition.puzzle,
                inputOrder: [],
                solved: false,
                errorSeq: false
            };
        }
    }

    override damage(damage = 1): void {
        if (this._wallsToDestroy === undefined || this.dead) return;

        this._wallsToDestroy -= damage;

        if (this._wallsToDestroy <= 0) {
            this.dead = true;
            this.game.partialDirtyObjects.add(this);
        }
    }

    override get data(): Required<ObjectsNetData[ObjectCategory.Building]> {
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
        if (!this.puzzle) {
            console.warn("Attempting to toggle puzzle piece when no puzzle is present");
            return;
        }

        this.puzzle.inputOrder.push(piece.puzzlePiece);
        if (this.puzzle.resetTimeout) this.puzzle.resetTimeout.kill();

        // hack to compare two arrays :boffy:
        if (JSON.stringify(this.puzzle.inputOrder) === JSON.stringify(this.puzzle.order)) {
            this.solvePuzzle();
        } else if (this.puzzle.inputOrder.length >= this.puzzle.order.length) {
            this.puzzle.errorSeq = !this.puzzle.errorSeq;
            this.game.partialDirtyObjects.add(this);
            this.puzzle.resetTimeout = this.game.addTimeout(this.resetPuzzle.bind(this), this.puzzle.errorResetDelay);
        } else {
            this.puzzle.resetTimeout = this.game.addTimeout(() => {
                this.puzzle!.errorSeq = !this.puzzle!.errorSeq;
                this.game.partialDirtyObjects.add(this);
                this.game.addTimeout(this.resetPuzzle.bind(this), this.puzzle!.errorResetDelay);
            }, this.puzzle.pieceResetDelay);
        }
    }

    solvePuzzle(): void {
        if (!this.puzzle) {
            console.warn("Attempting to solve puzzle when no puzzle is present");
            return;
        }
        this.puzzle.solved = true;
        for (const obstacle of this.interactableObstacles) {
            if (obstacle.definition.idString === this.puzzle.triggerInteractOn) {
                this.game.addTimeout(() => obstacle.interact(), this.puzzle.completeInteractDelay);
            }
        }
        this.game.partialDirtyObjects.add(this);
    }

    resetPuzzle(): void {
        if (!this.puzzle) {
            console.warn("Attempting to reset puzzle when no puzzle is present");
            return;
        }
        this.puzzle.inputOrder = [];
        for (const piece of this.puzzlePieces) {
            piece.activated = false;
            this.game.fullDirtyObjects.add(piece);
        }
        this.game.partialDirtyObjects.add(this);
    }
}
