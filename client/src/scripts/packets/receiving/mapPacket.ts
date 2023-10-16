import { Container, Graphics, isMobile, RenderTexture, Text } from "pixi.js";
import { GRID_SIZE, ObjectCategory, ZIndexes } from "../../../../../common/src/constants";
import { type BuildingDefinition } from "../../../../../common/src/definitions/buildings";
import { type ObstacleDefinition, RotationMode } from "../../../../../common/src/definitions/obstacles";
import { CircleHitbox, RectangleHitbox } from "../../../../../common/src/utils/hitbox";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";
import { COLORS, PIXI_SCALE } from "../../utils/constants";
import { SuroiSprite } from "../../utils/pixi";

export class MapPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const game = this.game;
        const map = game.map;

        const width = map.width = stream.readUint16();
        const height = map.height = stream.readUint16();

        const oceanPadding = map.oceanPadding;

        const graphics = new Graphics();
        const mapGraphics = new Graphics();
        const mapRender = new Container();
        mapRender.interactiveChildren = false;

        graphics.beginFill();
        graphics.fill.color = COLORS.beach.toNumber();
        graphics.drawRect(0, 0, width * PIXI_SCALE, height * PIXI_SCALE);
        graphics.fill.color = COLORS.grass.toNumber();
        graphics.drawRect(GRID_SIZE * PIXI_SCALE, GRID_SIZE * PIXI_SCALE, (width - GRID_SIZE * 2) * PIXI_SCALE, (height - GRID_SIZE * 2) * PIXI_SCALE);
        graphics.zIndex = ZIndexes.Ground;

        mapGraphics.beginFill();
        mapGraphics.fill.color = COLORS.water.toNumber();
        mapGraphics.drawRect(-oceanPadding, -oceanPadding, width + oceanPadding * 2, height + oceanPadding * 2);
        mapGraphics.fill.color = COLORS.beach.toNumber();
        mapGraphics.drawRect(0, 0, width, height);
        mapGraphics.fill.color = COLORS.grass.toNumber();
        mapGraphics.drawRect(GRID_SIZE, GRID_SIZE, width - GRID_SIZE * 2, height - GRID_SIZE * 2);

        graphics.lineStyle({
            color: 0x000000,
            alpha: 0.25,
            width: 2
        });
        mapGraphics.lineStyle({
            color: 0x000000,
            alpha: 0.25,
            width: 2
        });

        for (let x = 0; x <= width; x += GRID_SIZE) {
            graphics.moveTo(x * PIXI_SCALE, 0);
            graphics.lineTo(x * PIXI_SCALE, height * PIXI_SCALE);

            mapGraphics.moveTo(x, 0);
            mapGraphics.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += GRID_SIZE) {
            graphics.moveTo(0, y * PIXI_SCALE);
            graphics.lineTo(width * PIXI_SCALE, y * PIXI_SCALE);

            mapGraphics.moveTo(0, y);
            mapGraphics.lineTo(width, y);
        }

        graphics.endFill();
        mapGraphics.endFill();
        // reset the line style
        graphics.lineStyle();
        mapGraphics.lineStyle();

        game.camera.container.addChild(graphics);

        mapRender.position.set(oceanPadding);
        mapRender.addChild(mapGraphics);

        const renderTexture = RenderTexture.create({
            width: width + oceanPadding * 2,
            height: height + oceanPadding * 2,
            resolution: isMobile.any ? 1 : 2
        });

        const numObstacles = stream.readBits(11);

        for (let i = 0; i < numObstacles; i++) {
            const type = stream.readObjectType();

            const position = stream.readPosition();

            switch (type.category) {
                case ObjectCategory.Obstacle: {
                    const scale = stream.readScale();
                    const definition = type.definition as ObstacleDefinition;
                    const rotation = stream.readObstacleRotation(definition.rotationMode).rotation;

                    const hasVariations = definition.variations !== undefined;

                    let textureId = type.idString;

                    let variation = 0;
                    if (hasVariations) {
                        variation = stream.readVariation();
                        textureId += `_${variation + 1}`;
                    }
                    // Create the object image
                    const image = new SuroiSprite(`${textureId}`);
                    image.setVPos(position).setRotation(rotation);
                    image.scale.set(scale * (1 / PIXI_SCALE));

                    mapRender.addChild(image);
                    break;
                }
                case ObjectCategory.Building: {
                    const { rotation, orientation } = stream.readObstacleRotation(RotationMode.Limited);

                    const definition = type.definition as BuildingDefinition;

                    const container = new Container();
                    container.position.copyFrom(position);
                    container.rotation = rotation;

                    for (const image of definition.floorImages) {
                        const sprite = new SuroiSprite(image.key);
                        sprite.setVPos(image.position);
                        sprite.scale.set(1 / PIXI_SCALE);
                        container.addChild(sprite);
                    }

                    for (const image of definition.ceilingImages) {
                        const sprite = new SuroiSprite(image.key);
                        sprite.setVPos(image.position);
                        sprite.scale.set(1 / PIXI_SCALE);
                        container.addChild(sprite);
                    }

                    if (definition.groundGraphics) {
                        for (const ground of definition.groundGraphics) {
                            graphics.beginFill(ground.color);
                            mapGraphics.beginFill(ground.color);
                            const hitbox = ground.bounds.transform(position, 1, orientation);
                            if (hitbox instanceof RectangleHitbox) {
                                const width = hitbox.max.x - hitbox.min.x;
                                const height = hitbox.max.y - hitbox.min.y;
                                graphics.drawRect(hitbox.min.x * PIXI_SCALE, hitbox.min.y * PIXI_SCALE, width * PIXI_SCALE, height * PIXI_SCALE);
                                mapGraphics.drawRect(hitbox.min.x, hitbox.min.y, width, height);
                            } else if (hitbox instanceof CircleHitbox) {
                                graphics.arc(hitbox.position.x * PIXI_SCALE, hitbox.position.y * PIXI_SCALE, hitbox.radius * PIXI_SCALE, 0, Math.PI * 2);
                                mapGraphics.arc(hitbox.position.x, hitbox.position.y, hitbox.radius, 0, Math.PI * 2);
                            }
                            graphics.endFill();
                            mapGraphics.endFill();
                        }
                    }

                    mapRender.addChild(container);

                    break;
                }
            }
        }
        game.pixi.renderer.render(mapRender, {
            renderTexture
        });
        map.sprite.texture = renderTexture;
        mapRender.destroy({
            children: true,
            texture: false
        });

        map.placesContainer.removeChildren();
        const placesSize = stream.readBits(4);
        for (let i = 0; i < placesSize; i++) {
            const name = stream.readASCIIString(24);
            const position = stream.readPosition();

            const text = new Text(name, {
                fill: "white",
                fontFamily: "Inter, sans-serif",
                fontWeight: "600",
                stroke: "black",
                strokeThickness: 2,
                fontSize: 18,
                dropShadow: true,
                dropShadowAlpha: 0.8,
                dropShadowColor: "black",
                dropShadowBlur: 2
            });
            text.alpha = 0.7;
            text.anchor.set(0.5);
            text.position.copyFrom(position);
            map.placesContainer.addChild(text);
        }
        map.resize();
    }
}
