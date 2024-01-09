import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type ObstacleDefinition } from "../../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../../common/src/typings";
import { CircleHitbox, type Hitbox, type RectangleHitbox } from "../../../../common/src/utils/hitbox";
import { Angle, calculateDoorHitboxes, EaseFunctions, Numeric } from "../../../../common/src/utils/math";
import { ObstacleSpecialRoles } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { randomBoolean, randomFloat, randomRotation } from "../../../../common/src/utils/random";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { HITBOX_COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { type GameSound } from "../utils/soundManager";
import { Tween } from "../utils/tween";
import { GameObject } from "./gameObject";
import { type ParticleEmitter, type ParticleOptions } from "./particles";
import { type Player } from "./player";

export class Obstacle extends GameObject<ObjectCategory.Obstacle> {
    override readonly type = ObjectCategory.Obstacle;

    override readonly damageable = true;

    readonly image: SuroiSprite;
    smokeEmitter?: ParticleEmitter;
    particleFrames!: string[];

    definition!: ObstacleDefinition;
    scale!: number;
    variation?: Variation;
    isDoor!: boolean;
    door!: {
        closedHitbox?: RectangleHitbox
        openHitbox?: RectangleHitbox
        openAltHitbox?: RectangleHitbox
        hitbox?: RectangleHitbox
        offset: number
        locked?: boolean
    };

    activated?: boolean;
    hitbox!: Hitbox;
    orientation: Orientation = 0;

    hitSound?: GameSound;

    constructor(game: Game, id: number, data: Required<ObjectsNetData[ObjectCategory.Obstacle]>) {
        super(game, id);

        this.image = new SuroiSprite();
        this.container.addChild(this.image);

        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Obstacle], isNew = false): void {
        let texture;

        if (data.full) {
            const full = data.full;

            const definition = this.definition = full.definition;
            this.position = full.position;
            this.rotation = full.rotation.rotation;
            this.orientation = full.rotation.orientation;
            this.variation = full.variation;

            if (definition.invisible) this.container.visible = false;

            // If there are multiple particle variations, generate a list of variation image names
            const particleImage = definition.frames?.particle ?? `${definition.idString}_particle`;

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
                        zIndex: Math.max((definition.zIndex ?? ZIndexes.ObstaclesLayer1) + 1, ZIndexes.Players),
                        lifetime: 3500,
                        scale: { start: 0, end: randomFloat(4, 5) },
                        alpha: { start: 0.9, end: 0 },
                        speed: Vec.fromPolar(randomFloat(-1.9, -2.1), randomFloat(5, 6))
                    })
                });
            }

            if (this.activated !== full.activated) {
                this.activated = full.activated;

                if (!isNew && !this.destroyed) {
                    if (definition.role === ObstacleSpecialRoles.Activatable && definition.sound) {
                        if ("names" in definition.sound) definition.sound.names.forEach(name => this.playSound(name, definition.sound));
                        else this.playSound(definition.sound.name, definition.sound);
                    }

                    // fixme idString check, hard coded behavior
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

                        /* eslint-disable @typescript-eslint/consistent-type-assertions */
                        this.game.particleManager.spawnParticle({
                            frames: "airdrop_particle_1",
                            position: this.position,
                            ...options(8, 18),
                            rotation: { start: 0, end: randomFloat(Math.PI / 2, Math.PI * 2) }
                        } as ParticleOptions);

                        texture = "airdrop_crate_unlocking";

                        this.addTimeout(() => {
                            this.game.particleManager.spawnParticles(4, () => ({
                                frames: "airdrop_particle_2",
                                position: this.hitbox.randomPoint(),
                                ...options(4, 9)
                            } as ParticleOptions));
                        }, 800);
                    }
                }
            }

            this.isDoor = definition.role === ObstacleSpecialRoles.Door;

            this.updateDoor(full, isNew);
        }

        const definition = this.definition;

        this.scale = data.scale;

        const destroyScale = definition.scale?.destroy ?? 1;
        const scaleFactor = (this.scale - destroyScale) / ((definition.scale?.spawnMax ?? 1) - destroyScale);

        if (this.smokeEmitter) {
            this.smokeEmitter.active = !this.dead &&
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                (("emitParticles" in definition && this.activated) || (scaleFactor > 0 && scaleFactor < 0.5));

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
                playSound(`${definition.material}_destroyed`);
                if (definition.additionalDestroySounds) {
                    for (const sound of definition.additionalDestroySounds) playSound(sound);
                }

                if (definition.noResidue) {
                    this.image.setVisible(false);
                } else {
                    this.image.setFrame(definition.frames?.residue ?? `${definition.idString}_residue`);
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
        this.container.zIndex = this.dead ? ZIndexes.DeadObstacles : definition.zIndex ?? ZIndexes.ObstaclesLayer1;

        if (this.dead && FloorTypes[this.game.map.terrain.getFloor(this.position)].overlay) {
            this.container.zIndex = ZIndexes.UnderWaterDeadObstacles;
        }

        if (!this.isDoor) {
            this.hitbox = definition.hitbox.transform(this.position, this.scale, this.orientation);
        }

        const pos = toPixiCoords(this.position);
        this.container.position.copyFrom(pos);

        this.image.setVisible(!(this.dead && !!definition.noResidue));

        if (!texture) {
            texture = !this.dead
                ? this.activated && definition.frames?.activated
                    ? definition.frames.activated
                    : definition.frames?.base ?? `${definition.idString}`
                : definition.frames?.residue ?? `${definition.idString}_residue`;
        }

        if (this.variation !== undefined && !this.dead) texture += `_${this.variation + 1}`;

        this.image.setFrame(texture);

        if (definition.tint !== undefined) this.image.setTint(definition.tint);

        this.container.rotation = this.rotation;

        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics.clear();
            drawHitbox(
                this.hitbox,
                definition.noCollisions === true || this.dead
                    ? HITBOX_COLORS.obstacleNoCollision
                    : HITBOX_COLORS.obstacle,
                this.debugGraphics
            );

            if (definition.role === ObstacleSpecialRoles.Door && definition.operationStyle !== "slide") {
                drawHitbox(
                    new CircleHitbox(0.2, Vec.addAdjust(this.position, definition.hingeOffset, this.orientation)),
                    HITBOX_COLORS.obstacleNoCollision,
                    this.debugGraphics
                );
            }

            if (definition.spawnHitbox) {
                drawHitbox(
                    definition.spawnHitbox.transform(this.position, 1, this.orientation),
                    HITBOX_COLORS.spawnHitbox,
                    this.debugGraphics
                );
            }
        }
    }

    updateDoor(data: ObjectsNetData[ObjectCategory.Obstacle]["full"], isNew = false): void {
        if (!data?.door || data.definition.role !== ObstacleSpecialRoles.Door) return;
        const definition = data.definition;

        if (!this.door) this.door = { offset: 0 };

        this.rotation = Angle.orientationToRotation(this.orientation);

        const hitboxes = calculateDoorHitboxes(definition, this.position, this.orientation);

        this.door.openHitbox = hitboxes.openHitbox;
        if ("openAltHitbox" in hitboxes) this.door.openAltHitbox = hitboxes.openAltHitbox;

        this.door.locked = definition.locked;

        let backupHitbox = (definition.hitbox as RectangleHitbox).transform(this.position, this.scale, this.orientation);

        this.door.closedHitbox = backupHitbox.clone();

        switch (data.door.offset) {
            case 1: {
                backupHitbox = this.door.openHitbox.clone();
                break;
            }
            case 3: {
                backupHitbox = this.door.openAltHitbox!.clone();
                break;
            }
        }
        this.hitbox = this.door.hitbox = backupHitbox;

        const offset = data.door.offset;
        switch (definition.operationStyle) {
            case "slide":
                if (isNew) {
                    const x = offset ? (definition.slideFactor ?? 1) * (backupHitbox.min.x - backupHitbox.max.x) * PIXI_SCALE : 0;
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
            this.door.offset = offset;
        }

        if (offset !== this.door.offset && !isNew) {
            this.door.offset = offset;

            const soundName = definition.doorSound ?? "door";
            this.playSound(
                `${soundName}_${offset ? "open" : "close"}`,
                {
                    falloff: 0.3,
                    maxRange: 48
                }
            );

            if (definition.operationStyle !== "slide") {
                // eslint-disable-next-line no-new
                new Tween(this.game, {
                    target: this.image,
                    to: { rotation: Angle.orientationToRotation(offset) },
                    duration: definition.animationDuration ?? 150
                });
            } else {
                const x = offset ? (definition.slideFactor ?? 1) * (backupHitbox.min.x - backupHitbox.max.x) * PIXI_SCALE : 0;
                // eslint-disable-next-line no-new
                new Tween(this.game, {
                    target: this.image.position,
                    to: { x, y: 0 },
                    duration: 150
                });
            }
        }
    }

    canInteract(player: Player): boolean {
        return !this.dead && (
            (this.isDoor && !this.door?.locked) ||
            (
                this.definition.role === ObstacleSpecialRoles.Activatable &&
                (player.activeItem.idString === this.definition.requiredItem || !this.definition.requiredItem) &&
                !this.activated
            )
        );
    }

    hitEffect(position: Vector, angle: number): void {
        this.hitSound?.stop();
        this.hitSound = this.game.soundManager.play(
            `${this.definition.material}_hit_${randomBoolean() ? "1" : "2"}`,
            {
                position,
                falloff: 0.2,
                maxRange: 96
            }
        );

        this.game.particleManager.spawnParticle({
            frames: this.particleFrames,
            position,
            zIndex: Math.max((this.definition.zIndex ?? ZIndexes.Players) + 1, 4),
            lifetime: 600,
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
