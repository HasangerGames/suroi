/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import Phaser from "phaser";

import core from "../core";
import { type Game } from "../game";
import { type MenuScene } from "./menuScene";
import { InputPacket } from "../packets/sending/inputPacket";
import { Player } from "../objects/player";
import gsap from "gsap";
import Vector2 = Phaser.Math.Vector2;

export class GameScene extends Phaser.Scene {
    activeGame: Game;

    constructor() {
        super("game");
    }

    preload(): void {
        if (core.game === undefined) return;
        this.activeGame = core.game;

        // for (const object of Obstacles) {
        //     this.load.svg(object.idString, require(`../../assets/img/map/${object.imageName}`));
        // }

        this.load.audio("swing", require("../../assets/audio/sfx/swing.mp3"));
        this.load.audio("grass_step_01", require("../../assets/audio/sfx/footsteps/grass_01.mp3"));
        this.load.audio("grass_step_02", require("../../assets/audio/sfx/footsteps/grass_02.mp3"));

        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (this.player === undefined) return;
            this.player.rotation = Math.atan2(pointer.worldY - this.player.container.y, pointer.worldX - this.player.container.x);
            // this.player.container.setRotation(angle);
            this.player.inputsDirty = true;
        });

        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown() && !this.player.punching) {
                this.player.punching = true;
                const altFist: boolean = Math.random() < 0.5;
                gsap.to(altFist ? this.player.leftFist : this.player.rightFist, {
                    x: 75,
                    y: altFist ? 10 : -10,
                    duration: 0.11,
                    repeat: 1,
                    yoyo: true,
                    ease: "none",
                    onComplete: () => { this.player.punching = false; }
                });
                this.sound.add("swing").play();
            }
        });

        this.addKey("W", "movingUp");
        this.addKey("S", "movingDown");
        this.addKey("A", "movingLeft");
        this.addKey("D", "movingRight");

        this.cameras.main.setZoom(this.sys.game.canvas.width / 2560);
    }

    private addKey(keyString: string, valueToToggle: string): void {
        const key: Phaser.Input.Keyboard.Key | undefined = this.input.keyboard?.addKey(keyString);
        if (key !== undefined) {
            key.on("down", () => {
                this.player[valueToToggle] = true;
                this.player.inputsDirty = true;
            });
            key.on("up", () => {
                this.player[valueToToggle] = false;
                this.player.inputsDirty = true;
            });
        }
    }

    get player(): Player {
        return this.activeGame.activePlayer;
    }

    create(): void {
        (this.scene.get("menu") as MenuScene).stopMusic();

        // Draw grid
        const GRID_WIDTH = 7200;
        const GRID_HEIGHT = 7200;
        const CELL_SIZE = 160;
        for (let x = 0; x <= GRID_WIDTH; x += CELL_SIZE) {
            this.add.line(x, 0, x, 0, x, GRID_HEIGHT * 2, 0x000000, 0.25).setOrigin(0, 0);
        }
        for (let y = 0; y <= GRID_HEIGHT; y += CELL_SIZE) {
            this.add.line(0, y, 0, y, GRID_WIDTH * 2, y, 0x000000, 0.25).setOrigin(0, 0);
        }

        // Create the player
        this.activeGame.activePlayer = new Player(this, this.activeGame, "Player", this.activeGame.socket, new Vector2(0, 0));

        // Follow the player w/ the camera
        this.cameras.main.startFollow(this.player.container);

        // Start the tick loop
        this.tick();
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    update(): void {}

    tick(): void {
        if (this.player?.inputsDirty) {
            this.player.inputsDirty = false;
            this.activeGame.sendPacket(new InputPacket(this.player));
            /* const sound: string = Math.random() < 0.5 ? "grass_step_01" : "grass_step_02";
            this.sound.add(sound).play();
            this.stepsSinceLastSound = 0; */
        }
        setTimeout(() => { this.tick(); }, 30);
    }
}
