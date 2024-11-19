import { GameConstants, GasState, Layer, ObjectCategory, ZIndexes } from "@common/constants";
import { type MapPingDefinition } from "@common/definitions/mapPings";
import { type MapPacketData } from "@common/packets/mapPacket";
import { type PingSerialization, type PlayerPingSerialization } from "@common/packets/updatePacket";
import { RectangleHitbox } from "@common/utils/hitbox";
import { Numeric } from "@common/utils/math";
import { FloorTypes, River, Terrain } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import $ from "jquery";
import { Container, Graphics, RenderTexture, Sprite, Text, isMobile, type ColorSource, type Texture } from "pixi.js";
import { getTranslatedString } from "../../translations";
import { type Game } from "../game";
import { COLORS, DIFF_LAYER_HITBOX_OPACITY, FOOTSTEP_HITBOX_LAYER, HITBOX_DEBUG_MODE, PIXI_SCALE, TEAMMATE_COLORS } from "../utils/constants";
import { SuroiSprite, drawGroundGraphics, drawHitbox, toPixiCoords } from "../utils/pixi";
import { GasRender } from "./gas";

export class Minimap {
    private _expanded = false;
    get expanded(): boolean { return this._expanded; }
    set expanded(expand: boolean) {
        if (this._expanded === expand) return;

        if (this._expanded = expand) this.switchToBigMap();
        else this.switchToSmallMap();
    }

    toggle(): void { this.expanded = !this._expanded; }

    private _visible = true;
    get visible(): boolean { return this._visible; }
    set visible(visible: boolean) {
        this._visible = visible;

        this.switchToSmallMap();
        this.container.visible = visible;
        this._borderContainer.toggle(visible);
    }

    toggleMinimap(): void { this.visible = !this._visible; }

    private _position = Vec.create(0, 0);
    private _lastPosition = Vec.create(0, 0);

    // used for the gas to player line and circle
    private _gasPos = Vec.create(0, 0);
    private _gasRadius = 0;
    readonly safeZone = new Graphics();

    private readonly _objectsContainer = new Container();
    readonly container = new Container();
    readonly mask = new Graphics();

    readonly sprite = new Sprite();
    private _texture?: Texture;

    readonly indicator = new SuroiSprite("player_indicator")
        .setTint(TEAMMATE_COLORS[0])
        .setZIndex(1000);

    readonly teammateIndicators = new Map<number, SuroiSprite>();
    readonly teammateIndicatorContainer = new Container();

    private _width = 0;
    get width(): number { return this._width; }

    private _height = 0;
    get height(): number { return this._height; }

    private _minimapWidth = 0;
    get minimapWidth(): number { return this._minimapWidth; }

    private _minimapHeight = 0;
    get minimapHeight(): number { return this._minimapHeight; }

    private _margins = Vec.create(0, 0);

    readonly gasRender = new GasRender(1);
    readonly placesContainer = new Container();

    private _terrain = new Terrain(0, 0, 0, 0, 0, []);
    get terrain(): Terrain { return this._terrain; }

    readonly pings = new Set<MapPing>();
    private readonly _border = new Graphics();
    readonly pingsContainer = new Container();
    readonly pingGraphics = new Graphics();

    readonly terrainGraphics = new Graphics();

    private _objects: MapPacketData["objects"] = [];
    private _places: MapPacketData["places"] = [];

    readonly debugGraphics = new Graphics();

    private static _instantiated = false;
    constructor(readonly game: Game) {
        if (Minimap._instantiated) {
            throw new Error("Class 'Minimap' has already been instantiated");
        }
        Minimap._instantiated = true;

        this._objectsContainer.mask = this.mask;

        this.container.addChild(this._objectsContainer);
        this.container.addChild(this._border);

        this.safeZone.zIndex = 997;
        this.pingsContainer.zIndex = 998;
        this.teammateIndicatorContainer.zIndex = 999;

        this._objectsContainer.addChild(
            this.sprite,
            this.placesContainer,
            this.gasRender.graphics,
            this.safeZone,
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

    drawTerrain(ctx: Graphics, scale: number, gridLineWidth: number): void {
        ctx.zIndex = ZIndexes.Ground;

        const radius = 20 * scale;
        const [
            { points: beachPoints },
            { points: grassPoints }
        ] = [this._terrain.beachHitbox, this._terrain.grassHitbox];

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
        function getRiverPoly(points: readonly Vector[]): Array<Vector & { readonly radius: number }> {
            const half = points.length / 2;
            return points.map(
                (point, index) => ({
                    x: point.x * scale,
                    y: point.y * scale,
                    radius: (index === half || index === half - 1) ? 0 : radius
                })
            );
        }

        // river bank needs to be draw first
        for (const river of this._terrain.rivers) {
            ctx
                .beginPath()
                .roundShape(getRiverPoly(river.bankHitbox.points), 0, true)
                .fill(river.isTrail ? COLORS.trail : COLORS.riverBank);
        }

        ctx.beginPath();
        for (const river of this._terrain.rivers) {
            if (river.waterHitbox) {
                ctx.roundShape(getRiverPoly(river.waterHitbox.points), 0, true);
            }
        }
        ctx.fill(COLORS.water);

        ctx.beginPath();
        ctx.rect(0, 0, this._width * scale, this._height * scale);
        ctx.fill(COLORS.water);
        ctx.roundShape(beach, radius);
        ctx.cut();

        ctx.setStrokeStyle({
            color: 0x000000,
            alpha: 0.1,
            width: gridLineWidth
        });

        const gridSize = GameConstants.gridSize * scale;
        const gridWidth = this._width * scale;
        const gridHeight = this._height * scale;
        for (let x = 0; x <= gridWidth; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, gridHeight);
        }

        for (let y = 0; y <= gridHeight; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(gridWidth, y);
        }

        ctx.stroke();

        for (const building of this._objects) {
            if (!building.isBuilding) continue;

            const definition = building.definition;
            for (const ground of definition.groundGraphics) {
                ctx.beginPath();
                drawGroundGraphics(ground.hitbox.transform(building.position, 1, building.orientation), ctx, scale);
                ctx.closePath();
                ctx.fill(ground.color);
            }
        }
    }

    renderMap(): void {
        // Draw the terrain graphics
        const terrainGraphics = this.terrainGraphics;
        terrainGraphics.clear();
        const mapGraphics = new Graphics();

        this.drawTerrain(terrainGraphics, PIXI_SCALE, 6);
        this.drawTerrain(mapGraphics, 1, 2);

        // drawn map borders
        // since the pixi clear color is the grass color for performance reasons
        // big rectangles need to be draw as the map border
        const margin = 5120;
        const doubleMargin = margin * 2;

        const realWidth = this._width * PIXI_SCALE;
        const realHeight = this._height * PIXI_SCALE;

        terrainGraphics.rect(-margin, -margin, realWidth + doubleMargin, margin);
        terrainGraphics.rect(-margin, realHeight, realWidth + doubleMargin, margin);
        terrainGraphics.rect(-margin, -margin, margin, realHeight + doubleMargin);
        terrainGraphics.rect(realWidth, -margin, margin, realHeight + doubleMargin);
        terrainGraphics.fill(COLORS.border);

        this.game.camera.addObject(terrainGraphics);

        // Draw the minimap objects
        const mapRender = new Container();
        mapRender.addChild(mapGraphics);

        for (const mapObject of this._objects) {
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
                    if (mapObject.layer !== Layer.Ground) continue;
                    const definition = mapObject.definition;
                    const rotation = mapObject.rotation;

                    for (const image of definition.floorImages) {
                        const sprite = new SuroiSprite(image.key)
                            .setVPos(Vec.addAdjust(mapObject.position, image.position, mapObject.orientation))
                            .setRotation(rotation + (image.rotation ?? 0))
                            .setZIndex(ZIndexes.BuildingsFloor);

                        if (image.tint !== undefined) sprite.setTint(image.tint);
                        sprite.scale = Vec.scale(image.scale ?? Vec.create(1, 1), 1 / PIXI_SCALE);
                        mapRender.addChild(sprite);
                    }

                    for (const image of definition.ceilingImages) {
                        const sprite = new SuroiSprite(image.key)
                            .setVPos(Vec.addAdjust(mapObject.position, image.position, mapObject.orientation))
                            .setRotation(rotation + (image.rotation ?? 0))
                            .setZIndex(definition.ceilingZIndex);

                        sprite.scale.set(1 / PIXI_SCALE);
                        sprite.scale.x *= image.scale?.x ?? 1;
                        sprite.scale.y *= image.scale?.y ?? 1;
                        if (image.tint !== undefined) sprite.setTint(image.tint);
                        mapRender.addChild(sprite);
                    }

                    if (definition.graphics.length) {
                        const ctx = new Graphics();
                        ctx.zIndex = definition.graphicsZIndex;
                        for (const graphics of definition.graphics) {
                            ctx.beginPath();
                            drawGroundGraphics(graphics.hitbox.transform(mapObject.position, 1, mapObject.orientation), ctx, 1);
                            ctx.closePath();
                            ctx.fill(graphics.color);
                        }
                        mapRender.addChild(ctx);
                    }
                    break;
                }
            }
        }

        mapRender.sortChildren();

        // Render all obstacles and buildings to a texture
        this._texture?.destroy(true);
        this._texture = RenderTexture.create({
            width: this._width,
            height: this._height,
            resolution: isMobile.any ? 1 : 2
        });

        this.game.pixi.renderer.render({ container: mapRender, target: this._texture, clearColor: COLORS.grass });
        this.sprite.texture.destroy(true);
        this.sprite.texture = this._texture;
        mapRender.destroy({
            children: true,
            texture: false
        });

        // Add the places
        this.placesContainer.removeChildren();
        for (const place of this._places) {
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

        if (HITBOX_DEBUG_MODE) {
            this.renderMapDebug();
        }
    }

    renderMapDebug(): void {
        const debugGraphics = this.debugGraphics;
        debugGraphics.clear();
        debugGraphics.zIndex = 999;
        for (const [hitbox, { floorType, layer }] of this._terrain.floors) {
            drawHitbox(hitbox, (FloorTypes[floorType].debugColor * (2 ** 8) + 0x80).toString(16), debugGraphics, layer as Layer === FOOTSTEP_HITBOX_LAYER ? 1 : DIFF_LAYER_HITBOX_OPACITY);
            //                                                      ^^^^^^ using << 8 can cause 32-bit overflow lol
        }

        drawHitbox(this._terrain.beachHitbox, FloorTypes.sand.debugColor, debugGraphics);
        drawHitbox(this._terrain.grassHitbox, FloorTypes.grass.debugColor, debugGraphics);

        for (const river of this._terrain.rivers) {
            const points = river.points.map(point => Vec.scale(point, PIXI_SCALE));

            if (river.waterHitbox) drawHitbox(river.waterHitbox, FloorTypes.water.debugColor, debugGraphics);
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

    updateFromPacket(mapPacket: MapPacketData): void {
        console.log(`Joining game with seed: ${mapPacket.seed}`);
        this.game.uiManager.ui.loadingText.text(getTranslatedString("loading_joining_game"));

        const width = this._width = mapPacket.width;
        const height = this._height = mapPacket.height;
        this._objects = mapPacket.objects;
        this._places = mapPacket.places;

        const mapBounds = new RectangleHitbox(
            Vec.create(mapPacket.oceanSize, mapPacket.oceanSize),
            Vec.create(mapPacket.width - mapPacket.oceanSize, mapPacket.height - mapPacket.oceanSize)
        );

        const rivers: River[] = [];
        rivers.push(...mapPacket.rivers.map(({ width, points, isTrail }) => new River(width, points, rivers, mapBounds, isTrail)));

        this._terrain = new Terrain(
            width,
            height,
            mapPacket.oceanSize,
            mapPacket.beachSize,
            mapPacket.seed,
            rivers
        );

        for (const object of this._objects) {
            if (object.isBuilding) {
                for (const floor of object.definition.floors) {
                    const hitbox = floor.hitbox.transform(object.position, 1, object.orientation);
                    this._terrain.addFloor(floor.type, hitbox, floor.layer ?? object.layer ?? 0);
                }
            }
        }

        this.renderMap();
        this.resize();
    }

    update(): void {
        // Hide the map while spectating in mobile
        if (this.game.inputManager.isMobile && this._visible) {
            if (this.game.uiManager.ui.spectatingContainer.css("display") !== "none") { // class check wont work here for some reason
                this._borderContainer.hide();
                this.container.visible = false;
            } else if (!this._expanded) {
                this._borderContainer.show();
                this.container.visible = true;
            }

            this.game.uiManager.ui.gasAndDebug.toggleClass("spectating-mode", !this.container.visible);
        }

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

        const gas = this.game.gas;
        this.gasRender.update(gas);
        // only re-render gas line and circle if something changed
        if (
            gas.state === GasState.Inactive || (
                this._position.x === this._lastPosition.x
                && this._position.y === this._lastPosition.y
                && gas.newRadius === this._gasRadius
                && gas.newPosition.x === this._gasPos.x
                && gas.newPosition.y === this._gasPos.y
            )
        ) return;

        this._lastPosition = this._position;
        this._gasPos = gas.newPosition;
        this._gasRadius = gas.newRadius;

        this.safeZone.clear();

        this.safeZone.beginPath();
        this.safeZone.setStrokeStyle({
            color: 0x00f9f9,
            width: 2,
            cap: "round"
        });
        // draw line from player to gas center
        this.safeZone.moveTo(this._position.x, this._position.y)
            .lineTo(this._gasPos.x, this._gasPos.y)
            .closePath().stroke();

        // draw circle
        this.safeZone.beginPath()
            .setStrokeStyle({
                color: 0xffffff,
                width: 2,
                cap: "round"
            })
            .arc(this._gasPos.x, this._gasPos.y, this._gasRadius, 0, Math.PI * 2)
            .closePath()
            .stroke();
    }

    private readonly _borderContainer = $("#minimap-border");

    resize(): void {
        this._border.visible = this._expanded;
        const uiScale = this.game.console.getBuiltInCVar("cv_ui_scale");

        if (this.game.spectating) {
            this.game.uiManager.ui.spectatingContainer.toggle(this.game.uiManager.ui.spectatingOptions.hasClass("fa-eye-slash"));
        }

        if (this._expanded) {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const smallestDim = Numeric.min(screenHeight, screenWidth);
            this.container.scale.set(smallestDim / this._height);
            // noinspection JSSuspiciousNameCombination
            this._minimapWidth = this.sprite.width * this.container.scale.x;
            this._minimapHeight = this.sprite.height * this.container.scale.y;
            this._margins = Vec.create(screenWidth / 2 - (this._minimapWidth / 2), screenHeight / 2 - (this._minimapHeight / 2));

            const closeButton = $("#btn-close-minimap");
            const closeButtonPos = Numeric.min(
                this._margins.x + this._minimapWidth + 16,
                screenWidth - (closeButton.outerWidth() ?? 0)
            ) / uiScale;
            closeButton.css("left", `${closeButtonPos}px`);

            this._border.clear();
            this._border.setStrokeStyle({
                width: 4,
                color: 0x00000
            });
            this._border.rect(-this.sprite.width / 2, 0, this.sprite.width, this.sprite.height);
            this._border.stroke();

            this.indicator.scale.set(1);
            for (const [, indicator] of this.teammateIndicators) {
                indicator.setScale(1);
            }
        } else {
            if (!this._visible) return;

            const bounds = this._borderContainer[0].getBoundingClientRect();
            const border = parseInt(this._borderContainer.css("border-width")) * uiScale;

            this._minimapWidth = bounds.width - border * 2;
            this._minimapHeight = bounds.height - border * 2;
            this._margins = Vec.create(bounds.left + border, bounds.top + border);

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

        this.mask.clear()
            .rect(this._margins.x, this._margins.y, this._minimapWidth, this._minimapHeight)
            .fill();

        this.updatePosition();
        this.updateTransparency();

        for (const text of this.placesContainer.children) {
            text.scale.set(1 / this.container.scale.x);
        }
    }

    setPosition(pos: Vector): void {
        this._position = Vec.clone(pos);
        this.indicator.setVPos(pos);
        this.updatePosition();
    }

    updatePosition(): void {
        if (this._expanded) {
            this.container.position.set(window.innerWidth / 2, window.innerHeight / 2 - this._minimapHeight / 2);
            this._objectsContainer.position.set(-this._width / 2, 0);
            return;
        }
        const pos = Vec.clone(this._position);
        pos.x -= (this._minimapWidth / 2 + this._margins.x) / this.container.scale.x;
        pos.y -= (this._minimapHeight / 2 + this._margins.y) / this.container.scale.y;

        this.container.position.set(0, 0);
        this._objectsContainer.position.copyFrom(Vec.scale(pos, -1));
    }

    private readonly _uiCache = Object.freeze({
        scopes: $<HTMLDivElement>("#scopes-container"),
        closeMinimap: $<HTMLButtonElement>("#btn-close-minimap"),
        killLeader: $<HTMLDivElement>("#ui-kill-leader"),
        centerBottom: $<HTMLDivElement>("#center-bottom-container"),
        killCounter: $<HTMLDivElement>("#kill-counter")
    });

    switchToBigMap(): void {
        this._expanded = true;

        const ui = this.game.uiManager.ui;
        this.container.visible = true;
        this._borderContainer.hide();

        this._uiCache.scopes.hide();
        ui.spectatingContainer.hide();
        ui.gasMsgInfo.hide();
        this._uiCache.closeMinimap.show();
        this._uiCache.killLeader.hide();
        this._uiCache.centerBottom.hide();
        this._uiCache.killCounter.show();
        ui.killFeed.hide();

        this.resize();
    }

    switchToSmallMap(): void {
        this._expanded = false;

        const ui = this.game.uiManager.ui;

        this._uiCache.closeMinimap.hide();
        this._uiCache.centerBottom.show();
        ui.gasMsgInfo.show();
        this._uiCache.scopes.show();
        ui.killFeed.show();

        if (this.game.spectating) ui.spectatingContainer.show();
        const width = window.innerWidth;
        if (width > 768) this._uiCache.killLeader.show();
        this._uiCache.killCounter.hide();

        // We check again for the mobile spectating stuff due to a bug
        if (this.game.inputManager.isMobile && this.game.spectating && this._visible) {
            this.game.uiManager.ui.spectatingContainer.toggleClass("mobile-visible", false);
            this.game.uiManager.ui.spectatingContainer.hide();
            this.container.visible = this.game.uiManager.ui.spectatingContainer.hasClass("mobile-visible");
        }

        if (!this._visible) {
            this.container.visible = false;
            return;
        }

        this._borderContainer.show();
        this.resize();
    }

    updateTransparency(): void {
        this.container.alpha = this.game.console.getBuiltInCVar(
            this._expanded
                ? "cv_map_transparency"
                : "cv_minimap_transparency"
        );
    }

    addMapPing(data: PingSerialization): void {
        const { position, definition } = data;
        const playerId = definition.isPlayerPing ? (data as PlayerPingSerialization).playerId : undefined;

        const ping = new MapPing(
            position,
            definition,
            this.game,
            playerId
        );

        if (definition.sound !== undefined) this.game.soundManager.play(definition.sound);

        this.pingsContainer.addChild(ping.mapImage);
        if (ping.inGameImage) this.game.camera.addObject(ping.inGameImage);

        // delete previous pings from the same player
        if (ping.definition.isPlayerPing) {
            for (const otherPing of this.pings) {
                if (
                    otherPing.definition !== ping.definition
                    || otherPing.playerId !== playerId
                ) continue;

                otherPing.destroy();
                this.pings.delete(otherPing);
            }
        }

        this.pings.add(ping);
        if (!ping.definition.ignoreExpiration) {
            this.game.addTimeout(() => {
                ping.destroy();
            }, 10000);
        }
    }
}

export class MapPing {
    readonly startTime: number;
    readonly endTime: number;
    readonly mapImage: SuroiSprite;
    readonly inGameImage?: SuroiSprite;
    readonly color: ColorSource;

    constructor(
        readonly position: Vector,
        readonly definition: MapPingDefinition,
        readonly game: Game,
        readonly playerId?: number
    ) {
        this.startTime = Date.now();
        this.endTime = this.startTime + this.definition.lifetime * 1000;

        this.color = definition.color;

        if (definition.isPlayerPing && playerId) {
            this.color = TEAMMATE_COLORS[this.game.uiManager.getTeammateColorIndex(playerId) ?? game.uiManager.teammates.findIndex(({ id }) => id === playerId)];
        }

        this.mapImage = new SuroiSprite(definition.idString)
            .setVPos(position)
            .setTint(this.color)
            .setScale(0.5);

        if (this.definition.showInGame) {
            this.inGameImage = new SuroiSprite(definition.idString)
                .setVPos(toPixiCoords(position))
                .setTint(this.color)
                .setZIndex(995);
        }
    }

    destroy(): void {
        this.mapImage.destroy();
        this.inGameImage?.destroy();
    }
}
