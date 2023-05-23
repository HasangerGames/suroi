import { type Game } from "../game";
import { type GameScene } from "../scenes/gameScene";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type Vector } from "../../../../common/src/utils/vector";

/*
    Since this class seems to only ever be instantiated
    when some sort of stream is involved, it could be worth
    to refactor this constructor to take a stream object so
    that it can manage its own deserialization, allowing us
    to remove all these definite assignment assertions
*/
export abstract class GameObject {
    id!: number;
    abstract type: ObjectType;

    game: Game;
    scene: GameScene;

    position!: Vector;
    rotation!: number;

    dead = false;

    constructor(game: Game, scene: GameScene) {
        this.game = game;
        this.scene = scene;
    }

    abstract deserializePartial(stream: SuroiBitStream): void;
    abstract deserializeFull(stream: SuroiBitStream): void;

    abstract destroy(): void;
}
