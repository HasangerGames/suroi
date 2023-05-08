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
import Phaser from "phaser";

export class UpdatePacket extends ReceivingPacket {
    public constructor(player: Player) {
        super(player);
    }

    deserialize(stream: SuroiBitStream): void {
        const p: Player = this.player;
        if (p === undefined) return;
        p.position = stream.readVector(0, 0, 1024, 1024, 16);
        p.serverData.rotation = stream.readUnitVector(8);

        p.scene.tweens.add({
            targets: p.container,
            x: p.position.x * 20,
            y: p.position.y * 20,
            duration: 30
        });

        const angleBetween: number = Phaser.Math.Angle.ShortestBetween(p.container.angle, Phaser.Math.RadToDeg(Math.atan2(p.serverData.rotation.y, p.serverData.rotation.x)));
        console.log(p.container.angle + angleBetween);

        p.scene.tweens.add({
            targets: p.container,
            angle: p.container.angle + angleBetween,
            duration: 30
        });
    }
}
