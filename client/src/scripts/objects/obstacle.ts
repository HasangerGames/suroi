import { GameObject } from "../types/gameObject";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Variation } from "../../../../common/src/typings";
import { type ObstacleDefinition } from "../../../../common/src/definitions/obstacles";

export class Obstacle extends GameObject {
    scale: number;
    destroyed: boolean;

    variation: Variation;
    image: Phaser.GameObjects.Image;
    emitter: Phaser.GameObjects.Particles.ParticleEmitter;

    deserializePartial(stream: SuroiBitStream): void {
        const scale: number = stream.readScale();
        if (this.image !== undefined && scale !== this.scale) {
            this.scale = scale;
            this.image.setScale(this.scale);
            this.scene.playSound(`${(this.type.definition as ObstacleDefinition).material}_hit_${Math.random() < 0.5 ? "1" : "2"}`);
            this.emitter.emitParticle(1);
        }
        const destroyed: boolean = stream.readBoolean();
        if (!this.destroyed && destroyed) {
            this.destroyed = true;
            if (this.image !== undefined) {
                if (this.type.idString === "barrel") {
                    this.scene.cameras.main.shake(250, 0.01);
                }
                this.scene.playSound(`${(this.type.definition as ObstacleDefinition).material}_destroyed`);
                this.image.setTexture("main", `${this.type.idString}_residue.svg`);
                this.image.setRotation(this.rotation).setScale(this.scale);
                this.image.setDepth(0);
                this.emitter.explode(10);
            }
        }
    }

    deserializeFull(stream: SuroiBitStream): void {
        if (this.image !== undefined) {
            console.warn("Full update of existing obstacle");
            return;
        }
        this.position = stream.readPosition();
        const definition: ObstacleDefinition = this.type.definition as ObstacleDefinition;
        this.rotation = definition.rotation === "full" ? stream.readRotation() : 0;
        const hasVariations: boolean = definition.variations !== undefined;
        if (hasVariations) this.variation = stream.readVariation();
        let texture: string = this.type.idString;
        if (this.destroyed) texture += "_residue";
        else if (hasVariations) texture += `_${this.variation+1}`;
        this.image = this.scene.add.image(this.position.x * 20, this.position.y * 20, "main", texture + ".svg")
            .setRotation(this.rotation)
            .setScale(this.scale)
            .setDepth(this.destroyed || definition.depth === undefined ? 0 : definition.depth);
        let particleImage = `${this.type.idString}_particle`;
        //Note: For some reason this makes it where each object/rock only spews the SAME particle; I don't know how to randomize each particle.
        if (definition.particlevariations !== undefined) particleImage += `_${Math.floor(Math.random()*definition.particlevariations)+1}`;
        this.emitter = this.scene.add.particles(this.position.x * 20, this.position.y * 20, "main", {
            frame: particleImage + ".svg",
            quantity: 1,
            rotate: { min: 0, max: 360 },
            lifespan: 1500,
            speed: { min: 125, max: 175 },
            scale: { start: 1, end: 0 },
            emitting: false
        }).setDepth((definition.depth ?? 0) + 1);
    }

    destroy(): void {
        this.image.destroy(true);
    }
}
