import { GameObject } from "../types/gameObject";
import { type Game } from "../game";
import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;
import { ObjectType } from "../../../../common/src/utils/objectType";
import { ObjectCategory } from "../../../../common/src/utils/objectCategory";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type GameScene } from "../scenes/gameScene";
import { type Vector } from "../../../../common/src/utils/vector";

export class Player extends GameObject {
    name: string;

    serverData: { rotation: Vector };

    private _health = 100;
    healthDirty = true;

    private _adrenaline = 100;
    adrenalineDirty = true;

    inputsDirty = false;

    movingUp = false;
    movingDown = false;
    movingLeft = false;
    movingRight = false;
    punching = false;

    body: Phaser.GameObjects.Arc;
    leftFist: Phaser.GameObjects.Arc;
    rightFist: Phaser.GameObjects.Arc;
    container: Phaser.GameObjects.Container;

    scene: GameScene;

    constructor(scene: GameScene, game: Game, name: string, socket: WebSocket, position: Vector2) {
        super(game, ObjectType.categoryOnly(ObjectCategory.Player), position);
        this.scene = scene;
        this.serverData = { rotation: new Vector2(0, -1) };
        this.body = scene.add.circle(0, 0, 48, 0xffdbac);
        this.leftFist = scene.add.circle(38, 35, 15, 0xffdbac).setStrokeStyle(5, 0x553000);
        this.rightFist = scene.add.circle(38, -35, 15, 0xffdbac).setStrokeStyle(5, 0x553000);
        this.container = scene.add.container(position.x, position.y, [this.body, this.leftFist, this.rightFist]);
    }

    get health(): number {
        return this._health;
    }

    set health(health: number) {
        this._health = health;
    }

    get adrenaline(): number {
        return this._adrenaline;
    }

    set adrenaline(adrenaline: number) {
        this._adrenaline = adrenaline;
    }

    /* eslint-disable @typescript-eslint/no-empty-function */

    deserializePartial(stream: SuroiBitStream): void {}

    deserializeFull(stream: SuroiBitStream): void {}
}
