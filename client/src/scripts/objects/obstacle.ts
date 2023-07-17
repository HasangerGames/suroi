import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import type { ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import type { ObjectType } from "../../../../common/src/utils/objectType";
import { randomBoolean } from "../../../../common/src/utils/random";

import type { ObstacleDefinition } from "../../../../common/src/definitions/obstacles";
import type { Variation } from "../../../../common/src/typings";

export class Obstacle extends GameObject<ObjectCategory.Obstacle, ObstacleDefinition> {
    scale!: number;
    destroyed!: boolean;

    variation!: Variation;

    image: Phaser.GameObjects.Image;
    emitter: Phaser.GameObjects.Particles.ParticleEmitter;

    isNew = true;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Obstacle, ObstacleDefinition>, id: number) {
        super(game, scene, type, id);

        // the image and emitter key, position and other properties are set after the obstacle is deserialized
        this.image = this.scene.add.image(0, 0, "main");
        this.container.add(this.image);
        // Adding the emitter to the container messes up the layering of particles and they will appear bellow loot
        this.emitter = this.scene.add.particles(0, 0, "main");
    }

    override deserializePartial(stream: SuroiBitStream): void {
        const oldScale = this.scale;
        this.scale = stream.readScale();
        const destroyed = stream.readBoolean();

        const definition = this.type.definition;

        // Play a sound and emit a particle if the scale changes after the obstacle's creation and decreases
        this.image.setScale(this.destroyed ? 1 : this.scale);
        if (oldScale !== this.scale && !this.isNew && !destroyed) {
            this.scene.playSound(`${definition.material}_hit_${randomBoolean() ? "1" : "2"}`);
            let numParticle = 1;
            const destroyScale = definition.scale.destroy;
            if ((oldScale - this.scale) * 2 > (1 - destroyScale)) {
                numParticle = 3;
            } else if ((oldScale - this.scale) * 4 > (1 - destroyScale)) {
                numParticle = 2;
            }
            this.emitter.emitParticle(numParticle);
        }

        // Change the texture of the obstacle and play a sound when it's destroyed
        if (!this.destroyed && destroyed) {
            this.destroyed = true;
            if (!this.isNew) {
                this.scene.playSound(`${definition.material}_destroyed`);
                this.image.setTexture("main", `${definition.frames?.residue ?? `${definition.idString}_residue`}.svg`);
                this.container.setRotation(this.rotation).setScale(this.scale).setDepth(0);
                this.emitter.explode(10);
            }
        }

        this.isNew = false;
    }

    override deserializeFull(stream: SuroiBitStream): void {
        // Get position, rotation, and variations
        this.position = stream.readPosition();

        const definition = this.type.definition;
        this.rotation = stream.readObstacleRotation(definition.rotationMode);

        const hasVariations = definition.variations !== undefined;
        if (hasVariations) this.variation = stream.readVariation();

        let texture = definition.frames?.base ?? `${definition.idString}`;
        if (this.destroyed) texture = definition.frames?.residue ?? `${definition.idString}_residue`;
        else if (hasVariations) texture += `_${this.variation + 1}`;
        // Update the obstacle image
        this.image.setFrame(`${texture}.svg`);

        this.container.setRotation(this.rotation)
            .setDepth(this.destroyed ? 0 : definition.depth ?? 0);

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
        this.emitter.setConfig({
            frame: definition.particleVariations === undefined ? `${particleImage}.svg` : frames,
            quantity: 1,
            rotate: { min: 0, max: 360 },
            lifespan: 1500,
            speed: { min: 125, max: 175 },
            scale: { start: 1, end: 0 },
            emitting: false
        }).setDepth((definition.depth ?? 0) + 1).setPosition(this.container.x, this.container.y);
    }

    destroy(): void {
        super.destroy();
        this.image.destroy(true);
        this.emitter.destroy(true);
    }
}
