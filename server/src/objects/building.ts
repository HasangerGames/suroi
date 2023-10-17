import { ObjectCategory } from "../../../common/src/constants";
import { type BuildingDefinition } from "../../../common/src/definitions/buildings";
import { type Orientation } from "../../../common/src/typings";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { ObjectSerializations } from "../../../common/src/utils/objectsSerializations";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";

export class Building extends GameObject {
    readonly definition: BuildingDefinition;

    readonly spawnHitbox: Hitbox;

    readonly scopeHitbox: Hitbox;

    private _wallsToDestroy?: number;

    readonly hitbox: Hitbox;

    constructor(game: Game, type: ObjectType<ObjectCategory.Building, BuildingDefinition>, position: Vector, orientation: Orientation) {
        super(game, type, position);

        this.definition = type.definition;

        this.rotation = orientation;

        this._wallsToDestroy = type.definition.wallsToDestroy;

        this.spawnHitbox = this.definition.spawnHitbox.transform(this.position, 1, orientation);

        this.hitbox = this.spawnHitbox;

        this.scopeHitbox = this.definition.scopeHitbox.transform(this.position, 1, orientation);
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
        ObjectSerializations[ObjectCategory.Building].serializePartial(stream, {
            dead: this.dead,
            fullUpdate: false
        });
    }

    override serializeFull(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Building].serializeFull(stream, {
            dead: this.dead,
            position: this.position,
            rotation: this.rotation,
            fullUpdate: true
        });
    }
}
