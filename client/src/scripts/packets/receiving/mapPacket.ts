import { ReceivingPacket } from "../../types/receivingPacket";
import type { MinimapScene } from "../../scenes/minimapScene";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import type { ObstacleDefinition } from "../../../../../common/src/definitions/obstacles";

export class MapPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const numObstacles = stream.readBits(10);
        for (let i = 0; i < numObstacles; i++) {
            const type = stream.readObjectType();

            const position = stream.readPosition();
            const scale = stream.readScale();

            const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
            const rotation = stream.readObstacleRotation(definition.rotationMode);

            const hasVariations = definition.variations !== undefined;
            let texture = type.idString;
            let variation = 0;
            if (hasVariations) {
                variation = stream.readVariation();
                texture += `_${variation + 1}`;
            }

            // Create the obstacle image
            const minimap = this.playerManager.game.activePlayer.scene.scene.get("minimap") as MinimapScene;
            minimap.renderTexture.draw(minimap.make.image({
                x: position.x * minimap.mapScale,
                y: position.y * minimap.mapScale,
                key: "main",
                frame: `${texture}.svg`,
                add: false
            }).setRotation(rotation)
                .setScale(scale / (20 / minimap.mapScale))
                .setDepth(definition.depth ?? 0));
        }
    }
}
