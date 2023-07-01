import { ReceivingPacket } from "../../types/receivingPacket";
import type { MinimapScene } from "../../scenes/minimapScene";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import type { ObstacleDefinition } from "../../../../../common/src/definitions/obstacles";
import { MINIMAP_SCALE } from "../../utils/constants";

export class MapPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const minimap = this.playerManager.game.activePlayer.scene.scene.get("minimap") as MinimapScene;
        minimap.renderTexture.beginDraw();

        // Draw the grid
        /*const GRID_WIDTH = 720 * MINIMAP_SCALE;
        const GRID_HEIGHT = 720 * MINIMAP_SCALE;
        const CELL_SIZE = 16 * MINIMAP_SCALE;

        const graphics = minimap.make.graphics();
        graphics.fillStyle(0x000000, 0.35);

        for (let x = 0; x <= GRID_WIDTH; x += CELL_SIZE) {
            graphics.fillRect(x, 0, MINIMAP_SCALE, GRID_HEIGHT);
        }
        for (let y = 0; y <= GRID_HEIGHT; y += CELL_SIZE) {
            graphics.fillRect(0, y, GRID_WIDTH, MINIMAP_SCALE);
        }
        minimap.renderTexture.batchDraw(graphics, 0, 0);*/

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
            minimap.renderTexture.batchDraw(minimap.make.image({
                x: position.x * MINIMAP_SCALE,
                y: position.y * MINIMAP_SCALE,
                key: "main",
                frame: `${texture}.svg`,
                add: false,
                scale: scale / (20 / MINIMAP_SCALE),
                rotation,
                depth: definition.depth ?? 1
            }));
        }
        minimap.renderTexture.endDraw();
    }
}
