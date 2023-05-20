import { type Game } from "../game";
import { type GameScene } from "../scenes/gameScene";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type Vector } from "../../../../common/src/utils/vector";

export abstract class GameObject {
    id: number;
    type: ObjectType;

    game: Game;
    scene: GameScene;

    position: Vector;
    rotation: number;

    dead = false;

    constructor(game: Game, scene: GameScene) {
        this.game = game;
        this.scene = scene;
    }

    abstract deserializePartial(stream: SuroiBitStream): void;
    abstract deserializeFull(stream: SuroiBitStream): void;

    abstract destroy(): void;
}
