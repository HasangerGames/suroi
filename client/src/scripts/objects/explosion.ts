import { ZIndexes } from "../../../../common/src/constants.js";
import { type ExplosionDefinition } from "../../../../common/src/definitions/explosions.js";
import { randomFloat, randomPointInsideCircle } from "../../../../common/src/utils/random.js";
import { FloorTypes } from "../../../../common/src/utils/terrain.js";
import { v, type Vector } from "../../../../common/src/utils/vector.js";
import { type Game } from "../game.js";
import { SuroiSprite, toPixiCoords } from "../utils/pixi.js";
import { EaseFunctions, Tween } from "../utils/tween.js";

export function explosion(game: Game, definition: ExplosionDefinition, position: Vector): void {
    const pixiPos = toPixiCoords(position);

    const image = new SuroiSprite("explosion_1");

    image.scale.set(0);
    image.tint = definition.animation.tint;
    image.setVPos(pixiPos);

    game.camera.addObject(image);

    /* eslint-disable no-new */

    new Tween(
        game,
        {
            target: image.scale,
            to: { x: definition.animation.scale, y: definition.animation.scale },
            duration: definition.animation.duration,
            ease: EaseFunctions.expoOut
        }
    );

    new Tween(
        game,
        {
            target: image,
            to: { alpha: 0 },
            duration: definition.animation.duration * 1.5, // the alpha animation is a bit longer so it looks nicer
            ease: EaseFunctions.expoOut,
            onComplete: () => {
                image.destroy();
            }
        }
    );

    if (FloorTypes[game.map.terrain.getFloor(position)].particles) {
        game.particleManager.spawnParticles(4, () => ({
            frames: "ripple_particle",
            zIndex: ZIndexes.Ground,
            position: randomPointInsideCircle(position, 6),
            lifetime: 1000,
            speed: v(0, 0),
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
        game.soundManager.play(definition.sound, {
            position,
            fallOff: 0.4
        });
    }
}
