import { GameObject } from "../types/gameObject";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type Vec2 } from "planck";

export class Obstacle extends GameObject {
    constructor(game: Game, type: ObjectType, position: Vec2, rotation: number, scale: number) {
        super(game, type, position);
        this.rotation = rotation;
        this.scale = scale;
    }

    serializePartial(stream: SuroiBitStream): void {
        stream.writeScale(this.scale);
    }

    serializeFull(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
        stream.writeRotation(this.rotation);
    }
}
