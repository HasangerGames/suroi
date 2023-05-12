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
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Variation } from "../../../../common/src/typings";
import { type ObstacleDefinition } from "../../../../common/src/definitions/obstacles";

export class Obstacle extends GameObject {
    scale: number;
    variation: Variation;
    image: Phaser.GameObjects.Image;

    deserializePartial(stream: SuroiBitStream): void {
        this.scale = stream.readScale();
        if (this.image !== undefined) this.image.setScale(this.scale);
    }

    deserializeFull(stream: SuroiBitStream): void {
        if (this.image !== undefined) throw new Error("Full update of existing obstacle");
        this.position = stream.readPosition();
        const definition: ObstacleDefinition = this.type.definition as ObstacleDefinition;
        this.rotation = definition.rotation === "full" ? stream.readRotation() : 0;
        this.variation = stream.readVariation();
        this.image = this.scene.add.image(this.position.x * 20, this.position.y * 20, `${this.type.idString}_${this.variation}`)
            .setRotation(this.rotation)
            .setScale(this.scale)
            .setDepth(definition.depth ?? 0);
    }

    destroy(): void {
        this.image.destroy(true);
    }
}
