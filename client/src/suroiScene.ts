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
            this.load.image(object.id, require(`/img/map/${object.imageName}`));
        }
        this.load.audio("swing", require("/audio/sfx/swing.mp3"));
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
                    x: 25,
                    y: altFist ? 8 : -8,
                    duration: 75,
                    yoyo: true,
                    onComplete: () => this.punching = false
                });
                this.sound.add("swing").play();
            }
        });
        this.cameras.main.setZoom(2);
    }

    create(): void {
        const playerBody = this.add.circle(0, 0, 16, 0xffdbac);
        this.playerLeftFist = this.add.circle(12, 12, 5, 0xffdbac).setStrokeStyle(1.5, 0xb28953);
        this.playerRightFist = this.add.circle(12, -12, 5, 0xffdbac).setStrokeStyle(1.5, 0xb28953);
        this.add.grid(0, 0, 7200, 7200, 160, 160, 0x49993e);
        //this.add.image(360, 360, "tree_01").setScale(.5, .5);
        for(let x = 0; x < 720; x++) {
            this.add.rectangle(x, 0, 720, 2, 0x000000);
        }
        this.player = this.add.container(360, 360, [playerBody, this.playerLeftFist, this.playerRightFist]);
        this.cameras.main.startFollow(this.player);
    }

}
