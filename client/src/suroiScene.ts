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
            this.load.svg(object.id, `/img/map/${object.imageName}`, { scale: object.scale });
        }
        this.load.audio("swing", require("/audio/sfx/swing.mp3"));
        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            const angle: number = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
            this.player.setRotation(angle);
        });
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown() && !this.punching) {
                this.punching = true;
                const altFist: boolean = Math.random() < 0.5;
                this.tweens.add({
                    targets: altFist ? this.playerLeftFist : this.playerRightFist,
                    x: 75,
                    y: altFist ? 10 : -10,
                    duration: 110,
                    yoyo: true,
                    onComplete: () => this.punching = false
                });
                this.sound.add("swing").play();
            }
        });
        this.cameras.main.setZoom(this.sys.game.canvas.width / 2560);
    }

    create(): void {
        const playerBody = this.add.circle(0, 0, 48, 0xffdbac);
        this.playerLeftFist = this.add.circle(40, 36, 15, 0xffdbac).setStrokeStyle(5, 0x8e6b3d);
        this.playerRightFist = this.add.circle(40, -36, 15, 0xffdbac).setStrokeStyle(5, 0x8e6b3d);
        this.add.grid(0, 0, 14400, 14400, 640, 640, 0x49993e);
        this.player = this.add.container(800, 100, [playerBody, this.playerLeftFist, this.playerRightFist]);
        this.cameras.main.startFollow(this.player);
        this.add.image(-150, 500, "stone_01");
        this.add.image(200, -300, "stone_02");
        this.add.image(900, 500, "stone_03");
        this.add.image(1800, -200, "stone_04");
        this.add.image(1500, 600, "stone_05");
        this.add.image(0, 0, "tree_oak_01");
        this.add.image(500, 100, "tree_oak_02");
        this.add.image(1500, 300, "tree_oak_03");
        this.add.image(400, 600, "crate_01");
        this.add.image(1100, -300, "crate_02");
    }
}
