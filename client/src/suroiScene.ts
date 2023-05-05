import Phaser from "phaser";
import { MapObjects } from "./constants/mapObjects";

export class SuroiScene extends Phaser.Scene {

    constructor() {
        super("suroi");
    }

    player: Phaser.GameObjects.Container;
    playerLeftFist: Phaser.GameObjects.Arc;
    playerRightFist: Phaser.GameObjects.Arc;
    punching = false;

    preload(): void {
        for(const object of MapObjects) {
            this.load.image(object.id, `/img/map/${object.imageName}`);
        }
        this.load.audio("swing", "/audio/sfx/swing.mp3");
        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            const angle: number = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
            this.player.setRotation(angle);
        });
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if(pointer.leftButtonDown() && !this.punching) {
                this.punching = true;
                const altFist: boolean = Math.random() < 0.5;
                this.tweens.add({
                    targets: altFist ? this.playerLeftFist : this.playerRightFist,
                    x: 50,
                    y: altFist ? 16 : -16,
                    duration: 100,
                    yoyo: true,
                    onComplete: () => this.punching = false
                });
                this.sound.add("swing").play();
            }
        });
    }

    create(): void {
        const playerBody = this.add.circle(0, 0, 32, 0xffdbac);
        this.playerLeftFist = this.add.circle(24, 24, 10, 0xffdbac).setStrokeStyle(3, 0x8e6b3d);
        this.playerRightFist = this.add.circle(24, -24, 10, 0xffdbac).setStrokeStyle(3, 0x8e6b3d);
        this.add.grid(0, 0, 14400, 14400, 640, 640, 0x49993e);
        this.player = this.add.container(48, 48, [playerBody, this.playerLeftFist, this.playerRightFist]);
        this.cameras.main.startFollow(this.player);
    }

}
