import type { Game } from "../game";

import { type Vector } from "../../../../common/src/utils/vector";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import type { ExplosionDefinition } from "../../../../common/src/definitions/explosions";
import { type ObjectCategory } from "../../../../common/src/constants";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { gsap } from "gsap";
import { distanceSquared } from "../../../../common/src/utils/math";

export function explosion(game: Game, type: ObjectType<ObjectCategory.Explosion, ExplosionDefinition>, position: Vector): void {
    const definition = type.definition;
    const pixiPos = toPixiCoords(position);

    const image = new SuroiSprite(definition.animation.frame);

    image.scale.set(0);
    image.setVPos(pixiPos);

    game.camera.container.addChild(image);

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

    if (game?.activePlayer !== undefined && distanceSquared(game.activePlayer.position, position) <= 4900) {
        /*if (localStorageInstance.config.cameraShake) {
            scene.cameras.main.shake(definition.cameraShake.duration, definition.cameraShake.intensity);
        }*/
        if (definition.sound !== undefined) game.soundManager.play(definition.sound, position, 0.1);
    }
}
