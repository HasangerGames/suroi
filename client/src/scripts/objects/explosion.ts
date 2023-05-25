import { type Game } from "../game";
import { type GameScene } from "../scenes/gameScene";

import { type ExplosionDefinition } from "../../../../common/src/definitions/explosions";
import { distance } from "../../../../common/src/utils/math";
import { type Vector, vMul } from "../../../../common/src/utils/vector";
import { type ObjectType } from "../../../../common/src/utils/objectType";

// custom particle class that adds friction to the velocity
class ExplosionParticle extends Phaser.GameObjects.Particles.Particle {
    friction = 0.95;

    update(delta: number, step: number, processors: Phaser.GameObjects.Particles.ParticleProcessor[]): boolean {
        const updated = super.update(delta, step, processors);
        this.velocityX *= this.friction;
        this.velocityY *= this.friction;
        return updated;
    }
}

export function explosion(game: Game, scene: GameScene, type: ObjectType, position: Vector): void {
    const definition = type.definition as ExplosionDefinition;

    const phaserPos = vMul(position, 20);

    const image = scene.add.image(phaserPos.x, phaserPos.y, "main", definition.animation.frame).setScale(0);

    const emitter = scene.add.particles(phaserPos.x, phaserPos.y, "main", {
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

    scene.tweens.add({
        targets: image,
        scale: definition.animation.scale,
        duration: definition.animation.duration,
        ease: "Expo.Out"
    });

    scene.tweens.add({
        targets: image,
        alpha: 0,
        duration: definition.animation.duration * 1.5, // the alpha animation is a bit longer so it looks nicer
        ease: "Expo.Out"
    }).on("complete", () => {
        image.destroy();
    });

    if (game?.activePlayer !== undefined && distance(game.activePlayer.position, position) <= 70) {
        scene.cameras.main.shake(definition.cameraShake.duration, definition.cameraShake.intensity);

        if (definition.sound !== undefined) scene.playSound(definition.sound);
    }
}
