import { type CollisionFilter, GameObject } from "../types/gameObject";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type ObjectCategory } from "../../../common/src/constants";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type Game } from "../game";
import { type Vector } from "../../../common/src/utils/vector";
import { type BuildingDefinition } from "../../../common/src/definitions/buildings";
import { type Hitbox } from "../../../common/src/utils/hitbox";
import { type Orientation } from "../../../common/src/typings";

export class Building extends GameObject {
    readonly is: CollisionFilter = {
        player: false,
        obstacle: false,
        bullet: false,
        loot: false
    };

    readonly collidesWith: CollisionFilter = {
        player: false,
        obstacle: false,
        bullet: false,
        loot: false
    };

    readonly definition: BuildingDefinition;

    readonly spawnHitbox: Hitbox;

    readonly scopeHitbox: Hitbox;

    constructor(game: Game, type: ObjectType<ObjectCategory.Building, BuildingDefinition>, position: Vector, orientation: Orientation) {
        super(game, type, position);

        this.definition = type.definition;

        this.rotation = orientation;

        this.spawnHitbox = this.definition.spawnHitbox.transform(this.position, 1, orientation);

        this.scopeHitbox = this.definition.scopeHitbox.transform(this.position, 1, orientation);
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    override damage(amount: number, source: GameObject): void {}

    override serializePartial(stream: SuroiBitStream): void {}

    override serializeFull(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
        stream.writeObstacleRotation(this.rotation, "limited");
    }
}
