import { GameObject } from "../types/gameObject";
import { type Game } from "../game";
import Phaser from "phaser";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type GameScene } from "../scenes/gameScene";
import Vector2 = Phaser.Math.Vector2;
import { ObjectCategory } from "../../../../common/src/constants";
import { ObjectType } from "../../../../common/src/utils/objectType";

export class Player extends GameObject {
    name: string;

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

    distSinceLastFootstep = 0;

    constructor(game: Game, scene: GameScene, name: string, socket: WebSocket, position: Vector2) {
        super(game, scene);
        this.type = ObjectType.categoryOnly(ObjectCategory.Player);
        this.position = position;

        this.body = scene.add.circle(0, 0, 48, 0xffdbac);
        this.leftFist = scene.add.circle(38, 35, 15, 0xffdbac).setStrokeStyle(5, 0x553000);
        this.rightFist = scene.add.circle(38, -35, 15, 0xffdbac).setStrokeStyle(5, 0x553000);
        this.container = scene.add.container(position.x, position.y, [this.body, this.leftFist, this.rightFist]).setDepth(1);
    }

    createPolygon(radius: number, sides: number): number[][] {
        const points: number[][] = [];
        for (let i = 0; i < sides; i++) {
            const angle = (2 * Math.PI * i) / sides;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            points.push([x, y]);
        }

        return points;
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

    destroy(): void {
        this.body.destroy(true);
        this.leftFist.destroy(true);
        this.rightFist.destroy(true);
        this.container.destroy(true);
    }
}
