import type { Game } from "../game";
import { type ObjectCategory } from "../../../../common/src/constants";
import { type ExplosionDefinition } from "../../../../common/src/definitions/explosions";
import { distanceSquared } from "../../../../common/src/utils/math";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type Vector } from "../../../../common/src/utils/vector";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { EaseFunctions, Tween } from "../utils/tween";

export function explosion(game: Game, type: ObjectType<ObjectCategory.Explosion, ExplosionDefinition>, position: Vector): void {
    const definition = type.definition;
    const pixiPos = toPixiCoords(position);

    const image = new SuroiSprite("explosion_1");

    image.scale.set(0);
    image.tint = definition.animation.tint;
    image.setVPos(pixiPos);

    game.camera.container.addChild(image);

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
        game.camera.shake(definition.cameraShake.duration, definition.cameraShake.intensity);
        if (definition.sound !== undefined) game.soundManager.play(definition.sound, position, 0.4);
    }
}
