import { GameObject } from "../types/gameObject";

import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import type { Variation } from "../../../../common/src/typings";
import type { ObstacleDefinition } from "../../../../common/src/definitions/obstacles";
import { type ObjectCategory } from "../../../../common/src/constants";

export class Obstacle extends GameObject<ObjectCategory.Obstacle> {
    scale!: number;
    destroyed!: boolean;

    variation!: Variation;
    image!: Phaser.GameObjects.Image;
    emitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    override deserializePartial(stream: SuroiBitStream): void {
        const oldScale: number = this.scale;
        this.scale = stream.readScale();

        // Play a sound and emit a particle if the scale changes after the obstacle's creation and decreases
        if (this.image !== undefined && oldScale !== this.scale) {
            if (oldScale < this.scale) {
                this.image.setScale(oldScale);
            } else {
                this.image.setScale(this.scale);
                this.scene.playSound(`${(this.type.definition as ObstacleDefinition).material}_hit_${Math.random() < 0.5 ? "1" : "2"}`);
                let numParticle = 1;
                const destroyScale = (this.type.definition as ObstacleDefinition).scale.destroy;
                if ((oldScale - this.scale) * 2 > (1 - destroyScale)) {
                    numParticle = 3;
                } else if ((oldScale - this.scale) * 4 > (1 - destroyScale)) {
                    numParticle = 2;
                }
                this.emitter.emitParticle(numParticle);
            }
        }

        // Change the texture of the obstacle and play a sound when it's destroyed
        const destroyed: boolean = stream.readBoolean();
        if (!this.destroyed && destroyed) {
            this.destroyed = true;
            if (this.image !== undefined) {
                this.scene.playSound(`${(this.type.definition as ObstacleDefinition).material}_destroyed`);
                this.image.setTexture("main", `${this.type.idString}_residue.svg`);
                this.image.setRotation(this.rotation).setScale(this.scale);
                this.image.setDepth(0);
                this.emitter.explode(10);
            }
        }
    }

    override deserializeFull(stream: SuroiBitStream): void {
        // Obstacles should only be fully updated on creation
        if (this.image !== undefined) {
            console.warn("Full update of existing obstacle");
            return;
        }

        // Get position, rotation, and variations
        this.position = stream.readPosition();

        const definition: ObstacleDefinition = this.type.definition as ObstacleDefinition;
        this.rotation = stream.readObstacleRotation(definition.rotationMode);

        const hasVariations: boolean = definition.variations !== undefined;
        if (hasVariations) this.variation = stream.readVariation();

        let texture: string = this.type.idString;
        if (this.destroyed) texture += "_residue";
        else if (hasVariations) texture += `_${this.variation + 1}`;

        // Create the obstacle image
        this.image = this.scene.add.image(this.position.x * 20, this.position.y * 20, "main", `${texture}.svg`)
            .setRotation(this.rotation)
            .setScale(this.scale)
            .setDepth(this.destroyed || definition.depth === undefined ? 0 : definition.depth);

        // If there are multiple particle variations, generate a list of variation image names
        const particleImage = `${this.type.idString}_particle`;
        let frames: string[] | undefined;

        if (definition.particleVariations !== undefined) {
            frames = [];
            for (let i = 0; i < definition.particleVariations; i++) {
                frames.push(`${particleImage}_${i + 1}.svg`);
            }
        }

        // Create the particle emitter
        this.emitter = this.scene.add.particles(this.position.x * 20, this.position.y * 20, "main", {
            frame: definition.particleVariations === undefined ? `${particleImage}.svg` : frames,
            quantity: 1,
            rotate: { min: 0, max: 360 },
            lifespan: 1500,
            speed: { min: 125, max: 175 },
            scale: { start: 1, end: 0 },
            emitting: false
        }).setDepth((definition.depth ?? 0) + 1);
    }

    override destroy(): void {
        this.image.destroy(true);
        this.emitter.destroy(true);
    }
}
