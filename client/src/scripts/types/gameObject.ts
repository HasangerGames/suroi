import { type Game } from "../game";
import { type GameScene } from "../scenes/gameScene";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type Vector } from "../../../../common/src/utils/vector";
import { type ObjectCategory } from "../../../../common/src/constants";
import { localStorageInstance } from "../utils/localStorageHandler";
import { type ObjectDefinition } from "../../../../common/src/utils/objectDefinitions";

/*
    Since this class seems to only ever be instantiated
    when some sort of stream is involved, it could be worth
    to refactor this constructor to take a stream object so
    that it can manage its own deserialization, allowing us
    to remove all these definite assignment assertions
*/
export abstract class GameObject<T extends ObjectCategory = ObjectCategory, U extends ObjectDefinition = ObjectDefinition> {
    id: number;
    type: ObjectType<T, U>;

    readonly game: Game;
    readonly scene: GameScene;

    _position!: Vector;

    set position(pos: Vector) {
        // Animate the position
        if (this.position === undefined || !localStorageInstance.config.movementSmoothing) {
            this.container.setPosition(pos.x * 20, pos.y * 20);
        } else {
            this.scene.tweens.add({
                targets: this.container,
                x: pos.x * 20,
                y: pos.y * 20,
                duration: 30
            });
        }
        this._position = pos;
    }

    get position(): Vector {
        return this._position;
    }

    rotation!: number;

    dead = false;

    readonly container: Phaser.GameObjects.Container;

    constructor(game: Game, scene: GameScene, type: ObjectType<T, U>, id: number) {
        this.game = game;
        this.scene = scene;
        this.type = type;
        this.id = id;

        this.container = scene.add.container();
    }

    destroy(): void {
        this.container.destroy();
    }

    abstract deserializePartial(stream: SuroiBitStream): void;
    abstract deserializeFull(stream: SuroiBitStream): void;
}
