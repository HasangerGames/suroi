import { type Game } from "../game";
import { type GameScene } from "../scenes/gameScene";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type Vector } from "../../../../common/src/utils/vector";
import { type ObjectCategory } from "../../../../common/src/constants";

/*
    Since this class seems to only ever be instantiated
    when some sort of stream is involved, it could be worth
    to refactor this constructor to take a stream object so
    that it can manage its own deserialization, allowing us
    to remove all these definite assignment assertions
*/
export abstract class GameObject<T extends ObjectCategory = ObjectCategory> {
    id: number;
    type: ObjectType<T>;

    game: Game;
    scene: GameScene;

    position!: Vector;
    rotation!: number;

    dead = false;

    constructor(game: Game, scene: GameScene, type: ObjectType<T>, id: number) {
        this.game = game;
        this.scene = scene;
        this.type = type;
        this.id = id;
    }

    abstract deserializePartial(stream: SuroiBitStream): void;
    abstract deserializeFull(stream: SuroiBitStream): void;

    abstract destroy(): void;
}
