import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type ObstacleDefinition } from "../../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../../common/src/typings";
import { CircleHitbox, type Hitbox, type RectangleHitbox } from "../../../../common/src/utils/hitbox";
import { addAdjust, calculateDoorHitboxes, lerp, velFromAngle } from "../../../../common/src/utils/math";
import { ObstacleSpecialRoles } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { randomBoolean, randomFloat, randomRotation } from "../../../../common/src/utils/random";
import { type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";
import { HITBOX_COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE } from "../utils/constants";
import { orientationToRotation } from "../utils/misc";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { EaseFunctions, Tween } from "../utils/tween";
import { type Player } from "./player";
import { type ParticleEmitter } from "./particles";
import { MODE } from "../../../../common/src/definitions/modes";

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

    constructor(game: Game, id: number, data: Required<ObjectsNetData[ObjectCategory.Obstacle]>) {
        super(game, id);

        this.image = new SuroiSprite();
        this.container.addChild(this.image);

        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Obstacle], isNew = false): void {
        const reskin = MODE.reskin;

        if (data.full) {
            const full = data.full;

            const definition = this.definition = full.definition;
            this.position = full.position;
            this.rotation = full.rotation.rotation;
            this.orientation = full.rotation.orientation;
            this.variation = full.variation;

            if (definition.invisible) this.container.visible = false;

            // If there are multiple particle variations, generate a list of variation image names
            let particleImage = definition.frames?.particle ?? `${definition.idString}_particle`;

            if (
                reskin &&
                this.definition.idString in reskin.obstacles &&
                !reskin.obstacles[definition.idString].defaultParticles
            ) particleImage += `_${reskin.suffix}`;

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
                        speed: velFromAngle(randomFloat(-1.9, -2.1), randomFloat(5, 6))
                    })
                });
            }

            if (!this.activated && full.activated) {
                this.activated = full.activated;
                let firstRun = !isNew;
                const playGeneratorSound = (): void => {
                    if (this.destroyed) return;
                    this.playSound(firstRun ? "generator_starting" : "generator_running", undefined, undefined, playGeneratorSound);
                    firstRun = false;
                };
                playGeneratorSound();
            }

            this.isDoor = definition.role === ObstacleSpecialRoles.Door;

            this.updateDoor(full, isNew);
        }
        const definition = this.definition;

        this.scale = data.scale;

        const scaleFactor = (this.scale - definition.scale.destroy) / (definition.scale.spawnMax - definition.scale.destroy);

        if (this.smokeEmitter) {
            this.smokeEmitter.active = !this.dead &&
                (("emitParticles" in definition && this.activated) ?? scaleFactor < 0.5);

            if ("emitParticles" in definition) this.smokeEmitter.delay = 300;
            else this.smokeEmitter.delay = lerp(150, 3000, scaleFactor);
        }

        this.container.scale.set(this.dead ? 1 : this.scale);

        // Change the texture of the obstacle and play a sound when it's destroyed
        if (!this.dead && data.dead) {
            this.dead = true;
            if (!isNew) {
                this.playSound(`${definition.material}_destroyed`, 0.2, 96);

                if (definition.noResidue) {
                    this.image.setVisible(false);
                } else {
                    let texture = definition.frames?.residue ?? `${definition.idString}_residue`;
                    if (reskin && definition.idString in reskin.obstacles) texture += `_${reskin.suffix}`;
                    this.image.setFrame(texture);
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
                        ease: EaseFunctions.quartIn
                    },
                    alpha: {
                        start: 1,
                        end: 0,
                        ease: EaseFunctions.sextIn
                    },
                    speed: velFromAngle(randomRotation(), randomFloat(4, 9) * (definition.explosion ? 3 : 1))
                }));
            }
        }
        this.container.zIndex = this.dead ? ZIndexes.DeadObstacles : definition.zIndex ?? ZIndexes.ObstaclesLayer1;

        if (!this.isDoor) {
            this.hitbox = definition.hitbox.transform(this.position, this.scale, this.orientation);
        }

        const pos = toPixiCoords(this.position);
        this.container.position.copyFrom(pos);

        this.image.setVisible(!(this.dead && !!definition.noResidue));

        let texture;
        if (!this.dead) texture = definition.frames?.base ?? `${definition.idString}`;
        else texture = definition.frames?.residue ?? `${definition.idString}_residue`;

        if (this.variation !== undefined && !this.dead) texture += `_${this.variation + 1}`;

        if (reskin && definition.idString in reskin.obstacles) texture += `_${reskin.suffix}`;

        // Update the obstacle image
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
                    new CircleHitbox(0.2, addAdjust(this.position, definition.hingeOffset, this.orientation)),
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

        this.rotation = orientationToRotation(this.orientation);

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
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
                if (isNew) this.image.setRotation(orientationToRotation(offset));
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
                offset === 0 ? `${soundName}_close` : `${soundName}_open`,
                0.3,
                48
            );

            if (definition.operationStyle !== "slide") {
                // eslint-disable-next-line no-new
                new Tween(this.game, {
                    target: this.image,
                    to: { rotation: orientationToRotation(offset) },
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
        return !this.dead && ((this.isDoor && !this.door?.locked) || (this.definition.role === ObstacleSpecialRoles.Activatable && player.activeItem.idString === this.definition.requiredItem && !this.activated));
    }

    hitEffect(position: Vector, angle: number): void {
        this.game.soundManager.play(`${this.definition.material}_hit_${randomBoolean() ? "1" : "2"}`, position, 0.2, 96);

        this.game.particleManager.spawnParticle({
            frames: this.particleFrames,
            position,
            zIndex: Math.max((this.definition.zIndex ?? ZIndexes.Players) + 1, 4),
            lifetime: 600,
            scale: { start: 0.9, end: 0.2 },
            alpha: { start: 1, end: 0.65 },
            speed: velFromAngle((angle + randomFloat(-0.3, 0.3)), randomFloat(2.5, 4.5))
        });
    }

    destroy(): void {
        super.destroy();
        this.image.destroy();
        this.smokeEmitter?.destroy();
    }
}
