import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import Vector2 = Phaser.Math.Vector2;
import { type Vector } from "../../../../common/src/utils/vector";

export abstract class GameObject {
    id: number;
    type: ObjectType;

    game: Game;

    position: Vector;
    rotation: Vector;

    protected constructor(game: Game, type: ObjectType, position: Vector2) {
        this.game = game;
        this.type = type;
        this.position = position;
    }

    abstract deserializePartial(stream: SuroiBitStream): void;
    abstract deserializeFull(stream: SuroiBitStream): void;
}
