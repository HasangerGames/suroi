import { GameObject } from "../types/gameObject";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { type Vector } from "../../../common/src/utils/vector";
import { bodyFromHitbox } from "../utils";
import { type Body } from "planck";
import { type Variation } from "../../../common/src/typings";

export class Obstacle extends GameObject {
    variation: Variation;
    body?: Body;

    constructor(game: Game, type: ObjectType, position: Vector, rotation: number, scale: number, variation: Variation = 0) {
        super(game, type, position);

        this.rotation = rotation;
        this.scale = scale;
        this.variation = variation;

        const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
        this.hitbox = definition.hitbox.transform(this.position, this.scale);
        this.spawnHitbox = definition.spawnHitbox.transform(this.position, this.scale);
        this.body = bodyFromHitbox(game.world, this.hitbox, 0, this.scale, this);
    }

    serializePartial(stream: SuroiBitStream): void {
        super.serializePartial(stream);
        stream.writeScale(this.scale);
    }

    serializeFull(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
        if ((this.type.definition as ObstacleDefinition).rotation === "full") stream.writeRotation(this.rotation);
        stream.writeVariation(this.variation);
    }
}
