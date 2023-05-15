import { GameObject } from "../types/gameObject";
import { type Game } from "../game";
import Phaser from "phaser";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type GameScene } from "../scenes/gameScene";
import {
    ANIMATION_TYPE_BITS, AnimationType, ObjectCategory
} from "../../../../common/src/constants";
import { ObjectType } from "../../../../common/src/utils/objectType";
import gsap from "gsap";
import { type Vector, vClone } from "../../../../common/src/utils/vector";

export class Player extends GameObject {
    name: string;

    private _health = 100;
    healthDirty = true;

    private _adrenaline = 100;
    adrenalineDirty = true;

    oldPosition: Vector;

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

    constructor(game: Game, scene: GameScene) {
        super(game, scene);
        this.type = ObjectType.categoryOnly(ObjectCategory.Player);
        this.body = this.scene.add.circle(0, 0, 48, 0xffdbac);
        this.leftFist = this.scene.add.circle(38, 35, 15, 0xffdbac).setStrokeStyle(5, 0x553000);
        this.rightFist = this.scene.add.circle(38, -35, 15, 0xffdbac).setStrokeStyle(5, 0x553000);
        this.container = this.scene.add.container(360, 360, [this.body, this.leftFist, this.rightFist]).setDepth(1);
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

    deserializePartial(stream: SuroiBitStream): void {
        // Position and rotation
        if (this.position !== undefined) this.oldPosition = vClone(this.position);
        this.position = stream.readPosition();
        const oldAngle: number = this.container.angle;
        const newAngle: number = Phaser.Math.RadToDeg(stream.readRotation());
        const angleBetween: number = Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);
        gsap.to(this.container, {
            x: this.position.x * 20,
            y: this.position.y * 20,
            angle: oldAngle + angleBetween,
            ease: "none",
            duration: 0.03
        });

        // Animation
        const animation: AnimationType = stream.readBits(ANIMATION_TYPE_BITS);
        switch (animation) {
            case AnimationType.Punch: {
                const altFist: boolean = Math.random() < 0.5;
                gsap.to(altFist ? this.leftFist : this.rightFist, {
                    x: 75,
                    y: altFist ? 10 : -10,
                    duration: 0.11,
                    repeat: 1,
                    yoyo: true,
                    ease: "none"
                });
                this.scene.playSound("swing");
                break;
            }
        }
    }

    deserializeFull(stream: SuroiBitStream): void {
        const dead: boolean = stream.readBoolean();
        if (dead && !this.dead) {
            this.dead = true;
            this.destroy();
        }
    }

    destroy(): void {
        console.log(this.container);
        //this.container.remove([this.body, this.leftFist, this.rightFist], true);
        //this.container.destroy(true);
    }
}
