import "@pixi/graphics-extras";
import { Container, Graphics, LINE_CAP, RenderTexture, Sprite, Text, Texture, isMobile } from "pixi.js";
import { GRID_SIZE, GasState, ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { CircleHitbox, RectangleHitbox } from "../../../../common/src/utils/hitbox";
import { FloorTypes, TerrainGrid, generateTerrain } from "../../../../common/src/utils/mapUtils";
import { addAdjust } from "../../../../common/src/utils/math";
import { v, vClone, vMul, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, drawHitbox } from "../utils/pixi";
import { GasRender } from "./gas";
import { MODE } from "../../../../common/src/definitions/modes";
import { type MapPacket } from "../../../../common/src/packets/mapPacket";
import { type Orientation } from "../../../../common/src/typings";
import { orientationToRotation } from "../utils/misc";

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

    readonly objectsContainer = new Container();

    readonly sprite = new Sprite(Texture.EMPTY);
    readonly indicator = new SuroiSprite("player_indicator.svg");

    width = 0;
    height = 0;

    minimapWidth = 0;
    minimapHeight = 0;

    margins = v(0, 0);

    readonly gasRender = new GasRender(1);
    readonly placesContainer = new Container();
    terrainGrid: TerrainGrid;

    constructor(game: Game) {
        this.game = game;
        game.pixi.stage.addChild(this.container);

        this.objectsContainer.mask = this.mask;

        this.container.addChild(this.objectsContainer);

        this.container.addChild(this.gasRender.graphics);

        window.addEventListener("resize", this.resize.bind(this));
        this.resize();

        if (this.game.console.getBuiltInCVar("cv_minimap_minimized")) this.toggleMiniMap();

        this.indicator.scale.set(0.1);

        this.objectsContainer.addChild(this.sprite, this.placesContainer, this.gasRender.graphics, this.gasGraphics, this.indicator).sortChildren();

        this.borderContainer.on("click", e => {
            if (!this.game.inputManager.isMobile) return;
            this.switchToBigMap();
            e.stopImmediatePropagation();
        });

        $("#btn-close-minimap").on("pointerdown", e => {
            this.switchToSmallMap();
            e.stopImmediatePropagation();
        });

        this.terrainGrid = new TerrainGrid(0, 0);
    }

    updateFromPacket(mapPacket: MapPacket): void {
        const width = this.width = mapPacket.width;
        const height = this.height = mapPacket.height;

        const terrain = generateTerrain(
            width,
            height,
            mapPacket.oceanSize,
            mapPacket.beachSize,
            mapPacket.seed,
            mapPacket.rivers
        );

        this.terrainGrid = new TerrainGrid(width, height);

        // Draw the terrain graphics
        const terrainGraphics = new Graphics();
        const mapGraphics = new Graphics();

        const beachPoints = terrain.beach.points;
        const grassPoints = terrain.grass.points;

        // drawn map borders
        const margin = 5120;
        const realWidth = width * PIXI_SCALE;
        const realHeight = height * PIXI_SCALE;
        terrainGraphics.beginFill(COLORS.border);
        terrainGraphics.drawRect(-margin, -margin, realWidth + margin * 2, margin);
        terrainGraphics.drawRect(-margin, realHeight, realWidth + margin * 2, margin);
        terrainGraphics.drawRect(-margin, -margin, margin, realHeight + margin * 2);
        terrainGraphics.drawRect(realWidth, -margin, margin, realHeight + margin * 2);
        terrainGraphics.endFill();

        const drawTerrain = (ctx: Graphics, scale: number, gridWidth: number): void => {
            ctx.zIndex = ZIndexes.Ground;
            ctx.beginFill();

            ctx.fill.color = COLORS.water.toNumber();
            ctx.drawRect(0, 0, width * scale, height * scale);

            const radius = 20 * scale;

            const beach = scale === 1 ? beachPoints : beachPoints.map(point => vMul(point, scale));
            // The grass is a hole in the map shape, the background clear color is the grass color
            ctx.beginHole();
            ctx.drawRoundedShape?.(beach, radius);
            ctx.endHole();

            ctx.fill.color = COLORS.beach.toNumber();

            ctx.drawRoundedShape?.(beach, radius);

            ctx.beginHole();

            const grass = scale === 1 ? grassPoints : grassPoints.map(point => vMul(point, scale));
            ctx.drawRoundedShape?.(grass, radius);

            ctx.endHole();

            for (const river of terrain.rivers) {
                const bank = river.bank.points;

                ctx.fill.color = COLORS.riverBank.toNumber();

                ctx.drawPolygon(scale === 1 ? bank : bank.map(point => vMul(point, scale)));
            }

            for (const river of terrain.rivers) {
                const water = river.water.points;

                ctx.fill.color = COLORS.water.toNumber();

                ctx.drawPolygon(scale === 1 ? water : water.map(point => vMul(point, scale)));
            }

            ctx.lineStyle({
                color: 0x000000,
                alpha: 0.25,
                width: gridWidth
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

            for (const building of mapPacket.objects) {
                if (building.type !== ObjectCategory.Building) continue;

                const definition = building.definition;
                if (definition.groundGraphics) {
                    for (const ground of definition.groundGraphics) {
                        ctx.beginFill(ground.color);

                        const hitbox = ground.hitbox.transform(building.position, 1, building.rotation as Orientation);
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
        drawTerrain(terrainGraphics, PIXI_SCALE, this.game.console.getBuiltInCVar("cv_antialias") ? 2 : 4);
        drawTerrain(mapGraphics, 1, 2);

        this.game.camera.addObject(terrainGraphics);

        // Draw the minimap obstacles
        const mapRender = new Container();
        mapRender.addChild(mapGraphics);

        for (const mapObject of mapPacket.objects) {
            switch (mapObject.type) {
                case ObjectCategory.Obstacle: {
                    const definition = mapObject.definition;

                    let texture = definition.frames?.base ?? definition.idString;

                    if (mapObject.variation !== undefined) texture += `_${mapObject.variation + 1}`;

                    const reskin = MODE.reskin;
                    if (reskin && definition.idString in reskin.obstacles) texture += `_${reskin.suffix}`;

                    const image = new SuroiSprite(texture)
                        .setVPos(mapObject.position).setRotation(mapObject.rotation)
                        .setZIndex(definition.zIndex ?? ZIndexes.ObstaclesLayer1);

                    if (definition.tint !== undefined) image.setTint(definition.tint);
                    image.scale.set(mapObject.scale * (1 / PIXI_SCALE));

                    mapRender.addChild(image);
                }
                    break;

                case ObjectCategory.Building: {
                    const definition = mapObject.definition;

                    const rotation = orientationToRotation(mapObject.rotation);

                    for (const image of definition.floorImages ?? []) {
                        const sprite = new SuroiSprite(image.key)
                            .setVPos(addAdjust(mapObject.position, image.position, mapObject.rotation as Orientation))
                            .setRotation(rotation)
                            .setZIndex(ZIndexes.Ground);

                        if (image.tint !== undefined) sprite.setTint(image.tint);
                        sprite.scale.set(1 / PIXI_SCALE);
                        mapRender.addChild(sprite);
                    }

                    for (const image of definition.ceilingImages ?? []) {
                        const sprite = new SuroiSprite(image.key)
                            .setVPos(addAdjust(mapObject.position, image.position, mapObject.rotation as Orientation))
                            .setRotation(rotation)
                            .setZIndex(definition.ceilingZIndex ?? ZIndexes.BuildingsCeiling);

                        sprite.scale.set(1 / PIXI_SCALE);
                        if (image.tint !== undefined) sprite.setTint(image.tint);
                        mapRender.addChild(sprite);
                    }

                    for (const floor of definition.floors ?? []) {
                        const hitbox = floor.hitbox.transform(mapObject.position, 1, mapObject.rotation as Orientation);
                        this.terrainGrid.addFloor(floor.type, hitbox);
                    }
                }
                    break;
            }
        }

        mapRender.sortChildren();

        for (const river of terrain.rivers) {
            this.terrainGrid.addFloor("water", river.water);
        }

        for (const river of terrain.rivers) {
            this.terrainGrid.addFloor("sand", river.bank);
        }

        this.terrainGrid.addFloor("grass", terrain.grass);
        this.terrainGrid.addFloor("sand", terrain.beach);

        // Render all obstacles and buildings to a texture
        const renderTexture = RenderTexture.create({
            width,
            height,
            resolution: isMobile.any ? 1 : 2
        });

        renderTexture.baseTexture.clearColor = COLORS.grass;

        this.game.pixi.renderer.render(mapRender, { renderTexture });
        this.sprite.texture.destroy(true);
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

        if (HITBOX_DEBUG_MODE) {
            const debugGraphics = new Graphics();
            debugGraphics.zIndex = 99;
            for (const [hitbox, type] of this.terrainGrid.floors) {
                drawHitbox(hitbox, FloorTypes[type].debugColor, debugGraphics);
            }

            for (const river of mapPacket.rivers) {
                const points = river.points.map(point => vMul(point, PIXI_SCALE));

                debugGraphics.lineStyle({
                    width: 10,
                    color: 0
                });

                for (let i = 0, l = points.length; i < l; i++) {
                    const point = points[i];
                    debugGraphics[i ? "lineTo" : "moveTo"](point.x, point.y);
                }

                debugGraphics.endFill();
            }

            this.game.camera.addObject(debugGraphics);
        }
    }

    update(): void {
        this.gasRender.update(this.game.gas);
        // only re-render gas line and circle if something changed
        if (
            (
                this.position.x === this.lastPosition.x &&
                this.position.y === this.lastPosition.y &&
                this.game.gas.newRadius === this.gasRadius &&
                this.game.gas.newPosition.x === this.gasPos.x &&
                this.game.gas.newPosition.y === this.gasPos.y
            ) || this.game.gas.state === GasState.Inactive
        ) return;

        this.lastPosition = this.position;
        this.gasPos = this.game.gas.newPosition;
        this.gasRadius = this.game.gas.newRadius;

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

    borderContainer = $("#minimap-border");

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

            const bounds = this.borderContainer[0].getBoundingClientRect();
            const border = parseInt(this.borderContainer.css("border-width"));

            this.minimapWidth = bounds.width - border * 2;
            this.minimapHeight = bounds.height - border * 2;
            this.margins = v(bounds.left + border, bounds.top + border);

            if (window.innerWidth > 1200) {
                this.container.scale.set(1 / 1.25);
            } else {
                this.container.scale.set(1 / 2);
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
        this.container.visible = true;
        this.borderContainer.hide();
        $("#scopes-container").hide();
        $("#gas-msg-info").hide();
        $("#ui-kill-leader").hide();
        $("#btn-close-minimap").show();
        $("#center-bottom-container").hide();
        $("#kill-counter").show();
        this.resize();
    }

    switchToSmallMap(): void {
        this.expanded = false;
        $("#btn-close-minimap").hide();
        $("#center-bottom-container").show();
        $("#gas-msg-info").show();
        $("#scopes-container").show();
        $("#ui-kill-leader").show();
        $("#kill-counter").hide();
        if (!this.visible) {
            this.container.visible = false;
            return;
        }
        this.borderContainer.show();
        this.resize();
    }

    updateTransparency(): void {
        this.container.alpha = this.game.console.getBuiltInCVar(this.expanded ? "cv_map_transparency" : "cv_minimap_transparency");
    }

    toggleMiniMap(noSwitchToggle = false): void {
        this.visible = !this.visible;

        this.switchToSmallMap();
        this.container.visible = this.visible;
        this.borderContainer.toggle(this.visible);
        this.game.console.setBuiltInCVar("cv_minimap_minimized", !this.visible);
        if (!noSwitchToggle) {
            $("#toggle-hide-minimap").prop("checked", !this.visible);
        }
    }
}
