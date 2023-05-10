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
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";
import gsap from "gsap";

export class UpdatePacket extends ReceivingPacket {
    public constructor(player: Player) {
        super(player);
    }

    deserialize(stream: SuroiBitStream): void {
        const p: Player = this.player;
        if (p === undefined) return;
        p.position = stream.readPositionVector();
        p.serverData.rotation = stream.readRotation(8);
        const oldAngle: number = p.container.angle;
        const angleBetween: number = Phaser.Math.Angle.ShortestBetween(oldAngle, Phaser.Math.RadToDeg(p.serverData.rotation));
        gsap.to(p.container, {
            x: p.position.x * 20,
            y: p.position.y * 20,
            angle: oldAngle + angleBetween,
            ease: "none",
            duration: 0.03
        });
    }
}
