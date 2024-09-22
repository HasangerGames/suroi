import { Layers, ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { MaterialSounds, type ObstacleDefinition } from "../../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../../common/src/typings";
import { CircleHitbox, RectangleHitbox, type Hitbox } from "../../../../common/src/utils/hitbox";
import { adjacentOrEqualLayer, equivLayer, getEffectiveZIndex } from "../../../../common/src/utils/layer";
import { Angle, EaseFunctions, Numeric, calculateDoorHitboxes } from "../../../../common/src/utils/math";
import { ObstacleSpecialRoles } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { random, randomBoolean, randomFloat, randomRotation } from "../../../../common/src/utils/random";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GameSound } from "../managers/soundManager";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";
import { type ParticleEmitter, type ParticleOptions } from "./particles";
import { type Player } from "./player";

export class Obstacle extends GameObject.derive(ObjectCategory.Obstacle) {
    override readonly damageable = true;

    readonly image: SuroiSprite;
    smokeEmitter?: ParticleEmitter;
    particleFrames!: string[];

    definition!: ObstacleDefinition;
    scale!: number;
    variation?: Variation;

    /**
     * `undefined` if this obstacle hasn't been updated yet, or if it's not a door obstacle
     */
    private _door?: {
        closedHitbox?: RectangleHitbox
        openHitbox?: RectangleHitbox
        openAltHitbox?: RectangleHitbox
        hitbox?: RectangleHitbox
        offset: number
        locked?: boolean
    };

    get door(): {
        readonly closedHitbox?: RectangleHitbox
        readonly openHitbox?: RectangleHitbox
        readonly openAltHitbox?: RectangleHitbox
        readonly hitbox?: RectangleHitbox
        readonly offset: number
        readonly locked?: boolean
    } | undefined { return this._door; }

    get isDoor(): boolean { return this._door !== undefined; }

    activated?: boolean;
    hitbox!: Hitbox;
    orientation: Orientation = 0;

    hitSound?: GameSound;

    notOnCoolDown = true;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.Obstacle]) {
        super(game, id);

        this.image = new SuroiSprite();
        this.container.addChild(this.image);

        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Obstacle], isNew = false): void {
        let texture: string | undefined;

        if (data.full) {
            const full = data.full;

            const definition = this.definition = full.definition;
            this.position = full.position;
            this.rotation = full.rotation.rotation;
            this.orientation = full.rotation.orientation;
            this.layer = full.layer;
            this.variation = full.variation;

            if (this.definition.detector && full.detectedMetal && this.notOnCoolDown) {
                this.game.soundManager.play("detection", {
                    falloff: 0.25,
                    position: Vec.create(this.position.x + 20, this.position.y - 20),
                    maxRange: 200
                });
                this.notOnCoolDown = false;
                setTimeout(() => {
                    this.notOnCoolDown = true;
                }, 1000);
            }

            if (definition.invisible) this.container.visible = false;

            // If there are multiple particle variations, generate a list of variation image names
            const particleImage = definition.frames.particle ?? `${definition.idString}_particle`;

            this.particleFrames = definition.particleVariations !== undefined
                ? Array.from({ length: definition.particleVariations }, (_, i) => `${particleImage}_${i + 1}`)
                : [particleImage];

            if ((definition.explosion ?? ("emitParticles" in definition)) && !this.smokeEmitter) {
                this.smokeEmitter = this.game.particleManager.addEmitter({
                    delay: 400,
                    active: false,
                    spawnOptions: () => ({
                        frames: "smoke_particle",
                        position: this.position,
                        layer: this.layer,
                        zIndex: Math.max((definition.zIndex ?? ZIndexes.ObstaclesLayer1) + 1, ZIndexes.Players),
                        lifetime: 3500,
                        scale: { start: 0, end: randomFloat(4, 5) },
                        alpha: { start: 0.9, end: 0 },
                        speed: Vec.fromPolar(randomFloat(-1.9, -2.1), randomFloat(5, 6))
                    })
                });
            }

            if (definition.sound && !definition.role && !this.destroyed) {
                if ("names" in definition.sound) definition.sound.names.forEach(name => this.playSound(name, definition.sound));
                else this.playSound(definition.sound.name, definition.sound);
            }

            if (this.activated !== full.activated) {
                this.activated = full.activated;

                if (!isNew && !this.destroyed) {
                    if (definition.isActivatable && definition.sound) {
                        if ("names" in definition.sound) definition.sound.names.forEach(name => this.playSound(name, definition.sound));
                        else this.playSound(definition.sound.name, definition.sound);
                    }

                    // :martletdeadass:
                    // FIXME idString check, hard coded behavior
                    if (this.definition.idString === "airdrop_crate_locked") {
                        const options = (minSpeed: number, maxSpeed: number): Partial<ParticleOptions> => ({
                            zIndex: Math.max((this.definition.zIndex ?? ZIndexes.Players) + 1, 4),
                            lifetime: 1000,
                            scale: {
                                start: randomFloat(0.85, 0.95),
                                end: 0,
                                ease: EaseFunctions.quarticIn
                            },
                            alpha: {
                                start: 1,
                                end: 0,
                                ease: EaseFunctions.sexticIn
                            },
                            rotation: { start: randomRotation(), end: randomRotation() },
                            speed: Vec.fromPolar(randomRotation(), randomFloat(minSpeed, maxSpeed))
                        });

                        this.game.particleManager.spawnParticle({
                            frames: "airdrop_particle_1",
                            position: this.position,
                            ...options(8, 18),
                            rotation: { start: 0, end: randomFloat(Math.PI / 2, Math.PI * 2) }
                        } as ParticleOptions);

                        texture = "airdrop_crate_unlocking";

                        this.addTimeout(() => {
                            this.game.particleManager.spawnParticles(2, () => ({
                                frames: "airdrop_particle_2",
                                position: this.hitbox.randomPoint(),
                                ...options(4, 9)
                            } as ParticleOptions));
                            this.game.particleManager.spawnParticles(2, () => ({
                                frames: "airdrop_particle_3",
                                position: this.hitbox.randomPoint(),
                                ...options(4, 9)
                            } as ParticleOptions));
                        }, 800);
                    }
                }
            }

            this.updateDoor(full, isNew);
        }

        const definition = this.definition;

        this.scale = data.scale;

        const destroyScale = definition.scale?.destroy ?? 1;
        const scaleFactor = (this.scale - destroyScale) / ((definition.scale?.spawnMax ?? 1) - destroyScale);

        if (this.smokeEmitter) {
            this.smokeEmitter.active = !this.dead

            && (("emitParticles" in definition && this.activated) || (scaleFactor > 0 && scaleFactor < 0.5));

            if ("emitParticles" in definition) this.smokeEmitter.delay = 300;
            else this.smokeEmitter.delay = Numeric.lerp(150, 3000, scaleFactor);
        }

        this.container.scale.set(this.dead ? 1 : this.scale);

        // Change the texture of the obstacle and play a sound when it's destroyed
        if (!this.dead && data.dead) {
            this.dead = true;
            if (!isNew && !("replaceWith" in definition && definition.replaceWith)) {
                const playSound = (name: string): void => {
                    this.playSound(name, {
                        falloff: 0.2,
                        maxRange: 96
                    });
                };
                playSound(`${MaterialSounds[definition.material]?.destroyed ?? definition.material}_destroyed`);
                for (const sound of definition.additionalDestroySounds) playSound(sound);

                if (definition.noResidue) {
                    this.image.setVisible(false);
                } else {
                    this.image.setFrame(definition.frames.residue ?? `${definition.idString}_residue`);
                }

                this.container.rotation = this.rotation;
                this.container.scale.set(this.scale);

                if (this.smokeEmitter) {
                    this.smokeEmitter.active = false;
                    this.smokeEmitter.destroy();
                }

                this.game.particleManager.spawnParticles(10, () => ({
                    frames: this.particleFrames,
                    position: this.hitbox.randomPoint(),
                    layer: this.layer,
                    zIndex: (definition.zIndex ?? ZIndexes.ObstaclesLayer1) + 1,
                    lifetime: 1500,
                    rotation: {
                        start: randomRotation(),
                        end: randomRotation()
                    },
                    scale: {
                        start: randomFloat(0.85, 0.95),
                        end: 0,
                        ease: EaseFunctions.quarticIn
                    },
                    alpha: {
                        start: 1,
                        end: 0,
                        ease: EaseFunctions.sexticIn
                    },
                    speed: Vec.fromPolar(randomRotation(), randomFloat(4, 9) * (definition.explosion ? 3 : 1))
                }));
            }
        }

        this.updateZIndex();

        if (this._door === undefined) {
            this.hitbox = definition.hitbox.transform(this.position, this.scale, this.orientation);
        }

        const pos = toPixiCoords(this.position);
        this.container.position.copyFrom(pos);

        this.image.setVisible(!(this.dead && definition.noResidue));

        texture ??= !this.dead
            ? this.activated && definition.frames.activated
                ? definition.frames.activated
                : definition.frames.base ?? definition.idString
            : definition.frames.residue ?? `${definition.idString}_residue`;

        if (this.variation !== undefined && !this.dead) {
            texture += `_${this.variation + 1}`;
        }

        if (!definition.invisible && !(this.dead && definition.noResidue)) {
            this.image.setFrame(texture);
        }

        if (definition.tint !== undefined) {
            this.image.setTint(definition.tint);
        }

        this.container.rotation = this.rotation;

        this.updateDebugGraphics();
    }

    override updateZIndex(): void {
        const zIndex = this.dead
            ? this.doOverlay()
                ? ZIndexes.UnderWaterDeadObstacles
                : ZIndexes.DeadObstacles
            : this.definition.zIndex ?? ZIndexes.ObstaclesLayer1;
        this.container.zIndex = getEffectiveZIndex(zIndex, this.layer, this.game.layer);

        // hides bunker doors on ground layer
        if (this.definition.visibleFromLayers === Layers.All && this.game.activePlayer !== undefined) {
            this.container.visible = adjacentOrEqualLayer(this.layer, this.game.layer!);
        }
    }

    override updateDebugGraphics(): void {
        if (!HITBOX_DEBUG_MODE) return;

        const definition = this.definition;
        this.debugGraphics.clear();
        const alpha = this.game.activePlayer !== undefined && equivLayer(this, this.game.activePlayer) ? 1 : DIFF_LAYER_HITBOX_OPACITY;

        if (definition.isStair) {
            const hitbox = this.hitbox as RectangleHitbox;

            const min = toPixiCoords(hitbox.min);
            const max = toPixiCoords(hitbox.max);
            const gphx = this.debugGraphics;

            // using the same numbering system as server-side, but with array indexes
            const drawSide = [
                () => {
                    gphx.moveTo(min.x, min.y)
                        .lineTo(max.x, min.y);
                },
                () => {
                    gphx.moveTo(max.x, min.y)
                        .lineTo(max.x, max.y);
                },
                () => {
                    gphx.moveTo(max.x, max.y)
                        .lineTo(min.x, max.y);
                },
                () => {
                    gphx.moveTo(min.x, max.y)
                        .lineTo(min.x, min.y);
                }
            ];

            const { high: highDef, low: lowDef } = definition.activeEdges;
            const [high, low] = [
                Numeric.absMod(highDef - this.orientation, 4),
                Numeric.absMod(lowDef - this.orientation, 4)
            ];

            if (Math.abs(high - low) === 1) {
                for (let i = 0; i < 4; i++) {
                    let color: 0xff0000 | 0x00ff00 = 0xff0000;
                    let width = 4;
                    switch (true) {
                        case i === high: { // active edge
                            color = 0xff0000;
                            break;
                        }
                        case i === low: { // active edge
                            color = 0x00ff00;
                            break;
                        }
                        case Math.abs(i - low) === 2: { // opposite of low edge -> high edge
                            color = 0xff0000;
                            width = 2;
                            break;
                        }
                        case Math.abs(i - high) === 2: { // opposite of high edge -> low edge
                            color = 0x00ff00;
                            width = 2;
                            break;
                        }
                    }

                    gphx.setStrokeStyle({ color, width, alpha })
                        .beginPath();
                    drawSide[i]();
                    gphx.closePath()
                        .stroke();
                }

                // determine the line's endpoints
                const [vertexA, vertexB] = high + low === 3
                    ? [min, max]
                    : [
                        { x: max.x, y: min.y },
                        { x: min.x, y: max.y }
                    ];
                const ratio = (vertexB.y - vertexA.y) / (vertexB.x - vertexA.x);
                const protrusion = Math.min(50, 50 / ratio);

                gphx.setStrokeStyle({ color: 0xffff00, width: 2, alpha })
                    .beginPath()
                    .moveTo(vertexA.x - protrusion, vertexA.y - protrusion * ratio)
                    .lineTo(vertexA.x, vertexA.y)
                    .moveTo(vertexB.x, vertexB.y)
                    .lineTo(vertexB.x + protrusion, vertexB.y + protrusion * ratio)
                    .stroke()
                    .setStrokeStyle({ color: 0xffff00, alpha: 0.25 * alpha, width: 2 })
                    .beginPath()
                    .moveTo(vertexA.x, vertexA.y)
                    .lineTo(vertexB.x, vertexB.y)
                    .closePath()
                    .stroke();
            } else {
                drawHitbox(
                    hitbox,
                    definition.noCollisions || this.dead
                        ? HITBOX_COLORS.obstacleNoCollision
                        : HITBOX_COLORS.stair,
                    this.debugGraphics,
                    alpha
                );

                gphx.setStrokeStyle({ color: 0xff0000, width: 4 })
                    .beginPath();
                drawSide[high]();
                gphx.closePath()
                    .stroke()
                    .setStrokeStyle({ color: 0x00ff00, width: 4 })
                    .beginPath();
                drawSide[low]();
                gphx.closePath()
                    .stroke();
            }
        } else {
            drawHitbox(
                this.hitbox,
                definition.noCollisions || this.dead
                    ? HITBOX_COLORS.obstacleNoCollision
                    : HITBOX_COLORS.obstacle,
                this.debugGraphics,
                alpha
            );
        }

        if (definition.isDoor && definition.operationStyle !== "slide") {
            drawHitbox(
                new CircleHitbox(0.2, Vec.addAdjust(this.position, definition.hingeOffset, this.orientation)),
                HITBOX_COLORS.obstacleNoCollision,
                this.debugGraphics,
                alpha
            );
        }

        if (definition.spawnHitbox) {
            drawHitbox(
                definition.spawnHitbox.transform(this.position, 1, this.orientation),
                HITBOX_COLORS.spawnHitbox,
                this.debugGraphics,
                alpha
            );
        }
    }

    updateDoor(data: ObjectsNetData[ObjectCategory.Obstacle]["full"], isNew = false): void {
        if (!data?.door || data.definition.role !== ObstacleSpecialRoles.Door) return;
        const definition = data.definition;

        if (!this._door) this._door = { offset: 0 };

        this.rotation = Angle.orientationToRotation(this.orientation);

        const hitboxes = calculateDoorHitboxes(definition, this.position, this.orientation);

        this._door.openHitbox = hitboxes.openHitbox;
        if ("openAltHitbox" in hitboxes) this._door.openAltHitbox = hitboxes.openAltHitbox;

        this._door.locked = data.door.locked;

        let backupHitbox = (definition.hitbox as RectangleHitbox).transform(this.position, this.scale, this.orientation);

        this._door.closedHitbox = backupHitbox.clone();

        switch (data.door.offset) {
            case 1: {
                backupHitbox = this._door.openHitbox.clone();
                break;
            }
            case 3: {
                // offset 3 means that this is a "swivel" door, meaning that there is an altHitbox
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                backupHitbox = this._door.openAltHitbox!.clone();
                break;
            }
        }
        this.hitbox = this._door.hitbox = backupHitbox;

        const offset = data.door.offset;
        switch (definition.operationStyle) {
            case "slide":
                if (isNew) {
                    const x = offset
                        ? (definition.slideFactor ?? 1) * (
                            this.orientation & 1
                                ? backupHitbox.min.y - backupHitbox.max.y
                                : backupHitbox.min.x - backupHitbox.max.x
                        ) * PIXI_SCALE
                        : 0;
                    this.image.setPos(x, 0);
                }
                break;
            case "swivel":
            default:
                if (isNew) this.image.setRotation(Angle.orientationToRotation(offset));
                this.image.anchor.set(0, 0.5);
                this.image.setPos(
                    definition.hingeOffset.x * PIXI_SCALE,
                    definition.hingeOffset.y * PIXI_SCALE
                );
                break;
        }

        if (isNew) {
            this._door.offset = offset;
        } else if (offset !== this._door.offset) {
            this._door.offset = offset;

            const soundName = definition.doorSound ?? "door";
            this.playSound(
                `${soundName}_${offset ? "open" : "close"}`,
                {
                    falloff: 0.3,
                    maxRange: 48
                }
            );

            if (definition.operationStyle !== "slide") {
                this.game.addTween({
                    target: this.image,
                    to: { rotation: Angle.orientationToRotation(offset) },
                    duration: definition.animationDuration ?? 150
                });
            } else {
                const x = offset
                    ? (definition.slideFactor ?? 1) * (
                        this.orientation & 1
                            ? backupHitbox.min.y - backupHitbox.max.y
                            : backupHitbox.min.x - backupHitbox.max.x
                    ) * PIXI_SCALE
                    : 0;

                this.game.addTween({
                    target: this.image.position,
                    to: { x, y: 0 },
                    duration: 150
                });
            }
        }
    }

    canInteract(player: Player): boolean {
        type DoorDef = { openOnce?: boolean, automatic?: boolean };
        return !this.dead && (
            (
                this._door !== undefined
                && !this._door.locked
                && !(this.definition as DoorDef).openOnce
                && !(this.definition as DoorDef).automatic
            ) || (
                this.definition.isActivatable === true
                && (player.activeItem.idString === this.definition.requiredItem || !this.definition.requiredItem)
                && !this.activated
            )
        );
    }

    hitEffect(position: Vector, angle: number): void {
        if (this.definition.noHitEffect) return;

        this.hitSound?.stop();

        const { material } = this.definition;
        this.hitSound = this.game.soundManager.play(
            `${MaterialSounds[material]?.hit ?? material}_hit_${this.definition.hitSoundVariations ? random(1, this.definition.hitSoundVariations) : randomBoolean() ? "1" : "2"}`,
            {
                position,
                falloff: 0.2,
                maxRange: 96,
                layer: this.layer
            }
        );

        this.game.particleManager.spawnParticle({
            frames: this.particleFrames,
            position,
            zIndex: Math.max((this.definition.zIndex ?? ZIndexes.Players) + 1, 4),
            lifetime: 600,
            layer: this.layer,
            scale: { start: 0.9, end: 0.2 },
            alpha: { start: 1, end: 0.65 },
            speed: Vec.fromPolar((angle + randomFloat(-0.3, 0.3)), randomFloat(2.5, 4.5))
        });
    }

    override destroy(): void {
        super.destroy();
        this.image.destroy();
        this.smokeEmitter?.destroy();
    }
}
