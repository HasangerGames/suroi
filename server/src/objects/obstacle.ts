import { GameObject } from "../types/gameObject";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { type Vector } from "../../../common/src/utils/vector";
import { bodyFromHitbox } from "../utils";
import { type Body } from "planck";

export class Obstacle extends GameObject {
    body?: Body;

    constructor(game: Game, type: ObjectType, position: Vector, rotation: number, scale: number) {
        super(game, type, position);

        this.rotation = rotation;
        this.scale = scale;
        this.hitbox = (type.definition as ObstacleDefinition).hitbox.clone();
        this.body = bodyFromHitbox(game.world, this.hitbox, this.position, 0, this.scale, this);
    }

    serializePartial(stream: SuroiBitStream): void {
        super.serializePartial(stream);
        stream.writeScale(this.scale);
    }

    serializeFull(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
        stream.writeRotation(this.rotation);
    }
}
