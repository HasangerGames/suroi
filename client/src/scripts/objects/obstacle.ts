import { GameObject } from "../types/gameObject";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Variation } from "../../../../common/src/typings";
import { type ObstacleDefinition } from "../../../../common/src/definitions/obstacles";

export class Obstacle extends GameObject {
    scale: number;
    destroyed: boolean;

    variation: Variation;
    image: Phaser.GameObjects.Image;

    deserializePartial(stream: SuroiBitStream): void {
        this.scale = stream.readScale();
        if (this.image !== undefined) this.image.setScale(this.scale);
        const destroyed: boolean = stream.readBoolean();
        if (!this.destroyed && destroyed) {
            this.image.setTexture("");
        }
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
