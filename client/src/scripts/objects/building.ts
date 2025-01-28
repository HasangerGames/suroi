import { ObjectCategory, ZIndexes } from "@common/constants";
import { type BuildingDefinition, type BuildingImageDefinition } from "@common/definitions/buildings";
import { MaterialSounds } from "@common/definitions/obstacles";
import { type Orientation } from "@common/typings";
import { CircleHitbox, GroupHitbox, PolygonHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { equivLayer, getEffectiveZIndex, isGroundLayer } from "@common/utils/layer";
import { Angle, Collision, EaseFunctions, Numeric, type CollisionResponse } from "@common/utils/math";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { randomBoolean, randomFloat, randomRotation } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { Container, Graphics } from "pixi.js";
import { type Game } from "../game";
import { type GameSound } from "../managers/soundManager";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS, PIXI_SCALE } from "../utils/constants";
import { drawGroundGraphics, SuroiSprite, toPixiCoords } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import { GameObject } from "./gameObject";
import type { DebugRenderer } from "../utils/debugRenderer";

export class Building extends GameObject.derive(ObjectCategory.Building) {
    definition!: BuildingDefinition;

    hitbox?: Hitbox;

    graphics?: Graphics;

    ceilingContainer = new Container({ sortableChildren: true });
    ceilingHitbox?: Hitbox;
    ceilingTween?: Tween<Container>;

    orientation!: Orientation;

    ceilingVisible = false;

    puzzle: ObjectsNetData[ObjectCategory.Building]["puzzle"];

    sound?: GameSound;

    particleFrames!: string[];

    hitSound?: GameSound;

    maskHitbox?: GroupHitbox<RectangleHitbox[]>;

    mask?: Graphics;

    images = new Map<BuildingImageDefinition, {
        isCeiling: boolean
        sprite: SuroiSprite
    }>();

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.Building]) {
        super(game, id);

        this.layer = data.layer;

        this.container.sortableChildren = true;

        this.game.camera.addObject(this.ceilingContainer);

        this.updateFromData(data, true);
    }

    toggleCeiling(duration = 200): void {
        if (this.ceilingHitbox === undefined || this.ceilingTween || this.dead) return;
        const player = this.game.activePlayer;
        if (player === undefined) return;

        let visible = true;

        if (this.ceilingHitbox.collidesWith(player.hitbox)) {
            visible = false;
            duration = !isGroundLayer(player.layer) ? 0 : 200; // We do not want a ceiling tween during the layer change.
        } else {
            const visionSize = 14;

            const playerHitbox = new CircleHitbox(visionSize, player.position);

            const hitboxes = this.ceilingHitbox instanceof GroupHitbox ? this.ceilingHitbox.hitboxes : [this.ceilingHitbox];

            for (const hitbox of hitboxes) {
                // find the direction to cast rays
                let collision: CollisionResponse = null;

                switch (true) {
                    case hitbox instanceof CircleHitbox: {
                        collision = Collision.circleCircleIntersection(
                            hitbox.position,
                            hitbox.radius,
                            playerHitbox.position,
                            playerHitbox.radius
                        );
                        break;
                    }
                    case hitbox instanceof RectangleHitbox: {
                        collision = Collision.rectCircleIntersection(
                            hitbox.min,
                            hitbox.max,
                            playerHitbox.position,
                            playerHitbox.radius
                        );
                        break;
                    }
                    case hitbox instanceof PolygonHitbox: {
                        // TODO
                        break;
                    }
                }

                const direction = collision?.dir;
                if (direction) {
                    const angle = Math.atan2(direction.y, direction.x);

                    let collided = false;

                    const halfPi = Math.PI / 2;
                    for (let i = angle - halfPi; i < angle + halfPi; i += 0.1) {
                        collided = false;

                        const end = this.ceilingHitbox.intersectsLine(
                            player.position,
                            Vec.add(
                                player.position,
                                Vec.scale(
                                    Vec.create(Math.cos(i), Math.sin(i)),
                                    visionSize
                                )
                            )
                        )?.point;

                        if (!end) {
                            // what's the point of this assignment?
                            collided = true;
                            continue;
                        }

                        if (!(
                            collided
                                ||= [
                                    ...this.game.objects.getCategory(ObjectCategory.Obstacle),
                                    ...this.game.objects.getCategory(ObjectCategory.Building)
                                ].some(
                                    ({ damageable, dead, definition, hitbox, layer }) =>
                                        damageable
                                        && !dead
                                        && (!("role" in definition) || !definition.isWindow)
                                        && equivLayer({ layer, definition }, player)
                                        && hitbox?.intersectsLine(player.position, end)
                                )
                        )) break;
                    }
                    visible = collided;
                } else {
                    visible = true;
                }

                if (!visible) break;
            }
        }

        const alpha = visible ? 1 : this.definition.ceilingHiddenAlpha ?? 0;

        this.ceilingVisible = visible;

        if (this.ceilingContainer.alpha === alpha || this.ceilingTween) return;

        this.ceilingTween = this.game.addTween({
            target: this.ceilingContainer,
            to: { alpha },
            duration,
            ease: EaseFunctions.sineOut,
            onComplete: () => {
                this.ceilingTween = undefined;
            }
        });
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Building], isNew = false): void {
        if (data.full) {
            const full = data.full;
            const definition = this.definition = full.definition;
            this.position = full.position;

            // If there are multiple particle variations, generate a list of variation image names
            const particleImage = definition.particle ?? `${definition.idString}_particle`;

            this.particleFrames = definition.particleVariations !== undefined
                ? Array.from({ length: definition.particleVariations }, (_, i) => `${particleImage}_${i + 1}`)
                : [particleImage];

            this.layer = data.layer;
            const pos = toPixiCoords(this.position);
            this.container.position.copyFrom(pos);
            this.ceilingContainer.position.copyFrom(pos);

            this.orientation = full.orientation;
            this.rotation = Angle.orientationToRotation(this.orientation);
            this.container.rotation = this.rotation;
            this.ceilingContainer.rotation = this.rotation;

            if (definition.graphics.length) {
                this.graphics = new Graphics();
                this.graphics.zIndex = getEffectiveZIndex(definition.graphicsZIndex, this.layer, this.game.layer);
                for (const graphics of definition.graphics) {
                    this.graphics.beginPath();
                    drawGroundGraphics(graphics.hitbox.transform(this.position, 1, this.orientation), this.graphics);
                    this.graphics.closePath();
                    this.graphics.fill(graphics.color);
                }
                this.game.camera.container.addChild(this.graphics);
            }

            for (const override of definition.visibilityOverrides ?? []) {
                this.maskHitbox ??= new GroupHitbox();

                const collider: Hitbox = override.collider.transform(this.position, 1, this.orientation);
                if (collider instanceof RectangleHitbox) {
                    this.maskHitbox.hitboxes.push(collider);
                } else if (collider instanceof GroupHitbox) {
                    for (const hitbox of (collider).hitboxes) {
                        this.maskHitbox.hitboxes.push(hitbox as RectangleHitbox);
                    }
                }
            }

            if (definition.bulletMask) {
                (this.maskHitbox ??= new GroupHitbox()).hitboxes.push(definition.bulletMask.transform(this.position, 1, this.orientation));
            }

            if (this.maskHitbox) {
                this.mask = new Graphics();
                this.mask.alpha = 0;
                this.game.camera.container.addChild(this.mask);

                for (const hitbox of this.maskHitbox.hitboxes) {
                    const { min, max } = hitbox;
                    this.mask
                        .beginPath()
                        .rect(
                            min.x * PIXI_SCALE,
                            min.y * PIXI_SCALE,
                            (max.x - min.x) * PIXI_SCALE,
                            (max.y - min.y) * PIXI_SCALE
                        )
                        .closePath()
                        .fill(0xffffff);
                }
            }

            this.hitbox = definition.hitbox?.transform(this.position, 1, this.orientation);
            this.damageable = !!definition.hitbox;
            this.ceilingHitbox = definition.ceilingHitbox?.transform(this.position, 1, this.orientation);
        }

        const definition = this.definition;

        if (definition === undefined) {
            console.warn("Building partially updated before being fully updated");
        }

        if (definition.sounds) {
            const { sounds } = definition;
            const soundOptions = {
                position: Vec.add(Vec.rotate(sounds.position ?? Vec.create(0, 0), this.rotation), this.position),
                fallOff: sounds.falloff,
                maxRange: sounds.maxRange,
                dynamic: true,
                ambient: true,
                loop: true
            };

            if (
                sounds.normal
                && !data.puzzle?.solved
                && this.sound?.name !== sounds.normal
            ) {
                this.sound?.stop();
                this.sound = this.game.soundManager.play(sounds.normal, soundOptions);
            }

            if (
                sounds.solved
                && data.puzzle?.solved
                && this.sound?.name !== sounds.solved
            ) {
                this.sound?.stop();
                this.sound = this.game.soundManager.play(sounds.solved, soundOptions);
            }
        }

        if (data.dead) {
            if (!this.dead && !isNew) {
                let particleFrame = definition.ceilingCollapseParticle ?? `${definition.idString}_particle`;

                if (definition.ceilingCollapseParticleVariations) {
                    particleFrame += `_${Math.floor(Math.random() * definition.ceilingCollapseParticleVariations) + 1}`;
                }

                this.game.particleManager.spawnParticles(10, () => ({
                    frames: particleFrame,
                    position: this.ceilingHitbox?.randomPoint() ?? { x: 0, y: 0 },
                    zIndex: Numeric.max(ZIndexes.Players + 1, 4),
                    layer: this.layer,
                    lifetime: 2000,
                    rotation: {
                        start: randomRotation(),
                        end: randomRotation()
                    },
                    alpha: {
                        start: 1,
                        end: 0,
                        ease: EaseFunctions.sexticIn
                    },
                    scale: { start: (definition.ceilingCollapseParticle ? 2 : 1), end: 0.2 },
                    speed: Vec.fromPolar(randomRotation(), randomFloat(1, 2))
                }));

                this.playSound(
                    definition.ceilingCollapseSound ?? "ceiling_collapse",
                    {
                        falloff: 0.5,
                        maxRange: 96
                    }
                );
            }
            this.ceilingTween?.kill();
            this.ceilingContainer.alpha = 1;
        }
        this.dead = data.dead;

        if (data.puzzle) {
            if (!isNew && data.puzzle.errorSeq !== this.puzzle?.errorSeq) {
                this.playSound("puzzle_error");
            }

            if (!isNew && data.puzzle.solved) {
                if (definition.puzzle?.solvedSound) {
                    this.game.soundManager.play("puzzle_solved", {
                        position: definition.puzzle.soundPosition
                            ? Vec.addAdjust(this.position, definition.puzzle.soundPosition, this.orientation)
                            : this.position,
                        layer: this.layer
                    });
                }
            }
        }
        this.puzzle = data.puzzle;

        this._createSprites();

        this.toggleCeiling();

        this.updateZIndex();
    }

    override updateZIndex(): void {
        if (this.dead) {
            this.ceilingContainer.zIndex = getEffectiveZIndex(ZIndexes.DeadObstacles, this.layer, this.game.layer);
        } else {
            this.ceilingContainer.zIndex = getEffectiveZIndex(
                this.definition.ceilingZIndex,
                this.layer + Numeric.clamp(Math.max( // make sure the ceiling appears over everything else
                    ...this.definition.obstacles.map(({ layer }) => layer ?? 0),
                    ...this.definition.subBuildings.map(({ layer }) => layer ?? 0)
                ), 0, Infinity),
                this.game.layer
            );
        }
        this.container.zIndex = getEffectiveZIndex(this.definition.floorZIndex, this.layer, this.game.layer);
    }

    override updateDebugGraphics(debugRender: DebugRenderer): void {
        if (!DEBUG_CLIENT) return;

        const definition = this.definition;
        const alpha = this.layer === this.game.activePlayer?.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY;

        if (this.hitbox) {
            debugRender.addHitbox(
                this.hitbox,
                HITBOX_COLORS.obstacle,
                this.game.activePlayer !== undefined && equivLayer(this, this.game.activePlayer) ? 1 : DIFF_LAYER_HITBOX_OPACITY
            );
        }

        debugRender.addHitbox(
            definition.spawnHitbox.transform(this.position, 1, this.orientation),
            HITBOX_COLORS.spawnHitbox,
            alpha
        );

        if (definition.ceilingHitbox) {
            debugRender.addHitbox(
                definition.ceilingHitbox.transform(this.position, 1, this.orientation),
                definition.ceilingScopeEffect ? HITBOX_COLORS.buildingZoomCeiling : HITBOX_COLORS.buildingScopeCeiling,
                alpha
            );
        }

        if (definition.bulletMask) {
            debugRender.addHitbox(
                definition.bulletMask.transform(this.position, 1, this.orientation),
                HITBOX_COLORS.bulletMask,
                alpha
            );
        }

        if (definition.bridgeHitbox) {
            debugRender.addHitbox(
                definition.bridgeHitbox.transform(this.position, 1, this.orientation),
                HITBOX_COLORS.landHitbox,
                alpha
            );
        }

        for (const { collider, layer } of definition.visibilityOverrides ?? []) {
            debugRender.addHitbox(
                collider.transform(this.position, 1, this.orientation),
                HITBOX_COLORS.buildingVisOverride,
                layer === this.game.activePlayer?.layer as number | undefined ? 1 : DIFF_LAYER_HITBOX_OPACITY
            );
        }
    }

    private _createSprites(): void {
        const { definition } = this;

        for (const image of definition.ceilingImages) {
            this._updateImage(image, true);
        }
        for (const image of definition.floorImages) {
            this._updateImage(image, false);
        }

        // delete sprites not in the current definition
        const definitionSprites = new Set([...definition.ceilingImages, ...definition.floorImages]);
        for (const [definition, image] of this.images) {
            if (definitionSprites.has(definition)) continue;
            image.sprite.destroy();
            this.images.delete(definition);
        }
    }

    private _updateImage(imageDef: BuildingImageDefinition, isCeiling: boolean): void {
        const isNewSprite = !this.images.has(imageDef);

        const image = this.images.get(imageDef) ?? {
            sprite: new SuroiSprite(),
            definition: imageDef,
            isCeiling
        };
        this.images.set(imageDef, image);

        const { sprite } = image;

        if (isNewSprite) {
            if (isCeiling) this.ceilingContainer.addChild(sprite);
            else this.container.addChild(sprite);
        }

        let key = imageDef.key;
        if (this.dead && imageDef.residue) key = imageDef.residue;
        sprite.setFrame(key);

        if (isCeiling) {
            sprite.setVisible(this.dead ? !!imageDef.residue : !!imageDef.key);
        } else {
            sprite.setVisible(true);
        }

        sprite.setVPos(toPixiCoords(imageDef.position));

        if (imageDef.spinSpeed !== undefined ? isNewSprite : true) {
            sprite.setRotation(imageDef.rotation ?? 0);
        }

        sprite.setZIndex(imageDef.zIndex ?? 0);

        if (imageDef.scale) sprite.scale = (this.definition.resetCeilingResidueScale && this.dead) ? 1 : imageDef.scale;

        if (imageDef.tint !== undefined) sprite.setTint(imageDef.tint);
    }

    override update(): void {
        for (const [definition, image] of this.images) {
            if (definition.spinSpeed && (definition.spinOnSolve ? this.puzzle?.solved : true)) {
                image.sprite.rotation += definition.spinSpeed;
            }
        }
    }

    override updateInterpolation(): void { /* bleh */ }

    hitEffect(position: Vector, angle: number): void {
        this.game.particleManager.spawnParticle({
            frames: this.particleFrames,
            position,
            zIndex: ZIndexes.Players + 1,
            layer: this.layer,
            lifetime: 600,
            scale: { start: 0.9, end: 0.2 },
            alpha: { start: 1, end: 0.65 },
            speed: Vec.fromPolar((angle + randomFloat(-0.3, 0.3)), randomFloat(2.5, 4.5))
        });

        this.hitSound?.stop();
        const { material } = this.definition;
        if (!material) return;
        this.hitSound = this.game.soundManager.play(
            `${MaterialSounds[material]?.hit ?? material}_hit_${randomBoolean() ? "1" : "2"}`,
            {
                position,
                falloff: 0.2,
                maxRange: 96,
                layer: this.layer
            }
        );
    }

    override destroy(): void {
        super.destroy();

        this.graphics?.destroy();
        this.mask?.destroy();
        this.ceilingTween?.kill();
        this.sound?.stop();

        for (const [, image] of this.images) {
            image.sprite.destroy();
        }
    }
}
