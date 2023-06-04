import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type ObstacleDefinition } from "../../../../../common/src/definitions/obstacles";
import { type Vector } from "matter";
import { type MinimapScene } from "../../scenes/minimapScene";

export class MapPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const numObstacles: number = stream.readUint16();
        for (let i = 0; i < numObstacles; i++) {
            const type = stream.readObjectType();

            const position: Vector = stream.readPosition();
            const scale: number = stream.readScale();

            const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
            const rotation: number = definition.rotation !== "none" ? stream.readRotation(8) : 0;

            const hasVariations: boolean = definition.variations !== undefined;
            let texture: string = type.idString;
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
