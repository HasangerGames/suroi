import gsap, { Expo } from "gsap";

import core from "../core";

import { GameObject } from "../types/gameObject";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ExplosionDefinition } from "../../../../common/src/definitions/explosions";
import { distance } from "../../../../common/src/utils/math";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { ObjectCategory } from "../../../../common/src/constants";

export class Explosion extends GameObject {
    override readonly type = ObjectType.categoryOnly(ObjectCategory.Explosion);

    image!: Phaser.GameObjects.Image;
    emitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    /* eslint-disable @typescript-eslint/no-empty-function */
    deserializePartial(stream: SuroiBitStream): void {}

    deserializeFull(stream: SuroiBitStream): void {
        stream.readObjectType();
        const definition = this.type.definition as ExplosionDefinition;

        this.position = stream.readPosition();
        this.image = this.scene.add.image(this.position.x * 20, this.position.y * 20, "main", definition.animation.frame).setScale(0);

        this.scene.add.particles(0, 0, "main", {
            frame: `${definition.particle.idParticle}_particle.svg`,
            emitZone: {
                type: "random",
                source: new Phaser.Geom.Circle(this.position.x * 20, this.position.y * 20, 350) as Phaser.Types.GameObjects.Particles.RandomZoneSource
            },
            quantity: 1,
            lifespan: definition.particle.duration * 750,
            speed: { min: 0, max: 15 },
            scale: { start: 1, end: 0.75 },
            alpha: { start: 1, end: 0.1 },
            emitting: false
        }).explode(20);

        gsap.to(this.image, {
            scale: definition.animation.scale,
            duration: definition.duration,
            ease: Expo.easeOut
        });

        void gsap.to(this.image, {
            alpha: 0,
            duration: definition.duration * 1.5,
            ease: Expo.easeOut
        }).then(() => {
            this.destroy();
        });

        if (core.game?.activePlayer !== undefined && distance(core.game.activePlayer.position, this.position) <= 70) {
            this.scene.cameras.main.shake(definition.cameraShake.duration, definition.cameraShake.intensity);
        }
    }

    destroy(): void {
        // this.emitter.destroy(true);
        this.image.destroy(true);
    }
}
