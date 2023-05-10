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

import { GameObject } from "../types/gameObject";
import { type Game } from "../game";
import Phaser from "phaser";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type GameScene } from "../scenes/gameScene";
import Vector2 = Phaser.Math.Vector2;
import { ObjectCategory } from "../../../../common/src/utils/constants";
import { ObjectType } from "../../../../common/src/utils/objectType";

export class Player extends GameObject {
    name: string;

    serverData: { rotation: number };

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
        this.serverData = { rotation: 0 };
        this.body = scene.add.circle(0, 0, 48, 0xffdbac);
        this.leftFist = scene.add.circle(38, 35, 15, 0xffdbac).setStrokeStyle(5, 0x553000);
        this.rightFist = scene.add.circle(38, -35, 15, 0xffdbac).setStrokeStyle(5, 0x553000);
        this.container = scene.add.container(position.x, position.y, [this.body, this.leftFist, this.rightFist]);
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
}
