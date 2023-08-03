import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import type { ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import type { ObjectType } from "../../../../common/src/utils/objectType";
import { randomBoolean } from "../../../../common/src/utils/random";

import type { ObstacleDefinition } from "../../../../common/src/definitions/obstacles";
import type { Variation, Orientation } from "../../../../common/src/typings";
import { gsap } from "gsap";
import { orientationToRotation } from "../utils/misc";
import type { Hitbox } from "../../../../common/src/utils/hitbox";
import { calculateDoorHitboxes } from "../../../../common/src/utils/math";
import { SuroiSprite } from "../utils/pixi";

export class Obstacle extends GameObject<ObjectCategory.Obstacle, ObstacleDefinition> {
    scale!: number;
    destroyed!: boolean;

    variation!: Variation;

    image: SuroiSprite;
    // emitter: Phaser.GameObjects.Particles.ParticleEmitter;

    isDoor?: boolean;
    door?: {
        closedHitbox?: Hitbox
        openHitbox?: Hitbox
        openAltHitbox?: Hitbox
        hitbox?: Hitbox
        offset: number
    };

    isNew = true;

    hitEffect = 0;

    constructor(game: Game, type: ObjectType<ObjectCategory.Obstacle, ObstacleDefinition>, id: number) {
        super(game, type, id);

        // the image and emitter key, position and other properties are set after the obstacle is deserialized
        this.image = new SuroiSprite(); //.setAlpha(0.5);
        this.container.addChild(this.image);
        // // Adding the emitter to the container messes up the layering of particles and they will appear bellow loot
        // this.emitter = this.scene.add.particles(0, 0, "main");

        const definition = this.type.definition;

        this.isDoor = this.type.definition.isDoor;
        if (this.isDoor) {
            this.door = { offset: 0 };
            this.image.anchor.set(0, 0.5);
        }

        if (definition.invisible) this.container.visible = false;
    }

    override deserializePartial(stream: SuroiBitStream): void {
        this.scale = stream.readScale();
        const destroyed = stream.readBoolean();

        const definition = this.type.definition;

        const hitEffect = stream.readBits(3);

        if (this.hitEffect !== hitEffect && !this.isNew && !destroyed) {
            // this.scene.playSound(`${definition.material}_hit_${randomBoolean() ? "1" : "2"}`);

            // if (!definition.indestructible) this.emitter.emitParticle(1);
        }
        this.hitEffect = hitEffect;

        if (definition.isDoor && this.door !== undefined) {
            const offset = stream.readBits(2);

            if (offset !== this.door.offset) {
                this.door.offset = offset;
                if (!this.isNew) {
                    // if (offset === 0) this.scene.playSound("door_close");
                    // else this.scene.playSound("door_open");
                    gsap.to(this.image, {
                        rotation: orientationToRotation(offset),
                        duration: 0.2
                    });
                } else {
                    this.image.setRotation(orientationToRotation(this.door.offset));
                }

                if (this.door.offset === 1) {
                    this.door.hitbox = this.door.openAltHitbox?.clone();
                } else if (this.door.offset === 3) {
                    this.door.hitbox = this.door.openHitbox?.clone();
                } else {
                    this.door.hitbox = this.door.closedHitbox?.clone();
                }
            }
        }

        this.image.scale.set(this.destroyed ? 1 : this.scale);

        // Change the texture of the obstacle and play a sound when it's destroyed
        if (!this.destroyed && destroyed) {
            this.destroyed = true;
            if (!this.isNew) {
                // this.scene.playSound(`${definition.material}_destroyed`);
                if (definition.noResidue) {
                    this.image.setVisible(false);
                } else {
                    this.image.setFrame(`${definition.frames?.residue ?? `${definition.idString}_residue`}.svg`);
                }
                this.container.rotation = this.rotation;
                this.container.scale.set(this.scale);
                // this.emitter.explode(10);
            }
        }
        this.container.zIndex = this.destroyed ? 0 : definition.depth ?? 0;
    }

    override deserializeFull(stream: SuroiBitStream): void {
        // Get position, rotation, and variations
        this.position = stream.readPosition();

        const definition = this.type.definition;
        if (definition.isDoor && this.door !== undefined && this.isNew) {
            let offsetX: number;
            let offsetY: number;
            if (definition.hingeOffset !== undefined) {
                offsetX = definition.hingeOffset.x * 20;
                offsetY = definition.hingeOffset.y * 20;
            } else {
                offsetX = offsetY = 0;
            }
            this.image.setPos(this.image.x + offsetX, this.image.y + offsetY);

            let orientation = stream.readBits(2) as Orientation;

            this.rotation = orientationToRotation(orientation);

            // inverted Y axis moment
            if (orientation === 1) orientation = 3;
            else if (orientation === 3) orientation = 1;

            this.door.hitbox = this.door.closedHitbox = definition.hitbox.transform(this.position, this.scale, orientation);
            ({ openHitbox: this.door.openHitbox, openAltHitbox: this.door.openAltHitbox } = calculateDoorHitboxes(definition, this.position, orientation));
        } else {
            this.rotation = stream.readObstacleRotation(definition.rotationMode);
        }

        const hasVariations = definition.variations !== undefined;
        if (hasVariations) this.variation = stream.readVariation();

        if (this.destroyed && definition.noResidue) {
            this.image.setVisible(false);
        } else {
            let texture = definition.frames?.base ?? `${definition.idString}`;
            if (this.destroyed) texture = definition.frames?.residue ?? `${definition.idString}_residue`;
            else if (hasVariations) texture += `_${this.variation + 1}`;
            // Update the obstacle image
            this.image.setFrame(`${texture}.svg`);
        }

        this.container.rotation = this.rotation;

        this.container.zIndex = this.destroyed ? 0 : definition.depth ?? 0;

        // If there are multiple particle variations, generate a list of variation image names
        const particleImage = definition.frames?.particle ?? `${definition.idString}_particle`;
        let frames: string[] | undefined;

        if (definition.particleVariations !== undefined) {
            frames = [];
            for (let i = 0; i < definition.particleVariations; i++) {
                frames.push(`${particleImage}_${i + 1}.svg`);
            }
        }

        // Update the particle emitter
        /*this.emitter.setConfig({
            frame: definition.particleVariations === undefined ? `${particleImage}.svg` : frames,
            quantity: 1,
            rotate: { min: 0, max: 360 },
            lifespan: 1500,
            speed: { min: 125, max: 175 },
            scale: { start: 1, end: 0 },
            emitting: false
        }).setDepth((definition.depth ?? 0) + 1).setPosition(this.container.x, this.container.y);*/

        this.isNew = false;
    }

    destroy(): void {
        super.destroy();
        this.image.destroy();
        // this.emitter.destroy(true);
    }
}
