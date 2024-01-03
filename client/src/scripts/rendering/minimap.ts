import "@pixi/graphics-extras";
import $ from "jquery";
import { Container, Graphics, LINE_CAP, RenderTexture, Sprite, Text, Texture, isMobile, type ColorSource } from "pixi.js";
import { GameConstants, GasState, ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type MapPacket } from "../../../../common/src/packets/mapPacket";
import { type Orientation } from "../../../../common/src/typings";
import { CircleHitbox, HitboxGroup, PolygonHitbox, RectangleHitbox, type Hitbox } from "../../../../common/src/utils/hitbox";
import { Angle, Numeric } from "../../../../common/src/utils/math";
import { FloorTypes, River, Terrain } from "../../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, drawHitbox } from "../utils/pixi";
import { GasRender } from "./gas";

export class Minimap {
    game: Game;
    expanded = false;
    visible = true;
    position = Vec.create(0, 0);
    lastPosition = Vec.create(0, 0);

    // used for the gas to player line and circle
    gasPos = Vec.create(0, 0);
    gasRadius = 0;
    gasGraphics = new Graphics();

    readonly objectsContainer = new Container();
    readonly container = new Container();
    readonly mask = new Graphics();

    readonly sprite = new Sprite(Texture.EMPTY);
    readonly indicator = new SuroiSprite("player_indicator.svg");

    width = 0;
    height = 0;

    minimapWidth = 0;
    minimapHeight = 0;

    margins = Vec.create(0, 0);

    readonly gasRender = new GasRender(1);
    readonly placesContainer = new Container();

    terrain = new Terrain(0, 0, 0, 0, 0, []);

    readonly pings = new Set<Ping>();
    readonly border = new Graphics();
    readonly pingsContainer = new Container();
    readonly pingGraphics = new Graphics();

    readonly terrainGraphics = new Graphics();

    readonly debugGraphics = new Graphics();

    constructor(game: Game) {
        this.game = game;
        game.pixi.stage.addChild(this.container);

        this.objectsContainer.mask = this.mask;

        this.container.addChild(this.objectsContainer);
        this.container.addChild(this.border);

        window.addEventListener("resize", this.resize.bind(this));
        this.resize();

        if (this.game.console.getBuiltInCVar("cv_minimap_minimized")) this.toggleMinimap();

        this.objectsContainer.addChild(
            this.sprite,
            this.placesContainer,
            this.gasRender.graphics,
            this.gasGraphics,
            this.pingGraphics,
            this.pingsContainer,
            this.indicator
        ).sortChildren();

        this.borderContainer.on("click", e => {
            if (!this.game.inputManager.isMobile) return;
            this.switchToBigMap();
            e.stopImmediatePropagation();
        });

        $("#btn-close-minimap").on("pointerdown", e => {
            this.switchToSmallMap();
            e.stopImmediatePropagation();
        });
    }

    updateFromPacket(mapPacket: MapPacket): void {
        console.log(`Joining game with seed: ${mapPacket.seed}`);

        const width = this.width = mapPacket.width;
        const height = this.height = mapPacket.height;

        const mapBounds = new RectangleHitbox(
            Vec.create(mapPacket.oceanSize, mapPacket.oceanSize),
            Vec.create(mapPacket.width - mapPacket.oceanSize, mapPacket.height - mapPacket.oceanSize)
        );

        const rivers: River[] = [];
        for (const riverData of mapPacket.rivers) {
            rivers.push(new River(riverData.width, riverData.points, rivers, mapBounds));
        }

        const terrain = this.terrain = new Terrain(
            width,
            height,
            mapPacket.oceanSize,
            mapPacket.beachSize,
            mapPacket.seed,
            rivers
        );

        // Draw the terrain graphics
        const terrainGraphics = this.terrainGraphics;
        terrainGraphics.clear();
        const mapGraphics = new Graphics();

        const beachPoints = terrain.beachHitbox.points;
        const grassPoints = terrain.grassHitbox.points;

        const drawTerrain = (ctx: Graphics, scale: number, gridLineWidth: number): void => {
            ctx.zIndex = ZIndexes.Ground;
            ctx.beginFill();

            ctx.fill.color = COLORS.water.toNumber();
            ctx.drawRect(0, 0, width * scale, height * scale);

            const radius = 20 * scale;

            const beach = scale === 1 ? beachPoints : beachPoints.map(point => Vec.scale(point, scale));
            // The grass is a hole in the map shape, the background clear color is the grass color
            ctx.beginHole();
            ctx.drawRoundedShape?.(beach, radius);
            ctx.endHole();

            ctx.fill.color = COLORS.beach.toNumber();

            ctx.drawRoundedShape?.(beach, radius);

            ctx.beginHole();

            const grass = scale === 1 ? grassPoints : grassPoints.map(point => Vec.scale(point, scale));
            ctx.drawRoundedShape?.(grass, radius);

            ctx.endHole();

            // gets the river polygon with the middle 2 points not rounded
            // so it joins nicely with other rivers
            function getRiverPoly(points: Vector[]): Array<Vector & { radius: number }> {
                const half = points.length / 2;
                return points.map((point, index) => {
                    return {
                        x: point.x * scale,
                        y: point.y * scale,
                        radius: (index === half || index === half - 1) ? 0 : radius
                    };
                });
            }

            // no rivers breaks map graphics
            if (rivers.length) {
                // river bank needs to be draw first
                for (const river of rivers) {
                    ctx.fill.color = COLORS.riverBank.toNumber();
                    ctx.drawRoundedShape?.(getRiverPoly(river.bankHitbox.points), 0, true);
                }
                for (const river of rivers) {
                    ctx.fill.color = COLORS.water.toNumber();
                    ctx.drawRoundedShape?.(getRiverPoly(river.waterHitbox.points), 0, true);
                }
                // clip the river polygons
                ctx.drawRect(0, 0, width * scale, height * scale);
                ctx.beginHole();
                ctx.drawRoundedShape?.(beach, radius);
                ctx.endHole();
            }

            ctx.lineStyle({
                color: 0x000000,
                alpha: 0.1,
                width: gridLineWidth
            });

            const gridSize = GameConstants.gridSize * scale;
            const gridWidth = height * scale;
            const gridHeight = height * scale;
            for (let x = 0; x <= gridWidth; x += gridSize) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, gridHeight);
            }

            for (let y = 0; y <= gridHeight; y += gridSize) {
                ctx.moveTo(0, y);
                ctx.lineTo(gridWidth, y);
            }

            ctx.endFill();
            ctx.lineStyle();

            for (const building of mapPacket.objects) {
                if (building.type !== ObjectCategory.Building) continue;

                const definition = building.definition;
                if (definition.groundGraphics) {
                    const drawGroundGraphics = (color: ColorSource, hitbox: Hitbox): void => {
                        // TODO Make this code prettier
                        if (!(hitbox instanceof HitboxGroup)) ctx.beginFill(color);
                        if (hitbox instanceof RectangleHitbox) {
                            const width = hitbox.max.x - hitbox.min.x;
                            const height = hitbox.max.y - hitbox.min.y;
                            ctx.drawRect(hitbox.min.x * scale, hitbox.min.y * scale, width * scale, height * scale);
                        } else if (hitbox instanceof CircleHitbox) {
                            ctx.arc(hitbox.position.x * scale, hitbox.position.y * scale, hitbox.radius * scale, 0, Math.PI * 2);
                        } else if (hitbox instanceof PolygonHitbox) {
                            ctx.drawPolygon(hitbox.points.map(v => Vec.scale(v, scale)));
                        } else if (hitbox instanceof HitboxGroup) {
                            for (const hitBox of hitbox.hitboxes) {
                                drawGroundGraphics(color, hitBox);
                            }
                        }
                        if (!(hitbox instanceof HitboxGroup)) {
                            ctx.closePath();
                            ctx.endFill();
                        }
                    };
                    for (const ground of definition.groundGraphics) {
                        drawGroundGraphics(ground.color, ground.hitbox.transform(building.position, 1, building.rotation as Orientation));
                    }
                }
            }
        };
        drawTerrain(terrainGraphics, PIXI_SCALE, 6);
        drawTerrain(mapGraphics, 1, 2);

        // drawn map borders
        const margin = 5120;
        const doubleMargin = margin * 2;

        const realWidth = width * PIXI_SCALE;
        const realHeight = height * PIXI_SCALE;

        terrainGraphics.beginFill(COLORS.border);
        terrainGraphics.drawRect(-margin, -margin, realWidth + doubleMargin, margin);
        terrainGraphics.drawRect(-margin, realHeight, realWidth + doubleMargin, margin);
        terrainGraphics.drawRect(-margin, -margin, margin, realHeight + doubleMargin);
        terrainGraphics.drawRect(realWidth, -margin, margin, realHeight + doubleMargin);
        terrainGraphics.endFill();

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

                    const image = new SuroiSprite(texture)
                        .setVPos(mapObject.position).setRotation(mapObject.rotation)
                        .setZIndex(definition.zIndex ?? ZIndexes.ObstaclesLayer1);

                    if (definition.tint !== undefined) image.setTint(definition.tint);
                    image.scale.set((mapObject.scale ?? 1) * (1 / PIXI_SCALE));

                    mapRender.addChild(image);
                }
                    break;

                case ObjectCategory.Building: {
                    const definition = mapObject.definition;
                    const rotation = Angle.orientationToRotation(mapObject.rotation);

                    for (const image of definition.floorImages ?? []) {
                        const sprite = new SuroiSprite(image.key)
                            .setVPos(Vec.addAdjust(mapObject.position, image.position, mapObject.rotation as Orientation))
                            .setRotation(rotation + (image.rotation ?? 0))
                            .setZIndex(ZIndexes.BuildingsFloor);

                        if (image.tint !== undefined) sprite.setTint(image.tint);
                        sprite.scale = Vec.scale(image.scale ?? Vec.create(1, 1), 1 / PIXI_SCALE);
                        mapRender.addChild(sprite);
                    }

                    for (const image of definition.ceilingImages ?? []) {
                        const sprite = new SuroiSprite(image.key)
                            .setVPos(Vec.addAdjust(mapObject.position, image.position, mapObject.rotation as Orientation))
                            .setRotation(rotation)
                            .setZIndex(definition.ceilingZIndex ?? ZIndexes.BuildingsCeiling);

                        sprite.scale.set(1 / PIXI_SCALE);
                        if (image.tint !== undefined) sprite.setTint(image.tint);
                        mapRender.addChild(sprite);
                    }

                    for (const floor of definition.floors ?? []) {
                        const hitbox = floor.hitbox.transform(mapObject.position, 1, mapObject.rotation as Orientation);
                        this.terrain.addFloor(floor.type, hitbox);
                    }
                }
                    break;
            }
        }

        mapRender.sortChildren();

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
            const text = new Text(
                place.name,
                {
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
                }
            );
            text.alpha = 0.7;
            text.anchor.set(0.5);
            text.position.copyFrom(place.position);

            this.placesContainer.addChild(text);
        }
        this.resize();

        if (HITBOX_DEBUG_MODE) {
            const debugGraphics = this.debugGraphics;
            debugGraphics.clear();
            debugGraphics.zIndex = 99;
            for (const [hitbox, type] of this.terrain.floors) {
                drawHitbox(hitbox, FloorTypes[type].debugColor, debugGraphics);
            }

            drawHitbox(terrain.beachHitbox, FloorTypes.sand.debugColor, debugGraphics);
            drawHitbox(terrain.grassHitbox, FloorTypes.grass.debugColor, debugGraphics);

            for (const river of rivers) {
                const points = river.points.map(point => Vec.scale(point, PIXI_SCALE));

                drawHitbox(river.waterHitbox, FloorTypes.water.debugColor, debugGraphics);
                drawHitbox(river.bankHitbox, FloorTypes.sand.debugColor, debugGraphics);

                debugGraphics.lineStyle({
                    width: 10,
                    color: 0
                });

                debugGraphics.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    const point = points[i];
                    debugGraphics.lineTo(point.x, point.y);
                }

                debugGraphics.endFill();

                debugGraphics.lineStyle();
                debugGraphics.fill.alpha = 1;
                for (const point of points) {
                    debugGraphics.beginFill(0xff0000);
                    debugGraphics.arc(point.x, point.y, 20, 0, Math.PI * 2);
                    debugGraphics.endFill();
                }
            }

            this.game.camera.addObject(debugGraphics);
        }
    }

    update(): void {
        if (this.pings.size > 0) {
            this.pingGraphics.clear();
            this.pingGraphics.lineStyle({
                color: 0x00ffff,
                width: 5,
                cap: LINE_CAP.ROUND
            });

            const now = Date.now();
            for (const ping of this.pings) {
                if (!ping.initialized) {
                    this.pingsContainer.addChild(ping.image);
                    ping.initialized = true;
                }
                const radius = Numeric.lerp(0, 2048, (now - ping.startTime) / 7000);
                if (radius >= 2048) {
                    this.pings.delete(ping);
                    this.game.addTimeout(() => { ping.image.destroy(); }, 5000);
                    continue;
                }
                this.pingGraphics.arc(ping.position.x, ping.position.y, radius, 0, Math.PI * 2);
                this.pingGraphics.endFill();
            }
        }

        this.gasRender.update(this.game.gas);
        // only re-render gas line and circle if something changed
        if (
            this.game.gas.state === GasState.Inactive || (
                this.position.x === this.lastPosition.x &&
                this.position.y === this.lastPosition.y &&
                this.game.gas.newRadius === this.gasRadius &&
                this.game.gas.newPosition.x === this.gasPos.x &&
                this.game.gas.newPosition.y === this.gasPos.y
            )
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
        this.border.visible = this.expanded;
        if (this.expanded) {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const smallestDim = Math.min(screenHeight, screenWidth);
            this.container.scale.set(smallestDim / this.height);
            // noinspection JSSuspiciousNameCombination
            this.minimapWidth = this.sprite.width * this.container.scale.x;
            this.minimapHeight = this.sprite.height * this.container.scale.y;
            this.margins = Vec.create(screenWidth / 2 - (this.minimapWidth / 2), screenHeight / 2 - (this.minimapHeight / 2));

            const closeButton = $("#btn-close-minimap");
            closeButton.css("left", `${Math.min(this.margins.x + this.minimapWidth + 16, screenWidth - (closeButton.outerWidth() ?? 0))}px`);

            this.indicator.scale.set(0.2);

            this.border.clear();
            this.border.fill.alpha = 0;
            this.border.lineStyle({
                width: 4,
                color: 0x00000
            });
            this.border.drawRect(-this.sprite.width / 2, 0, this.sprite.width, this.sprite.height);
        } else {
            if (!this.visible) return;

            const bounds = this.borderContainer[0].getBoundingClientRect();
            const border = parseInt(this.borderContainer.css("border-width"));

            this.minimapWidth = bounds.width - border * 2;
            this.minimapHeight = bounds.height - border * 2;
            this.margins = Vec.create(bounds.left + border, bounds.top + border);

            if (window.innerWidth > 1200) {
                this.container.scale.set(1 / 1.25);
            } else {
                this.container.scale.set(1 / 2);
            }

            this.indicator.scale.set(0.1);
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
        this.position = Vec.clone(pos);
        this.indicator.setVPos(pos);
        this.updatePosition();
    }

    updatePosition(): void {
        if (this.expanded) {
            this.container.position.set(window.innerWidth / 2, window.innerHeight / 2 - this.minimapHeight / 2);
            this.objectsContainer.position.set(-this.width / 2, 0);
            return;
        }
        const pos = Vec.clone(this.position);
        pos.x -= (this.minimapWidth / 2 + this.margins.x) / this.container.scale.x;
        pos.y -= (this.minimapHeight / 2 + this.margins.y) / this.container.scale.y;

        this.container.position.set(0, 0);
        this.objectsContainer.position.copyFrom(Vec.scale(pos, -1));
    }

    switchToBigMap(): void {
        this.expanded = true;
        this.container.visible = true;
        this.borderContainer.hide();
        $("#scopes-container").hide();
        $("#spectating-container").hide();
        $("#weapons-container").hide();
        $("#items-container").hide();
        $("#gas-msg-info").hide();
        $("#btn-close-minimap").show();
        $("#ui-kill-leader").hide();
        $("#center-bottom-container").hide();
        $("#kill-counter").show();
        this.resize();
    }

    switchToSmallMap(): void {
        this.expanded = false;
        $("#btn-close-minimap").hide();
        $("#center-bottom-container").show();
        $("#weapons-container").show();
        $("#items-container").show();
        $("#gas-msg-info").show();
        $("#scopes-container").show();
        if (this.game.spectating) $("#spectating-container").show();
        const width = $(window).width();
        if (width && width > 1200) $("#ui-kill-leader").show();
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

    toggleMinimap(noSwitchToggle = false): void {
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

export class Ping {
    position: Vector;
    startTime: number;
    image: SuroiSprite;
    initialized: boolean;

    constructor(position: Vector) {
        this.position = position;
        this.startTime = Date.now();
        this.image = new SuroiSprite("airdrop_ping").setVPos(position);
        this.initialized = false;
    }
}
