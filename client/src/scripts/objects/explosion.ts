import { GameConstants, Layer, ZIndexes } from "@common/constants";
import { type ExplosionDefinition } from "@common/definitions/explosions";
import { adjacentOrEqualLayer, getEffectiveZIndex } from "@common/utils/layer";
import { EaseFunctions } from "@common/utils/math";
import { randomFloat, randomPointInsideCircle } from "@common/utils/random";
import { FloorTypes } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { DIFF_LAYER_HITBOX_OPACITY, SHOCKWAVE_EXPLOSION_MULTIPLIERS } from "../utils/constants";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { isMobile } from "pixi.js";

export function explosion(game: Game, definition: ExplosionDefinition, position: Vector, layer: Layer): void {
    const pixiPos = toPixiCoords(position);

    const image = new SuroiSprite("explosion_1");

    const isOnSameLayer = adjacentOrEqualLayer(layer, game.layer ?? Layer.Ground);

    image.scale.set(0);
    image.tint = definition.animation.tint;
    image.setVPos(pixiPos);

    image.zIndex = getEffectiveZIndex(ZIndexes.Explosions, layer, game.layer);
    image.setVisible(isOnSameLayer);

    game.camera.addObject(image);

    game.addTween({
        target: image.scale,
        to: { x: definition.animation.scale, y: definition.animation.scale },
        duration: definition.animation.duration,
        ease: EaseFunctions.expoOut,
        onUpdate: () => {
            if (!DEBUG_CLIENT) return;
            if (!game.console.getBuiltInCVar("db_show_hitboxes")) return;

            const alpha = layer === game.activePlayer?.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY;

            const step = Math.acos(1 - ((GameConstants.explosionRayDistance / definition.radius.max) ** 2) / 2);

            for (let angle = -Math.PI; angle < Math.PI; angle += step) {
                game.debugRenderer
                    .addRay(position, angle, definition.radius.max, 0xff0000, alpha)
                    .addRay(position, angle, definition.radius.min, 0x00ff00, alpha);
            }
        }
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

    if (FloorTypes[game.map.terrain.getFloor(position, (game.layer as number))].particles) {
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

    game.camera.shake(definition.cameraShake.duration, !isOnSameLayer ? (definition.cameraShake.intensity / 2) : definition.cameraShake.intensity);
    if (game.console.getBuiltInCVar("cv_cooler_graphics") && isOnSameLayer) {
        game.camera.shockwave(
            definition.cameraShake.duration * SHOCKWAVE_EXPLOSION_MULTIPLIERS.time,
            pixiPos,
            definition.cameraShake.intensity * SHOCKWAVE_EXPLOSION_MULTIPLIERS.amplitude,
            definition.radius.min * 100 * SHOCKWAVE_EXPLOSION_MULTIPLIERS.wavelength,
            definition.ballistics.speed * SHOCKWAVE_EXPLOSION_MULTIPLIERS.speed,
            game.layer ?? Layer.Ground
        );
    }

    if (game.console.getBuiltInCVar("mb_haptics") && isMobile.any) {
        navigator.vibrate?.(
            definition.animation.duration * 0.75
        );
    }

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
