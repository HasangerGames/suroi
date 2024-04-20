import $ from "jquery";
import { DropShadowFilter } from "pixi-filters";
import { Container, Graphics, RenderTexture, Sprite, Text, isMobile, type ColorSource, type Texture } from "pixi.js";
import { GameConstants, GasState, ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type MapPingDefinition } from "../../../../common/src/definitions/mapPings";
import { type MapPacket } from "../../../../common/src/packets/mapPacket";
import { type Orientation } from "../../../../common/src/typings";
import { CircleHitbox, HitboxGroup, PolygonHitbox, RectangleHitbox, type Hitbox } from "../../../../common/src/utils/hitbox";
import { Angle, Numeric } from "../../../../common/src/utils/math";
import { FloorTypes, River, Terrain } from "../../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { type Player } from "../objects/player";
import { COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE, TEAMMATE_COLORS } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
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

    readonly sprite = new Sprite();
    texture?: Texture;

    readonly indicator = new SuroiSprite("player_indicator")
        .setTint(TEAMMATE_COLORS[0])
        .setZIndex(1000);

    readonly teammateIndicators = new Map<number, SuroiSprite>();
    readonly teammateIndicatorContainer = new Container();

    width = 0;
    height = 0;

    minimapWidth = 0;
    minimapHeight = 0;

    margins = Vec.create(0, 0);

    readonly gasRender = new GasRender(1);
    readonly placesContainer = new Container();

    terrain = new Terrain(0, 0, 0, 0, 0, []);

    readonly pings = new Set<MapPing>();
    readonly border = new Graphics();
    readonly pingsContainer = new Container();
    readonly pingGraphics = new Graphics();

    readonly terrainGraphics = new Graphics();

    readonly debugGraphics = new Graphics();

    constructor(game: Game) {
        this.game = game;
        this.objectsContainer.mask = this.mask;

        this.container.addChild(this.objectsContainer);
        this.container.addChild(this.border);

        this.gasGraphics.zIndex = 998;
        this.teammateIndicatorContainer.zIndex = 999;

        this.objectsContainer.addChild(
            this.sprite,
            this.placesContainer,
            this.gasRender.graphics,
            this.gasGraphics,
            this.pingGraphics,
            this.pingsContainer,
            this.indicator,
            this.teammateIndicatorContainer
        ).sortChildren();

        this._borderContainer.on("click", e => {
            if (!this.game.inputManager.isMobile) return;
            this.switchToBigMap();
            e.stopImmediatePropagation();
        });

        this.sprite.eventMode = "static";

        this.sprite.on("pointerdown", e => {
            this.game.inputManager.pingWheelPosition = this.sprite.toLocal(e);
            this.game.inputManager.pingWheelMinimap = true;
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

            const radius = 20 * scale;

            const beach = scale === 1 ? beachPoints : beachPoints.map(point => Vec.scale(point, scale));
            // The grass is a hole in the map shape, the background clear color is the grass color
            ctx.roundShape(beach, radius);
            ctx.cut();

            ctx.roundShape?.(beach, radius);
            ctx.fill(COLORS.beach);

            const grass = scale === 1 ? grassPoints : grassPoints.map(point => Vec.scale(point, scale));
            ctx.roundShape(grass, radius);
            ctx.cut();

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

            // river bank needs to be draw first
            ctx.beginPath();
            for (const river of rivers) {
                ctx.roundShape(getRiverPoly(river.bankHitbox.points), 0, true);
            }
            ctx.fill(COLORS.riverBank);

            ctx.beginPath();
            for (const river of rivers) {
                ctx.roundShape(getRiverPoly(river.waterHitbox.points), 0, true);
            }
            ctx.fill(COLORS.water);

            ctx.beginPath();
            ctx.rect(0, 0, width * scale, height * scale);
            ctx.fill(COLORS.water);
            ctx.roundShape(beach, radius);
            ctx.cut();

            ctx.setStrokeStyle({
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

            ctx.stroke();

            for (const building of mapPacket.objects) {
                if (building.type !== ObjectCategory.Building) continue;

                const definition = building.definition;
                if (definition.groundGraphics) {
                    const drawGroundGraphics = (hitbox: Hitbox): void => {
                        // TODO Make this code prettier
                        if (hitbox instanceof RectangleHitbox) {
                            const width = hitbox.max.x - hitbox.min.x;
                            const height = hitbox.max.y - hitbox.min.y;
                            ctx.rect(hitbox.min.x * scale, hitbox.min.y * scale, width * scale, height * scale);
                        } else if (hitbox instanceof CircleHitbox) {
                            ctx.arc(hitbox.position.x * scale, hitbox.position.y * scale, hitbox.radius * scale, 0, Math.PI * 2);
                        } else if (hitbox instanceof PolygonHitbox) {
                            ctx.poly(hitbox.points.map(v => {
                                const vec = Vec.scale(v, scale);
                                return [vec.x, vec.y];
                            }).flat());
                        } else if (hitbox instanceof HitboxGroup) {
                            for (const hitBox of hitbox.hitboxes) {
                                drawGroundGraphics(hitBox);
                            }
                        }
                        if (!(hitbox instanceof HitboxGroup)) {
                            ctx.closePath();
                        }
                    };
                    for (const ground of definition.groundGraphics) {
                        ctx.beginPath();
                        drawGroundGraphics(ground.hitbox.transform(building.position, 1, building.rotation as Orientation));
                        ctx.closePath();
                        ctx.fill(ground.color);
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

        terrainGraphics.rect(-margin, -margin, realWidth + doubleMargin, margin);
        terrainGraphics.rect(-margin, realHeight, realWidth + doubleMargin, margin);
        terrainGraphics.rect(-margin, -margin, margin, realHeight + doubleMargin);
        terrainGraphics.rect(realWidth, -margin, margin, realHeight + doubleMargin);
        terrainGraphics.fill(COLORS.border);

        this.game.camera.addObject(terrainGraphics);

        // Draw the minimap obstacles
        const mapRender = new Container();
        mapRender.addChild(mapGraphics);

        for (const mapObject of mapPacket.objects) {
            switch (mapObject.type) {
                case ObjectCategory.Obstacle: {
                    const definition = mapObject.definition;

                    let texture = definition.frames.base ?? definition.idString;

                    if (mapObject.variation !== undefined) texture += `_${mapObject.variation + 1}`;

                    const image = new SuroiSprite(texture)
                        .setVPos(mapObject.position).setRotation(mapObject.rotation)
                        .setZIndex(definition.zIndex ?? ZIndexes.ObstaclesLayer1);

                    if (definition.tint !== undefined) image.setTint(definition.tint);
                    image.scale.set((mapObject.scale ?? 1) * (1 / PIXI_SCALE));

                    mapRender.addChild(image);
                    break;
                }

                case ObjectCategory.Building: {
                    const definition = mapObject.definition;
                    const rotation = Angle.orientationToRotation(mapObject.rotation);

                    for (const image of definition.floorImages) {
                        const sprite = new SuroiSprite(image.key)
                            .setVPos(Vec.addAdjust(mapObject.position, image.position, mapObject.rotation as Orientation))
                            .setRotation(rotation + (image.rotation ?? 0))
                            .setZIndex(ZIndexes.BuildingsFloor);

                        if (image.tint !== undefined) sprite.setTint(image.tint);
                        sprite.scale = Vec.scale(image.scale ?? Vec.create(1, 1), 1 / PIXI_SCALE);
                        mapRender.addChild(sprite);
                    }

                    for (const image of definition.ceilingImages) {
                        const sprite = new SuroiSprite(image.key)
                            .setVPos(Vec.addAdjust(mapObject.position, image.position, mapObject.rotation as Orientation))
                            .setRotation(rotation)
                            .setZIndex(definition.ceilingZIndex ?? ZIndexes.BuildingsCeiling);

                        sprite.scale.set(1 / PIXI_SCALE);
                        if (image.tint !== undefined) sprite.setTint(image.tint);
                        mapRender.addChild(sprite);
                    }

                    for (const floor of definition.floors) {
                        const hitbox = floor.hitbox.transform(mapObject.position, 1, mapObject.rotation as Orientation);
                        this.terrain.addFloor(floor.type, hitbox);
                    }
                    break;
                }
            }
        }

        mapRender.sortChildren();

        // Render all obstacles and buildings to a texture
        this.texture?.destroy(true);
        this.texture = RenderTexture.create({
            width,
            height,
            resolution: isMobile.any ? 1 : 2
        });

        this.game.pixi.renderer.render({ container: mapRender, target: this.texture, clearColor: COLORS.grass });
        this.sprite.texture.destroy(true);
        this.sprite.texture = this.texture;
        mapRender.destroy({
            children: true,
            texture: false
        });

        // Add the places
        this.placesContainer.removeChildren();
        for (const place of mapPacket.places) {
            const text = new Text(
                {
                    text: place.name,
                    style: {
                        fill: "white",
                        fontFamily: "Inter",
                        fontWeight: "600",
                        stroke: {
                            color: "black",
                            width: 2
                        },
                        fontSize: 18,
                        dropShadow: {
                            alpha: 0.8,
                            color: "black",
                            blur: 2,
                            distance: 5
                        }
                    }
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

                debugGraphics.setStrokeStyle({
                    width: 10,
                    color: 0
                });

                debugGraphics.beginPath();
                debugGraphics.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    const point = points[i];
                    debugGraphics.lineTo(point.x, point.y);
                }
                debugGraphics.stroke();

                for (const point of points) {
                    debugGraphics.beginPath();
                    debugGraphics.arc(point.x, point.y, 20, 0, Math.PI * 2);
                    debugGraphics.fill(0xff0000);
                }
            }

            this.game.camera.addObject(debugGraphics);
        }
    }

    update(): void {
        if (this.pings.size > 0) {
            this.pingGraphics.clear();
            const now = Date.now();

            for (const ping of this.pings) {
                const radius = Numeric.lerp(0, 2048, (now - ping.startTime) / 7000);

                if (now > ping.endTime) {
                    this.pings.delete(ping);
                    ping.destroy();
                    continue;
                }

                if (radius >= 2048) continue;

                this.pingGraphics.setStrokeStyle({
                    color: ping.color,
                    width: 5,
                    cap: "round"
                });

                this.pingGraphics.arc(ping.position.x, ping.position.y, radius, 0, Math.PI * 2);
                this.pingGraphics.stroke();
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

        this.gasGraphics.beginPath();
        this.gasGraphics.setStrokeStyle({
            color: 0x00f9f9,
            width: 2,
            cap: "round"
        });
        // draw line from player to gas center
        this.gasGraphics.moveTo(this.position.x, this.position.y)
            .lineTo(this.gasPos.x, this.gasPos.y)
            .closePath().stroke();

        // draw circle
        this.gasGraphics.beginPath()
            .setStrokeStyle({
                color: 0xffffff,
                width: 2,
                cap: "round"
            })
            .arc(this.gasPos.x, this.gasPos.y, this.gasRadius, 0, Math.PI * 2)
            .closePath()
            .stroke();
    }

    private readonly _borderContainer = $("#minimap-border");

    resize(): void {
        this.border.visible = this.expanded;
        const uiScale = this.game.console.getBuiltInCVar("cv_ui_scale");

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
            const closeButtonPos = Math.min(
                this.margins.x + this.minimapWidth + 16,
                screenWidth - (closeButton.outerWidth() ?? 0)
            ) / uiScale;
            closeButton.css("left", `${closeButtonPos}px`);

            this.border.clear();
            this.border.setStrokeStyle({
                width: 4,
                color: 0x00000
            });
            this.border.rect(-this.sprite.width / 2, 0, this.sprite.width, this.sprite.height);
            this.border.stroke();

            this.indicator.scale.set(1);
            for (const [, indicator] of this.teammateIndicators) {
                indicator.setScale(1);
            }
        } else {
            if (!this.visible) return;

            const bounds = this._borderContainer[0].getBoundingClientRect();
            const border = parseInt(this._borderContainer.css("border-width")) * uiScale;

            this.minimapWidth = bounds.width - border * 2;
            this.minimapHeight = bounds.height - border * 2;
            this.margins = Vec.create(bounds.left + border, bounds.top + border);

            if (window.innerWidth > 1200) {
                this.container.scale.set(1 / 1.25 * uiScale);
            } else {
                this.container.scale.set(1 / 2 * uiScale);
            }

            this.indicator.scale.set(0.75);
            for (const [, indicator] of this.teammateIndicators) {
                indicator.setScale(0.75);
            }
        }

        this.mask.clear();
        this.mask.rect(this.margins.x, this.margins.y, this.minimapWidth, this.minimapHeight);
        this.mask.fill();

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
        this._borderContainer.hide();
        $("#scopes-container").hide();
        $("#spectating-container").hide();
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
        this._borderContainer.show();
        this.resize();
    }

    updateTransparency(): void {
        this.container.alpha = this.game.console.getBuiltInCVar(
            this.expanded
                ? "cv_map_transparency"
                : "cv_minimap_transparency"
        );
    }

    toggleMinimap(): void {
        this.visible = !this.visible;

        this.switchToSmallMap();
        this.container.visible = this.visible;
        this._borderContainer.toggle(this.visible);
    }

    addMapPing(position: Vector, definition: MapPingDefinition, playerId?: number): void {
        const ping = new MapPing(position, definition, playerId ? this.game.objects.get(playerId) as Player : undefined);
        if (definition.sound) this.game.soundManager.play(definition.sound);

        this.pingsContainer.addChild(ping.mapImage);
        if (ping.inGameImage) this.game.camera.addObject(ping.inGameImage);

        // delete previous pings from the same player
        if (ping.definition.isPlayerPing) {
            for (const otherPing of this.pings) {
                if (
                    otherPing.definition.idString === ping.definition.idString &&
                    otherPing.player?.id === playerId
                ) {
                    otherPing.destroy();
                    this.pings.delete(otherPing);
                }
            }
        }
        this.pings.add(ping);
        if (ping.definition.ignoreExpiration !== true) {
            this.game.addTimeout(() => {
                ping.destroy();
            }, 10000);
        }
    }
}

export class MapPing {
    position: Vector;
    startTime: number;
    endTime: number;
    mapImage: SuroiSprite;
    inGameImage?: SuroiSprite;
    definition: MapPingDefinition;
    player?: Player;
    color: ColorSource;

    constructor(position: Vector, definition: MapPingDefinition, player?: Player) {
        this.position = position;
        this.definition = definition;
        this.player = player;
        this.startTime = Date.now();
        this.endTime = this.startTime + (this.definition.lifetime * 1000);

        this.color = definition.color;

        if (definition.isPlayerPing && player) {
            this.color = TEAMMATE_COLORS[
                Math.max(player.game.uiManager.teammates.findIndex(p => p.id === player.id) + 1, 0)
            ];
        }

        this.mapImage = new SuroiSprite(definition.idString)
            .setVPos(position)
            .setTint(this.color)
            .setScale(0.5);

        this.mapImage.filters = new DropShadowFilter({
            blur: 1,
            quality: 3,
            alpha: 1,
            color: 0,
            offset: {
                x: 0,
                y: 0
            }
        });

        if (this.definition.showInGame) {
            this.inGameImage = new SuroiSprite(definition.idString)
                .setVPos(toPixiCoords(position))
                .setTint(this.color)
                .setZIndex(ZIndexes.Emotes);
            this.inGameImage.filters = new DropShadowFilter({
                blur: 1,
                quality: 3,
                alpha: 0.5,
                color: 0,
                offset: {
                    x: 0,
                    y: 0
                }
            });
        }
    }

    destroy(): void {
        this.mapImage.destroy();
        this.inGameImage?.destroy();
    }
}
