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

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type Vector } from "../../../common/src/utils/vector";
import { type Hitbox } from "../../../common/src/utils/hitbox";

export abstract class GameObject {
    id: number;
    type: ObjectType;

    game: Game;

    _position: Vector;
    _rotation: number;
    scale = 1;
    hitbox?: Hitbox;

    protected constructor(game: Game, type: ObjectType, position: Vector) {
        this.id = game.nextObjectId;
        this.game = game;
        this.type = type;
        this._position = position;
    }

    get position(): Vector {
        return this._position;
    }

    set position(position: Vector) {
        this._position = position;
    }

    get rotation(): number {
        return this._rotation;
    }

    set rotation(rotation: number) {
        this._rotation = rotation;
    }

    serializePartial(stream: SuroiBitStream): void {
        stream.writeObjectType(this.type);
        stream.writeUint16(this.id);
    }

    abstract serializeFull(stream: SuroiBitStream): void;
}
