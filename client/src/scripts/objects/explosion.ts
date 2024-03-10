import { ZIndexes } from "../../../../common/src/constants";
import { type ExplosionDefinition } from "../../../../common/src/definitions/explosions";
import { EaseFunctions } from "../../../../common/src/utils/math";
import { randomFloat, randomPointInsideCircle } from "../../../../common/src/utils/random";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";

export function explosion(game: Game, definition: ExplosionDefinition, position: Vector): void {
    const pixiPos = toPixiCoords(position);

    const image = new SuroiSprite("explosion_1");

    image.scale.set(0);
    image.tint = definition.animation.tint;
    image.setVPos(pixiPos);

    game.camera.addObject(image);

    game.addTween({
        target: image.scale,
        to: { x: definition.animation.scale, y: definition.animation.scale },
        duration: definition.animation.duration,
        ease: EaseFunctions.expoOut
    });

    game.addTween({
        target: image,
        to: { alpha: 0 },
        duration: definition.animation.duration * 1.5, // the alpha animation is a bit longer so it looks nicer
        ease: EaseFunctions.expoOut,
        onComplete: () => {
            image.destroy();
        }
    });

    if (FloorTypes[game.map.terrain.getFloor(position)].particles) {
        game.particleManager.spawnParticles(4, () => ({
            frames: "ripple_particle",
            zIndex: ZIndexes.Ground,
            position: randomPointInsideCircle(position, 6),
            lifetime: 1000,
            speed: Vec.create(0, 0),
            scale: {
                start: randomFloat(0.45, 0.55),
                end: randomFloat(2.95, 3.05)
            },
            alpha: {
                start: randomFloat(0.55, 0.65),
                end: 0
            }
        }));
    }

    game.camera.shake(definition.cameraShake.duration, definition.cameraShake.intensity);

    if (definition.sound !== undefined) {
        game.soundManager.play(
            definition.sound,
            {
                position,
                falloff: 0.4
            }
        );
    }
}
