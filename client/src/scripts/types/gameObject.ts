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

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import Vector2 = Phaser.Math.Vector2;
import { type Vector } from "../../../../common/src/utils/vector";

export abstract class GameObject {
    id: number;
    type: ObjectType;

    game: Game;

    position: Vector;
    rotation: Vector;

    protected constructor(game: Game, type: ObjectType, position: Vector2) {
        this.game = game;
        this.type = type;
        this.position = position;
    }

    abstract deserializePartial(stream: SuroiBitStream): void;
    abstract deserializeFull(stream: SuroiBitStream): void;
}
