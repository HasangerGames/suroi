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

import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";

export class JoinedPacket extends SendingPacket {
    constructor(player: Player) {
        super(player);
        this.type = PacketType.Joined;
        this.allocBytes = 1;
    }

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
    }
}
