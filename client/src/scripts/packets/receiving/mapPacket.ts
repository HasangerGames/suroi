import { ReceivingPacket } from "../../types/receivingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { COLORS, MINIMAP_SCALE, PIXI_SCALE } from "../../utils/constants";
import { Graphics } from "pixi.js";
import { ObjectCategory } from "../../../../../common/src/constants";
import { type ObstacleDefinition } from "../../../../../common/src/definitions/obstacles";
import { type BuildingDefinition } from "../../../../../common/src/definitions/buildings";
import { vAdd, vRotate } from "../../../../../common/src/utils/vector";
import { SuroiSprite, toPixiCoords } from "../../utils/pixi";

export class MapPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const game = this.playerManager.game;

        const width = game.map.width = stream.readUint16();
        const height = game.map.height = stream.readUint16();

        const GRID_WIDTH = width * PIXI_SCALE;
        const GRID_HEIGHT = height * PIXI_SCALE;
        const CELL_SIZE = 320;

        const graphics = new Graphics();
        const minimapTexture = new Graphics();

        graphics.beginFill();
        graphics.fill.color = COLORS.beach.toNumber();
        graphics.drawRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
        graphics.fill.color = COLORS.grass.toNumber();
        graphics.drawRect(CELL_SIZE, CELL_SIZE, GRID_WIDTH - CELL_SIZE * 2, GRID_HEIGHT - CELL_SIZE * 2);
        graphics.zIndex = -10;

        minimapTexture.beginFill();
        minimapTexture.fill.color = COLORS.beach.toNumber();
        minimapTexture.drawRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
        minimapTexture.fill.color = COLORS.grass.toNumber();
        minimapTexture.drawRect(CELL_SIZE, CELL_SIZE, GRID_WIDTH - CELL_SIZE * 2, GRID_HEIGHT - CELL_SIZE * 2);

        graphics.lineStyle({
            color: 0x000000,
            alpha: 0.25,
            width: 2
        });
        minimapTexture.lineStyle({
            color: 0x000000,
            alpha: 0.5,
            width: 16
        });

        for (let x = 0; x <= GRID_WIDTH; x += CELL_SIZE) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, GRID_HEIGHT);

            minimapTexture.moveTo(x, 0);
            minimapTexture.lineTo(x, GRID_HEIGHT);
        }
        for (let y = 0; y <= GRID_HEIGHT; y += CELL_SIZE) {
            graphics.moveTo(0, y);
            graphics.lineTo(GRID_WIDTH, y);

            minimapTexture.moveTo(0, y);
            minimapTexture.lineTo(GRID_WIDTH, y);
        }

        graphics.endFill();

        game.camera.container.addChild(graphics);

        minimapTexture.scale.set(MINIMAP_SCALE / PIXI_SCALE);

        game.map.objectsContainer.removeChildren();
        game.map.objectsContainer.addChild(minimapTexture);

        const numObstacles = stream.readBits(10);

        for (let i = 0; i < numObstacles; i++) {
            const type = stream.readObjectType();

            let position = stream.readPosition();

            let rotation = 0;
            let scale = 1;

            let texture = type.idString;

            switch (type.category) {
                case ObjectCategory.Obstacle: {
                    scale = stream.readScale();
                    const definition = type.definition as ObstacleDefinition;
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

                    const floorImage = new SuroiSprite(`${type.idString}_floor.svg`);

                    floorImage.setVPos(toPixiCoords(floorPos)).setRotation(rotation);

                    minimapTexture.addChild(floorImage);

                    position = vAdd(position, vRotate(definition.ceilingImagePos, rotation));
                    break;
                }
            }

            // Create the object image
            const image = new SuroiSprite(`${texture}.svg`);
            image.setVPos(toPixiCoords(position)).setRotation(rotation);
            image.scale.set(scale);

            minimapTexture.addChild(image);

            game.map.objectsContainer.addChild(game.map.indicator);
        }
    }
}
