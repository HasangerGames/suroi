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

import type { WebSocket } from "uWebSockets.js";

import { GameObject } from "./gameObject";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";

export class Player extends GameObject {
    direction: Vector;

    private readonly _health = 100;
    healthDirty = true;

    private readonly _adrenaline = 100;
    adrenalineDirty = true;

    socket: WebSocket<Player>;

    get health(): number {
        return this._health;
    }

    get adrenaline(): number {
        return this._adrenaline;
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    deserializePartial(stream: SuroiBitStream): void {}

    deserializeFull(stream: SuroiBitStream): void {}

    serializePartial(stream: SuroiBitStream): void {}

    serializeFull(stream: SuroiBitStream): void {}
}
