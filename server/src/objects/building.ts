import { ObjectCategory } from "../../../common/src/constants";
import { Buildings, type BuildingDefinition } from "../../../common/src/definitions/buildings";
import { type Orientation } from "../../../common/src/typings";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";
import { type Obstacle } from "./obstacle";

export class Building extends GameObject<ObjectCategory.Building> {
    override readonly type = ObjectCategory.Building;

    readonly definition: BuildingDefinition;

    readonly scopeHitbox?: Hitbox;
    readonly spawnHitbox: Hitbox;
    readonly hitbox: Hitbox;

    private _wallsToDestroy?: number;

    interactableObstacles = new Set<Obstacle>();

    //@ts-expect-error it makes the typings work :3
    declare rotation: Orientation;

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
    }

    override damage(): void {
        if (this._wallsToDestroy === undefined || this.dead) return;

        this._wallsToDestroy--;

        if (this._wallsToDestroy <= 0) {
            this.dead = true;
            this.game.partialDirtyObjects.add(this);
        }
    }

    override get data(): Required<ObjectsNetData[ObjectCategory.Building]> {
        return {
            dead: this.dead,
            full: {
                definition: this.definition,
                position: this.position,
                rotation: this.rotation
            }
        };
    }
}
