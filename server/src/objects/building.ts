import { ObjectCategory } from "../../../common/src/constants";
import { Buildings, type BuildingDefinition } from "../../../common/src/definitions/buildings";
import { type Orientation } from "../../../common/src/typings";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../common/src/utils/objectType";
import { ObjectSerializations } from "../../../common/src/utils/objectsSerializations";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";
import { type Obstacle } from "./obstacle";

export class Building<Def extends BuildingDefinition = BuildingDefinition> extends GameObject {
    override readonly type = ObjectCategory.Building;

    override objectType: ObjectType<this["type"], Def>;

    readonly definition: Def;

    readonly scopeHitbox?: Hitbox;
    readonly spawnHitbox: Hitbox;
    readonly hitbox: Hitbox;

    private _wallsToDestroy?: number;

    interactableObstacles = new Set<Obstacle>();

    //@ts-expect-error it makes the typings work :3
    declare rotation: Orientation;

    constructor(game: Game, definition: ReferenceTo<Def> | Def, position: Vector, orientation: Orientation) {
        super(game, position);

        this.definition = typeof definition === "string" ? (definition = Buildings.getByIDString<Def>(definition)) : definition;

        this.objectType = ObjectType.fromString(this.type, this.definition.idString);

        this.rotation = orientation;
        this._wallsToDestroy = definition.wallsToDestroy;
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

    override serializePartial(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Building].serializePartial(
            stream,
            {
                dead: this.dead,
                fullUpdate: false
            }
        );
    }

    override serializeFull(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Building].serializeFull(
            stream,
            {
                dead: this.dead,
                position: this.position,
                rotation: this.rotation,
                fullUpdate: true
            }
        );
    }
}
