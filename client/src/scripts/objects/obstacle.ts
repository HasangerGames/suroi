import { GameObject } from "../types/gameObject";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type GameScene } from "../scenes/gameScene";
import { type Game } from "../game";
import Vector2 = Phaser.Math.Vector2;
import { type ObjectType } from "../../../../common/src/utils/objectType";

export class Obstacle extends GameObject {
    scale: number;

    scene: Phaser.Scene;
    image: Phaser.GameObjects.Image;

    constructor(scene: GameScene, game: Game, type: ObjectType, id: number, position: Vector2, rotation: number, scale: number) {
        super(game, type, position);
        this.scene = scene;
        this.id = id;
        this.rotation = rotation;
        this.scale = scale;
        this.image = this.scene.add.image(this.position.x * 20, this.position.y * 20, "tree_oak").setRotation(this.rotation); //.setScale(this.scale);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    deserializePartial(stream: SuroiBitStream): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    deserializeFull(stream: SuroiBitStream): void {}
}
