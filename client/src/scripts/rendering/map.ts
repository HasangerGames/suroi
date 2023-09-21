import { Container, Graphics, LINE_CAP, RenderTexture, Sprite, Text, Texture, isMobile } from "pixi.js";
import '@pixi/graphics-extras';
import { type Game } from "../game";
import { localStorageInstance } from "../utils/localStorageHandler";
import { type Vector, v, vClone, vMul } from "../../../../common/src/utils/vector";
import { SuroiSprite } from "../utils/pixi";
import { Gas } from "./gas";
import { GRID_SIZE, GasState } from "../../../../common/src/constants";
import { type MapPacket } from "../packets/receiving/mapPacket";
import { COLORS, PIXI_SCALE } from "../utils/constants";
import { CircleHitbox, RectangleHitbox } from "../../../../common/src/utils/hitbox";
import { addAdjust } from "../../../../common/src/utils/math";
import { SeededRandom } from "../../../../common/src/utils/random";
import { jaggedRectangle } from "../../../../common/src/utils/mapUtils";

export class Minimap {
    container = new Container();

    game: Game;

    expanded = false;

    visible = true;

    mask = new Graphics();

    position = v(0, 0);
    lastPosition = v(0, 0);

    // used for the gas to player line and circle
    gasPos = v(0, 0);
    gasRadius = 0;
    gasGraphics = new Graphics();

    objectsContainer = new Container();

    sprite = new Sprite(Texture.EMPTY);

    indicator = new SuroiSprite("player_indicator.svg");

    width = 0;
    height = 0;

    minimapWidth = 0;
    minimapHeight = 0;

    margins = v(0, 0);

    gas = new Gas(1, this.objectsContainer);

    placesContainer = new Container();

    constructor(game: Game) {
        this.game = game;
        game.pixi.stage.addChild(this.container);

        this.objectsContainer.mask = this.mask;

        this.container.addChild(this.objectsContainer);

        window.addEventListener("resize", this.resize.bind(this));
        this.resize();

        if (localStorageInstance.config.minimapMinimized) this.toggleMiniMap();

        this.indicator.scale.set(0.1);

        this.objectsContainer.addChild(this.sprite, this.placesContainer, this.gas.graphics, this.gasGraphics, this.indicator).sortChildren();

        $("#minimap-border").on("click", (e) => {
            if (isMobile.any) {
                this.switchToBigMap();
                e.stopImmediatePropagation();
            }
        });

        $("#btn-close-minimap").on("pointerdown", (e) => {
            this.switchToSmallMap();
            e.stopImmediatePropagation();
        });
    }

    updateFromPacket(mapPacket: MapPacket): void {
        const seed = mapPacket.seed;
        const width = this.width = mapPacket.width;
        const height = this.height = mapPacket.height;

        const beachPadding = mapPacket.oceanSize + mapPacket.beachSize;

        const random = new SeededRandom(seed);

        const spacing = 16;
        const variation = 8;

        const beachHitbox = new RectangleHitbox(v(mapPacket.oceanSize, mapPacket.oceanSize),
            v(width - mapPacket.oceanSize, height - mapPacket.oceanSize));

        const grassHitbox = new RectangleHitbox(v(beachPadding, beachPadding),
            v(width - beachPadding, height - beachPadding));

        const beachPoints = jaggedRectangle(beachHitbox, spacing, variation, random);
        const grassPoints = jaggedRectangle(grassHitbox, spacing, variation, random);

        // Draw the terrain graphics
        const terrainGraphics = new Graphics();
        const mapGraphics = new Graphics();
        mapGraphics.beginFill(COLORS.grass);
        mapGraphics.drawRect(0, 0, width, height);
        mapGraphics.endFill();

        const drawTerrain = (ctx: Graphics, scale: number): void => {
            ctx.zIndex = -10;
            ctx.beginFill();

            ctx.fill.color = COLORS.water.toNumber();
            ctx.drawRect(0, 0, width * scale, height * scale);

            const beach = scale === 1 ? beachPoints : beachPoints.map(point => vMul(point, scale));
            // The grass is a hole in the map shape, the background clear color is the grass color
            ctx.beginHole();
            ctx.drawRoundedShape?.(beach, 20 * scale);
            ctx.endHole();

            ctx.fill.color = COLORS.beach.toNumber();

            ctx.drawRoundedShape?.(beach, 20 * scale);

            ctx.beginHole();

            const grass = scale === 1 ? grassPoints : grassPoints.map(point => vMul(point, scale));
            ctx.drawRoundedShape?.(grass, 20 * scale);

            ctx.endHole();

            ctx.lineStyle({
                color: 0x000000,
                alpha: 0.25,
                width: 2
            });

            for (let x = 0; x <= width; x += GRID_SIZE) {
                ctx.moveTo(x * scale, 0);
                ctx.lineTo(x * scale, height * scale);
            }
            for (let y = 0; y <= height; y += GRID_SIZE) {
                ctx.moveTo(0, y * scale);
                ctx.lineTo(width * scale, y * scale);
            }

            ctx.endFill();
            ctx.lineStyle();

            for (const building of mapPacket.buildings) {
                const definition = building.type.definition;
                if (definition.groundGraphics) {
                    for (const ground of definition.groundGraphics) {
                        ctx.beginFill(ground.color);
                        const hitbox = ground.bounds.transform(building.position, 1, building.orientation);
                        if (hitbox instanceof RectangleHitbox) {
                            const width = hitbox.max.x - hitbox.min.x;
                            const height = hitbox.max.y - hitbox.min.y;
                            ctx.drawRect(hitbox.min.x * scale, hitbox.min.y * scale, width * scale, height * scale);
                        } else if (hitbox instanceof CircleHitbox) {
                            ctx.arc(hitbox.position.x * scale, hitbox.position.y * scale, hitbox.radius * scale, 0, Math.PI * 2);
                        }
                        ctx.closePath();
                        ctx.endFill();
                    }
                }
            }
        };
        drawTerrain(terrainGraphics, PIXI_SCALE);
        drawTerrain(mapGraphics, 1);

        this.game.camera.container.addChild(terrainGraphics);

        // draw the minimap obstacles
        const mapRender = new Container();
        mapRender.addChild(mapGraphics);

        for (const obstacle of mapPacket.obstacles) {
            const definition = obstacle.type.definition;

            let textureId = definition.idString;

            if (obstacle.variation) {
                textureId += `_${obstacle.variation + 1}`;
            }
            // Create the object image
            const image = new SuroiSprite(`${textureId}`);
            image.setVPos(obstacle.position).setRotation(obstacle.rotation);
            image.scale.set(obstacle.scale * (1 / PIXI_SCALE));
            image.setDepth(definition.depth ?? 1);
            mapRender.addChild(image);
        }

        for (const building of mapPacket.buildings) {
            const definition = building.type.definition;

            for (const image of definition.floorImages) {
                const sprite = new SuroiSprite(image.key);
                sprite.setVPos(addAdjust(building.position, image.position, building.orientation));
                sprite.scale.set(1 / PIXI_SCALE);
                sprite.setRotation(building.rotation);
                mapRender.addChild(sprite);
            }

            for (const image of definition.ceilingImages) {
                const sprite = new SuroiSprite(image.key);
                sprite.setVPos(addAdjust(building.position, image.position, building.orientation));
                sprite.scale.set(1 / PIXI_SCALE);
                mapRender.addChild(sprite);
                sprite.setRotation(building.rotation);
                sprite.setDepth(9);
            }
        }
        mapRender.sortChildren();

        // Render all obstacles and buildings to a texture
        const renderTexture = RenderTexture.create({
            width,
            height,
            resolution: isMobile.any ? 1 : 2,
        });
        this.game.pixi.renderer.render(mapRender, { renderTexture });
        this.sprite.texture.destroy();
        this.sprite.texture = renderTexture;
        mapRender.destroy({
            children: true,
            texture: false
        });

        // Add the places
        this.placesContainer.removeChildren();
        for (const place of mapPacket.places) {
            const text = new Text(place.name, {
                fill: "white",
                fontFamily: "Inter",
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
            text.position.copyFrom(place.position);
            this.placesContainer.addChild(text);
        }
        this.resize();
    }

    update(): void {
        this.gas.updateFrom(this.game.gas);
        this.gas.update();
        // only re-render gas line and circle if something changed
        if ((this.position.x === this.lastPosition.x &&
            this.position.y === this.lastPosition.y &&
            this.gas.newRadius === this.gasRadius &&
            this.gas.newPosition.x === this.gasPos.x &&
            this.gas.newPosition.y === this.gasPos.y) || this.gas.state === GasState.Inactive) return;

        this.lastPosition = this.position;
        this.gasPos = this.gas.newPosition;
        this.gasRadius = this.gas.newRadius;

        this.gasGraphics.clear();

        this.gasGraphics.lineStyle({
            color: 0x00f9f9,
            width: 2,
            cap: LINE_CAP.ROUND
        });

        this.gasGraphics.moveTo(this.position.x, this.position.y)
            .lineTo(this.gasPos.x, this.gasPos.y);

        this.gasGraphics.endFill();

        this.gasGraphics.line.color = 0xffffff;
        this.gasGraphics.arc(this.gasPos.x, this.gasPos.y, this.gasRadius, 0, Math.PI * 2);
        this.gasGraphics.endFill();
    }

    resize(): void {
        if (this.expanded) {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const smallestDim = Math.min(screenHeight, screenWidth);
            this.container.scale.set(smallestDim / this.height);
            // noinspection JSSuspiciousNameCombination
            this.minimapWidth = this.sprite.width * this.container.scale.x;
            this.minimapHeight = this.sprite.height * this.container.scale.y;
            this.margins = v(screenWidth / 2 - (this.minimapWidth / 2), screenHeight / 2 - (this.minimapHeight / 2));

            const closeButton = $("#btn-close-minimap");
            closeButton.css("left", `${Math.min(this.margins.x + this.minimapWidth + 16, screenWidth - (closeButton.outerWidth() ?? 0))}px`);
        } else {
            if (!this.visible) return;

            if (window.innerWidth > 1200) {
                this.container.scale.set(1 / 1.25);
                this.minimapWidth = 200;
                this.minimapHeight = 200;
                this.margins = v(20, 20);
            } else {
                this.container.scale.set(1 / 2);
                this.minimapWidth = 125;
                this.minimapHeight = 125;
                this.margins = v(10, 10);
            }
        }

        this.mask.clear();
        this.mask.beginFill(0);
        this.mask.drawRect(this.margins.x, this.margins.y, this.minimapWidth, this.minimapHeight);
        this.updatePosition();
        this.updateTransparency();

        for (const text of this.placesContainer.children) {
            text.scale.set(1 / this.container.scale.x);
        }
    }

    toggle(): void {
        if (this.expanded) this.switchToSmallMap();
        else this.switchToBigMap();
    }

    setPosition(pos: Vector): void {
        this.position = vClone(pos);
        this.indicator.setVPos(pos);
        this.updatePosition();
    }

    updatePosition(): void {
        if (this.expanded) {
            this.container.position.set(window.innerWidth / 2, window.innerHeight / 2 - this.minimapHeight / 2);
            this.objectsContainer.position.set(-this.width / 2, 0);
            return;
        }
        const pos = vClone(this.position);
        pos.x -= (this.minimapWidth / 2 + this.margins.x) / this.container.scale.x;
        pos.y -= (this.minimapHeight / 2 + this.margins.y) / this.container.scale.y;

        this.container.position.set(0, 0);
        this.objectsContainer.position.copyFrom(vMul(pos, -1));
    }

    switchToBigMap(): void {
        this.expanded = true;
        this.resize();
        this.container.visible = true;
        $("#minimap-border").hide();
        $("#scopes-container").hide();
        $("#gas-msg-info").hide();
        $("#btn-close-minimap").show();
        $("#center-bottom-container").hide();
        $("#kill-counter").show();
    }

    switchToSmallMap(): void {
        this.expanded = false;
        $("#btn-close-minimap").hide();
        $("#center-bottom-container").show();
        $("#gas-msg-info").show();
        $("#scopes-container").show();
        $("#kill-counter").hide();
        if (!this.visible) {
            this.container.visible = false;
            return;
        }
        this.resize();
        $("#minimap-border").show();
    }

    updateTransparency(): void {
        this.container.alpha = localStorageInstance.config[this.expanded ? "bigMapTransparency" : "minimapTransparency"];
    }

    toggleMiniMap(noSwitchToggle = false): void {
        this.visible = !this.visible;

        this.switchToSmallMap();
        this.container.visible = this.visible;
        $("#minimap-border").toggle(this.visible);
        localStorageInstance.update({ minimapMinimized: !this.visible });
        if (!noSwitchToggle) {
            $("#toggle-hide-minimap").prop("checked", !this.visible);
        }
    }
}
