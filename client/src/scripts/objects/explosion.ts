import type { Game } from "../game";

import { type Vector } from "../../../../common/src/utils/vector";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import type { ExplosionDefinition } from "../../../../common/src/definitions/explosions";
import { type ObjectCategory } from "../../../../common/src/constants";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { distanceSquared } from "../../../../common/src/utils/math";
import { EaseFunctions, Tween } from "../utils/tween";

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
    const pixiPos = toPixiCoords(position);

    const image = new SuroiSprite(definition.animation.frame);

    image.scale.set(0);
    image.setVPos(pixiPos);

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

    /* eslint-disable no-new */

    new Tween(game, {
        target: image.scale,
        to: { x: definition.animation.scale, y: definition.animation.scale },
        duration: definition.animation.duration,
        ease: EaseFunctions.expoOut
    });

    new Tween(game, {
        target: image,
        to: { alpha: 0 },
        duration: definition.animation.duration * 1.5, // the alpha animation is a bit longer so it looks nicer
        ease: EaseFunctions.expoOut,
        onComplete: () => {
            image.destroy();
        }
    });

    if (game?.activePlayer !== undefined && distanceSquared(game.activePlayer.position, position) <= 4900) {
        /*if (localStorageInstance.config.cameraShake) {
            scene.cameras.main.shake(definition.cameraShake.duration, definition.cameraShake.intensity);
        }*/
        if (definition.sound !== undefined) game.soundManager.play(definition.sound, position, 0.1);
    }
}
