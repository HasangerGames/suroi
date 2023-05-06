import Phaser from "phaser";

import { MapObjects } from "../constants/mapObjects";
import { type MenuScene } from "./menuScene";

export class GameScene extends Phaser.Scene {
    constructor () {
        super("game");
    }

    player: Phaser.GameObjects.Container;
    playerLeftFist: Phaser.GameObjects.Polygon;
    playerRightFist: Phaser.GameObjects.Polygon;
    punching = false;

    preload (): void {
        for (const object of MapObjects) this.load.svg(object.id, `/assets/img/map/${object.imageName}`, { scale: object.scale });

        this.load.image("kong", "/assets/img/kong.jpg");
        this.load.audio("swing", "/assets/audio/sfx/swing.mp3");
        this.load.audio("grass_step_01", "/assets/audio/sfx/footsteps/grass_01.mp3");
        this.load.audio("grass_step_02", "/assets/audio/sfx/footsteps/grass_02.mp3");

        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            const angle: number = Math.atan2(pointer.worldY - this.player?.y ?? 0, pointer.worldX - this.player?.x ?? 0);
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
                    onComplete: () => { this.punching = false; }
                });
                this.sound.add("swing").play();
            }
        });
        this.cameras.main.setZoom(this.sys.game.canvas.width / 2560);
        // this.cameras.main.setBounds(0, 0, 14400, 14400);
    }

    upKey: Phaser.Input.Keyboard.Key;
    downKey: Phaser.Input.Keyboard.Key;
    leftKey: Phaser.Input.Keyboard.Key;
    rightKey: Phaser.Input.Keyboard.Key;

    stepsSinceLastSound = 0;

    create (): void {
        (this.scene.get("menu") as MenuScene).stopMusic();
        const keyboard = this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
        this.upKey = keyboard.addKey("W");
        this.downKey = keyboard.addKey("S");
        this.leftKey = keyboard.addKey("A");
        this.rightKey = keyboard.addKey("D");

        // Draw grid
        const GRID_WIDTH = 14400;
        const GRID_HEIGHT = 14400;
        const CELL_SIZE = 240;
        for (let x = 0; x <= GRID_WIDTH; x += CELL_SIZE) {
            this.add.line(x, 0, x, 0, x, GRID_HEIGHT * 2).setOrigin(0, 0).setStrokeStyle(25, 0x000000, 0.25);
        }
        for (let y = 0; y <= GRID_HEIGHT; y += CELL_SIZE) {
            this.add.line(0, y, 0, y, GRID_WIDTH * 2, y).setOrigin(0, 0).setStrokeStyle(25, 0x000000, 0.25);
        }

        const playerBody = this.add.circle(0, 0, 48, 0xffdbac);
        this.playerLeftFist = this.add.polygon(38, 35, this.createPolygon(16, 5), 0xffdbac).setOrigin(0, 0).setStrokeStyle(5, 0x553000);
        this.playerRightFist = this.add.polygon(38, -35, this.createPolygon(16, 5), 0xffdbac).setOrigin(0, 0).setStrokeStyle(5, 0x553000);
        // const guide1 = this.add.circle(38, 35, 15, 0xff0000).setStrokeStyle(3.5, 0xdf0000);
        // const guide2 = this.add.circle(38, -35, 15, 0xff0000).setStrokeStyle(3.5, 0xdf0000);
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

    createPolygon (radius: number, sides: number): number[][] {
        const points: number[][] = [];
        for (let i = 0; i < sides; i++) {
            const angle = (2 * Math.PI * i) / sides;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            points.push([x, y]);
        }
        return points;
    }

    update (): void {
        if (this.upKey.isDown) this.player.y -= 5;
        if (this.downKey.isDown) this.player.y += 5;
        if (this.leftKey.isDown) this.player.x -= 5;
        if (this.rightKey.isDown) this.player.x += 5;
        if (this.upKey.isDown || this.downKey.isDown || this.leftKey.isDown || this.rightKey.isDown) {
            this.stepsSinceLastSound++;
        }
        if (this.stepsSinceLastSound >= 50) {
            const sound: string = Math.random() < 0.5 ? "grass_step_01" : "grass_step_02";
            this.sound.add(sound).play();
            this.stepsSinceLastSound = 0;
        }
    }
}
