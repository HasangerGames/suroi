import type { Game } from "../game";

import { type Vector, vMul } from "../../../../common/src/utils/vector";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import type { ExplosionDefinition } from "../../../../common/src/definitions/explosions";
import { type ObjectCategory } from "../../../../common/src/constants";
import { SuroiSprite } from "../utils/pixi";
import { gsap } from "gsap";

/**
 * Custom particle class that adds friction to its velocity.
 */
/*class ExplosionParticle extends Phaser.GameObjects.Particles.Particle {
    friction = 0.95;

    update(delta: number, step: number, processors: Phaser.GameObjects.Particles.ParticleProcessor[]): boolean {
        const updated = super.update(delta, step, processors);

        this.velocityX *= this.friction;
        this.velocityY *= this.friction;

        return updated;
    }
}*/

export function explosion(game: Game, type: ObjectType<ObjectCategory.Explosion, ExplosionDefinition>, position: Vector): void {
    const definition = type.definition;
    position = vMul(position, 20);

    const image = new SuroiSprite(definition.animation.frame);

    image.scale.set(0);
    image.setPos(position.x, position.y);

    game.camera.container.addChild(image);

    /*const emitter = scene.add.particles(phaserPos.x, phaserPos.y, "main", {
        frame: definition.particles.frame,
        lifespan: definition.particles.duration,
        speed: { min: 0, max: definition.radius.max * 60 },

        // https://phaser.discourse.group/t/perticle-emitters-how-to-fade-particles-in-from-0-then-back-out-to-0/1901
        alpha: {
            onUpdate: (p: Phaser.GameObjects.Particles.Particle, k: string, t: number): number => {
                return 1 - 2 * Math.abs(t - 0.5);
            }
        },
        particleClass: ExplosionParticle,
        emitting: false
    });

    emitter.explode(definition.particles.count);

    // Destroy particle emitter.
    setTimeout(() => { emitter.destroy(); }, definition.particles.duration);*/

    gsap.to(image.scale, {
        x: definition.animation.scale,
        y: definition.animation.scale,
        duration: definition.animation.duration / 1000,
        ease: "Expo.Out"
    });

    gsap.to(image, {
        alpha: 0,
        duration: definition.animation.duration * 1.5 / 1000, // the alpha animation is a bit longer so it looks nicer
        ease: "Expo.Out",
        onComplete: () => {
            image.destroy();
        }
    });

    /*if (game?.activePlayer !== undefined && distanceSquared(game.activePlayer.position, position) <= 4900) {
        if (localStorageInstance.config.cameraShake) {
            scene.cameras.main.shake(definition.cameraShake.duration, definition.cameraShake.intensity);
        }

        if (definition.sound !== undefined) scene.playSound(definition.sound);
    }*/
}
