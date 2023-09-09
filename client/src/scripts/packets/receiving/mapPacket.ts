import { ReceivingPacket } from "../../types/receivingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { COLORS, PIXI_SCALE } from "../../utils/constants";
import { Container, Graphics, RenderTexture } from "pixi.js";
import { ObjectCategory } from "../../../../../common/src/constants";
import { type ObstacleDefinition } from "../../../../../common/src/definitions/obstacles";
import { type BuildingDefinition } from "../../../../../common/src/definitions/buildings";
import { vAdd, vRotate } from "../../../../../common/src/utils/vector";
import { SuroiSprite } from "../../utils/pixi";

export class MapPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const game = this.playerManager.game;
        const map = game.map;

        const width = map.width = stream.readUint16();
        const height = map.height = stream.readUint16();

        const cellSize = 16;
        const oceanPadding = map.oceanPadding;

        const graphics = new Graphics();
        const mapGraphics = new Graphics();
        const mapRender = new Container();
        mapRender.interactiveChildren = false;

        graphics.beginFill();
        graphics.fill.color = COLORS.beach.toNumber();
        graphics.drawRect(0, 0, width, height);
        graphics.fill.color = COLORS.grass.toNumber();
        graphics.drawRect(cellSize, cellSize, width - cellSize * 2, height - cellSize * 2);
        graphics.zIndex = -10;

        mapGraphics.beginFill();
        mapGraphics.fill.color = COLORS.water.toNumber();
        mapGraphics.drawRect(-oceanPadding, -oceanPadding, width + oceanPadding * 2, height + oceanPadding * 2);
        mapGraphics.fill.color = COLORS.beach.toNumber();
        mapGraphics.drawRect(0, 0, width, height);
        mapGraphics.fill.color = COLORS.grass.toNumber();
        mapGraphics.drawRect(cellSize, cellSize, width - cellSize * 2, height - cellSize * 2);

        graphics.lineStyle({
            color: 0x000000,
            alpha: 0.25,
            width: 2 / PIXI_SCALE
        });
        mapGraphics.lineStyle({
            color: 0x000000,
            alpha: 0.5,
            width: 1.5
        });
        graphics.scale.set(PIXI_SCALE);

        for (let x = 0; x <= width; x += cellSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, height);

            mapGraphics.moveTo(x, 0);
            mapGraphics.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += cellSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);

            mapGraphics.moveTo(0, y);
            mapGraphics.lineTo(width, y);
        }

        graphics.endFill();

        game.camera.container.addChild(graphics);

        mapRender.position.set(oceanPadding);
        mapRender.addChild(mapGraphics);

        const renderTexture = RenderTexture.create({
            width: width + oceanPadding * 2,
            height: height + oceanPadding * 2,
            resolution: window.devicePixelRatio * 2
        });

        const numObstacles = stream.readBits(10);

        for (let i = 0; i < numObstacles; i++) {
            const type = stream.readObjectType();

            let position = stream.readPosition();

            let rotation = 0;
            let scale = 1;

            let textureId = type.idString;

            switch (type.category) {
                case ObjectCategory.Obstacle: {
                    scale = stream.readScale();
                    const definition = type.definition as ObstacleDefinition;
                    rotation = stream.readObstacleRotation(definition.rotationMode).rotation;

                    const hasVariations = definition.variations !== undefined;
                    let variation = 0;
                    if (hasVariations) {
                        variation = stream.readVariation();
                        textureId += `_${variation + 1}`;
                    }
                    break;
                }
                case ObjectCategory.Building: {
                    textureId += "_ceiling";
                    rotation = stream.readObstacleRotation("limited").rotation;

                    const definition = type.definition as BuildingDefinition;

                    const floorPos = vAdd(position, vRotate(definition.floorImagePos, rotation));

                    const floorImage = new SuroiSprite(`${type.idString}_floor.svg`);

                    floorImage.setVPos(floorPos).setRotation(rotation);
                    floorImage.scale.set(1 / PIXI_SCALE);
                    mapRender.addChild(floorImage);

                    position = vAdd(position, vRotate(definition.ceilingImagePos, rotation));
                    break;
                }
            }

            // Create the object image
            const image = new SuroiSprite(`${textureId}.svg`);
            image.setVPos(position).setRotation(rotation);
            image.scale.set(scale * (1 / PIXI_SCALE));

            mapRender.addChild(image);
        }
        game.pixi.renderer.render(mapRender, {
            renderTexture
        });
        map.sprite.texture = renderTexture;
        mapRender.destroy({
            children: true,
            texture: false
        });
    }
}
