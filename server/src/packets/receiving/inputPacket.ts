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

import { ReceivingPacket } from "../../types/receivingPacket";
import { type Player } from "../../objects/player";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";

export class InputPacket extends ReceivingPacket {
    deserialize(stream: SuroiBitStream): void {
        const p: Player = this.player;
        p.movingUp = stream.readBoolean();
        p.movingDown = stream.readBoolean();
        p.movingLeft = stream.readBoolean();
        p.movingRight = stream.readBoolean();
        stream.readBoolean(); // Punching
        p.rotation = stream.readRotation();
    }
}
