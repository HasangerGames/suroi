import { GameConstants, Layer, ObjectCategory, ZIndexes } from "@common/constants";
import { type BuildingDefinition, type BuildingImageDefinition } from "@common/definitions/buildings";
import { MaterialSounds } from "@common/definitions/obstacles";
import { type Orientation } from "@common/typings";
import { CircleHitbox, GroupHitbox, PolygonHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { equivLayer } from "@common/utils/layer";
import { Angle, EaseFunctions, Numeric } from "@common/utils/math";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { randomBoolean, randomFloat, randomRotation } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { Container, Graphics } from "pixi.js";
import { Game } from "../game";
import { ParticleManager } from "../managers/particleManager";
import { SoundManager, type GameSound } from "../managers/soundManager";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS, LAYER_TRANSITION_DELAY, PIXI_SCALE } from "../utils/constants";
import { DebugRenderer } from "../utils/debugRenderer";
import { drawGroundGraphics, SuroiSprite, toPixiCoords } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import { GameObject } from "./gameObject";

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

    constructor(id: number, data: ObjectsNetData[ObjectCategory.Building]) {
        super(id);

        this.container.sortableChildren = true;
        this.containers.push(this.ceilingContainer);

        this.updateFromData(data, true);
    }

    ceilingRaycastLines?: Array<[Vector, Vector]>;

    toggleCeiling(): void {
        if (this.ceilingRaycastLines) this.ceilingRaycastLines.length = 0;

        if (this.ceilingHitbox === undefined || this.ceilingTween || (this.dead && !this.definition.hasDamagedCeiling)) return;
        const player = Game.activePlayer;
        if (player === undefined) return;

        let visible = true;

        if (this.layer === Layer.Upstairs && !Game.hideSecondFloor) {
            visible = true;
        } else if (this.ceilingHitbox.collidesWith(player.hitbox)) {
            // If the player is inside the ceiling hitbox, we know the ceiling should be hidden
            visible = false;
        } else {
            // Otherwise, we do some raycasting to check
            const visionSize = GameConstants.player.buildingVisionSize;
            const rayStart = player.position;
            const playerHitbox = new CircleHitbox(visionSize, rayStart);
            const halfPi = Math.PI / 2;
            const potentials = [
                ...Game.objects.getCategory(ObjectCategory.Obstacle),
                ...Game.objects.getCategory(ObjectCategory.Building)
            ];

            const hitboxes = this.ceilingHitbox instanceof GroupHitbox ? this.ceilingHitbox.hitboxes : [this.ceilingHitbox];
            for (const hitbox of hitboxes) {
                // TODO
                if (hitbox instanceof PolygonHitbox) continue;

                const direction = playerHitbox.getIntersection(hitbox)?.dir;
                if (!direction) continue;

                const angle = Math.atan2(direction.y, direction.x);

                let raysPenetrated = 0;
                for (let i = angle - halfPi; i < angle + halfPi; i += 0.1) {
                    const rayEnd = Vec.add(rayStart, Vec.fromPolar(i, visionSize));
                    const rayCeilingIntersection = this.ceilingHitbox.intersectsLine(rayStart, rayEnd)?.point;

                    if (DEBUG_CLIENT) {
                        (this.ceilingRaycastLines ??= []).push([rayStart, rayCeilingIntersection ?? rayEnd]);
                    }

                    if (!rayCeilingIntersection) continue;

                    let collided = false;
                    for (const { damageable, dead, isBuilding, definition, layer, hitbox } of potentials) {
                        if (
                            !damageable
                            || (dead && !(isBuilding && definition.hasDamagedCeiling))
                            || ("isWindow" in definition && definition.isWindow)
                            || !equivLayer({ layer, definition }, player)
                            || !hitbox?.intersectsLine(rayStart, rayCeilingIntersection)
                        ) continue;

                        collided = true;
                        break;
                    }
                    if (!collided) raysPenetrated++;

                    if (raysPenetrated > 1) break;
                }
                visible = raysPenetrated <= 1;

                if (!visible) break;
            }
        }

        const alpha = visible ? 1 : this.definition.ceilingHiddenAlpha ?? 0;

        this.ceilingVisible = visible;

        if (this.ceilingContainer.alpha === alpha || this.ceilingTween) return;

        this.ceilingTween = Game.addTween({
            target: this.ceilingContainer,
            to: { alpha },
            duration: LAYER_TRANSITION_DELAY,
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

            if (definition.graphics?.length) {
                this.graphics = new Graphics();
                this.graphics.zIndex = definition.graphicsZIndex ?? ZIndexes.BuildingsFloor;
                for (const graphics of definition.graphics) {
                    this.graphics.beginPath();
                    drawGroundGraphics(graphics.hitbox.transform(this.position, 1, this.orientation), this.graphics);
                    this.graphics.closePath();
                    this.graphics.fill(graphics.color);
                }
                this.containers.push(this.graphics);
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
                this.containers.push(this.mask);

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

            this.updateLayer();

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
                layer: this.layer,
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
                this.sound = SoundManager.play(sounds.normal, soundOptions);
            }

            if (
                sounds.solved
                && data.puzzle?.solved
                && this.sound?.name !== sounds.solved
            ) {
                this.sound?.stop();
                this.sound = SoundManager.play(sounds.solved, soundOptions);
            }
        }

        if (data.dead) {
            if (!this.dead && !isNew && !definition.noCeilingCollapseEffect) {
                let particleFrame = definition.ceilingCollapseParticle ?? `${definition.idString}_particle`;

                if (definition.ceilingCollapseParticleVariations) {
                    particleFrame += `_${Math.floor(Math.random() * definition.ceilingCollapseParticleVariations) + 1}`;
                }

                ParticleManager.spawnParticles(10, () => ({
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
                    SoundManager.play("puzzle_solved", {
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

        this.ceilingContainer.zIndex = (this.dead && !this.definition.hasDamagedCeiling)
            ? ZIndexes.DeadObstacles
            : this.definition.ceilingZIndex ?? ZIndexes.BuildingsCeiling;
        this.container.zIndex = this.definition.floorZIndex ?? ZIndexes.BuildingsFloor;
    }

    override updateDebugGraphics(): void {
        if (!DEBUG_CLIENT) return;

        const definition = this.definition;
        const alpha = this.layer === Game.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY;

        if (this.hitbox) {
            DebugRenderer.addHitbox(
                this.hitbox,
                HITBOX_COLORS.obstacle,
                alpha
            );
        }

        DebugRenderer.addHitbox(
            definition.spawnHitbox.transform(this.position, 1, this.orientation),
            HITBOX_COLORS.spawnHitbox,
            alpha
        );

        if (definition.ceilingHitbox) {
            DebugRenderer.addHitbox(
                definition.ceilingHitbox.transform(this.position, 1, this.orientation),
                definition.noCeilingScopeEffect ? HITBOX_COLORS.buildingScopeCeiling : HITBOX_COLORS.buildingZoomCeiling,
                alpha
            );
        }

        if (definition.bulletMask) {
            DebugRenderer.addHitbox(
                definition.bulletMask.transform(this.position, 1, this.orientation),
                HITBOX_COLORS.bulletMask,
                alpha
            );
        }

        if (definition.bridgeHitbox) {
            DebugRenderer.addHitbox(
                definition.bridgeHitbox.transform(this.position, 1, this.orientation),
                HITBOX_COLORS.landHitbox,
                alpha
            );
        }

        if (definition.bunkerSpawnHitbox) {
            DebugRenderer.addHitbox(
                definition.bunkerSpawnHitbox.transform(this.position, 1, this.orientation),
                HITBOX_COLORS.bunkerSpawnHitbox,
                Game.layer === Layer.Basement ? 1 : DIFF_LAYER_HITBOX_OPACITY
            );
        }

        for (const { collider, layer } of definition.visibilityOverrides ?? []) {
            DebugRenderer.addHitbox(
                collider.transform(this.position, 1, this.orientation),
                HITBOX_COLORS.buildingVisOverride,
                layer === Game.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY
            );
        }

        for (const [start, end] of this.ceilingRaycastLines ?? []) {
            DebugRenderer.addLine(
                start,
                end,
                HITBOX_COLORS.buildingCeilingRaycast,
                alpha
            );
        }
    }

    private _createSprites(): void {
        const { ceilingImages = [], floorImages = [] } = this.definition;

        for (const image of ceilingImages) {
            this._updateImage(image, true);
        }
        for (const image of floorImages) {
            this._updateImage(image, false);
        }

        // delete sprites not in the current definition
        const definitionSprites = new Set([...ceilingImages, ...floorImages]);
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

        if (imageDef.beachTinted) {
            image.sprite.setTint(Game.colors.beach);
        }

        const { sprite } = image;

        if (isNewSprite) {
            if (isCeiling) this.ceilingContainer.addChild(sprite);
            else this.container.addChild(sprite);
        }

        const frame = this.dead
            ? imageDef.residue ?? imageDef.damaged ?? imageDef.key
            : imageDef.key;
        sprite
            .setFrame(frame)
            .setVPos(toPixiCoords(imageDef.position))
            .setVisible(frame !== undefined && !(this.dead && imageDef.hideOnDead));

        if (imageDef.spinSpeed !== undefined ? isNewSprite : true) {
            sprite.setRotation(imageDef.rotation ?? 0);
        }

        if (imageDef.alpha) sprite.setAlpha(imageDef.alpha);

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
        ParticleManager.spawnParticle({
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
        this.hitSound = SoundManager.play(
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
