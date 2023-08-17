import { ReceivingPacket } from "../../types/receivingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import type { ObstacleDefinition } from "../../../../../common/src/definitions/obstacles";
import { ObjectCategory } from "../../../../../common/src/constants";
import { GRASS_COLOR, MINIMAP_SCALE, PIXI_SCALE } from "../../utils/constants";
import { type BuildingDefinition } from "../../../../../common/src/definitions/buildings";
import { vAdd, vRotate } from "../../../../../common/src/utils/vector";
import { type Orientation } from "../../../../../common/src/typings";
import { Graphics, Rectangle } from "pixi.js";

export class MapPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const game = this.playerManager.game;

        game.width = stream.readUint16();
        game.height = stream.readUint16();

        const GRID_WIDTH = game.width * PIXI_SCALE;
        const GRID_HEIGHT = game.height * PIXI_SCALE;
        const CELL_SIZE = 320;

        const graphics = new Graphics();

        graphics.beginFill();
        graphics.fill.color = 0xb99c61;
        graphics.drawRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
        graphics.fill.color = GRASS_COLOR;
        graphics.drawRect(CELL_SIZE, CELL_SIZE, GRID_WIDTH - CELL_SIZE * 2, GRID_HEIGHT - CELL_SIZE * 2);
        graphics.lineStyle({
            color: 0x000000,
            alpha: 0.25,
            width: 2
        });
        graphics.zIndex = -10;

        for (let x = 0; x <= GRID_WIDTH; x += CELL_SIZE) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, GRID_HEIGHT);
        }
        for (let y = 0; y <= GRID_HEIGHT; y += CELL_SIZE) {
            graphics.moveTo(0, y);
            graphics.lineTo(GRID_WIDTH, y);
        }

        graphics.endFill();

        game.camera.container.addChild(graphics);

        // Draw the grid
        /*const CELL_SIZE = 16 * MINIMAP_SCALE;
        for (let x = 0; x <= MINIMAP_GRID_WIDTH; x += CELL_SIZE) {
            minimap.add.rectangle(x, 0, MINIMAP_SCALE, MINIMAP_GRID_HEIGHT, 0x000000, 0.35).setOrigin(0, 0).setDepth(-1);
        }
        for (let y = 0; y <= MINIMAP_GRID_HEIGHT; y += CELL_SIZE) {
            minimap.add.rectangle(0, y, MINIMAP_GRID_WIDTH, MINIMAP_SCALE, 0x000000, 0.35).setOrigin(0, 0).setDepth(-1);
        }

        minimap.renderTexture.beginDraw();

        // Draw the grid
        // This method isn't used because it makes the grid look really bad on mobile
        const graphics = minimap.make.graphics();
        graphics.fillStyle(0x000000, 0.35);

        const CELL_SIZE = 16 * MINIMAP_SCALE;
        for (let x = 0; x <= MINIMAP_GRID_WIDTH; x += CELL_SIZE) {
            graphics.fillRect(x, 0, MINIMAP_SCALE, MINIMAP_GRID_HEIGHT);
        }
        for (let y = 0; y <= MINIMAP_GRID_HEIGHT; y += CELL_SIZE) {
            graphics.fillRect(0, y, MINIMAP_GRID_WIDTH, MINIMAP_SCALE);
        }
        minimap.renderTexture.batchDraw(graphics, 0, 0);

        const numObstacles = stream.readBits(10);

        for (let i = 0; i < numObstacles; i++) {
            const type = stream.readObjectType();

            let position = stream.readPosition();

            let rotation = 0;
            let scale = 1;

            let texture = type.idString;

            let atlas = "main";

            switch (type.category) {
                case ObjectCategory.Obstacle: {
                    scale = stream.readScale();
                    const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
                    rotation = stream.readObstacleRotation(definition.rotationMode).rotation;

                    const hasVariations = definition.variations !== undefined;
                    let variation = 0;
                    if (hasVariations) {
                        variation = stream.readVariation();
                        texture += `_${variation + 1}`;
                    }
                    break;
                }
                case ObjectCategory.Building: {
                    texture += "_ceiling";
                    rotation = stream.readObstacleRotation("limited").rotation;

                    const definition = type.definition as BuildingDefinition;

                    const floorPos = vAdd(position, vRotate(definition.floorImagePos, rotation));

                    atlas = "buildings";

                    minimap.renderTexture.batchDraw(minimap.make.image({
                        x: floorPos.x * MINIMAP_SCALE,
                        y: floorPos.y * MINIMAP_SCALE,
                        key: atlas,
                        frame: `${type.idString}_floor.svg`,
                        add: false,
                        scale: scale / (20 / MINIMAP_SCALE),
                        rotation
                    }));

                    position = vAdd(position, vRotate(definition.ceilingImagePos, rotation));
                    break;
                }
            }

            // Create the object image
            minimap.renderTexture.batchDraw(minimap.make.image({
                x: position.x * MINIMAP_SCALE,
                y: position.y * MINIMAP_SCALE,
                key: atlas,
                frame: `${texture}.svg`,
                add: false,
                scale: scale / (20 / MINIMAP_SCALE),
                rotation
            }));
        }
        minimap.renderTexture.endDraw();*/
    }
}
