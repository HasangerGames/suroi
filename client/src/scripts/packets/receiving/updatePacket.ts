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
import { Obstacle } from "../../objects/obstacle";
import { v2v } from "../../utils";
import Vector2 = Phaser.Math.Vector2;
import { type ObjectType } from "../../../../../common/src/utils/objectType";
import { type ObstacleDefinition } from "../../../../../common/src/definitions/obstacles";
import { type Variation } from "../../../../../common/src/typings";

export class UpdatePacket extends ReceivingPacket {
    public constructor(player: Player) {
        super(player);
    }

    deserialize(stream: SuroiBitStream): void {
        const p: Player = this.player;
        if (p === undefined) return;

        // Update position and rotation
        const oldX: number = p.position.x;
        const oldY: number = p.position.y;
        p.position = stream.readPosition();
        const oldAngle: number = p.container.angle;
        const newAngle: number = Phaser.Math.RadToDeg(stream.readRotation());
        const angleBetween: number = Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);
        gsap.to(p.container, {
            x: p.position.x * 20,
            y: p.position.y * 20,
            angle: oldAngle + angleBetween,
            ease: "none",
            duration: 0.03
        });

        // Play footstep sounds
        p.distSinceLastFootstep += Phaser.Math.Distance.Between(oldX, oldY, p.position.x, p.position.y);
        if (p.distSinceLastFootstep > 10) {
            const sound: string = Math.random() < 0.5 ? "grass_step_01" : "grass_step_02";
            p.scene.sound.add(sound).play();
            p.distSinceLastFootstep = 0;
        }

        // Full objects
        if (stream.readBoolean()) {
            const fullObjectCount: number = stream.readUint16();
            for (let i = 0; i < fullObjectCount; i++) {
                const type: ObjectType = stream.readObjectType();
                if (type.category === 0) continue;
                const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
                const id: number = stream.readUint16();
                const scale: number = stream.readScale();
                const position: Vector2 = v2v(stream.readPosition());
                const rotation: number = definition.rotation === "full" ? stream.readRotation() : 0;
                // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                const variation: Variation = definition.variations !== undefined ? stream.readVariation() : 0;
                // eslint-disable-next-line no-new
                new Obstacle(this.player.scene, this.player.game, type, id, position, rotation, scale, variation);
            }
        }
    }
}
