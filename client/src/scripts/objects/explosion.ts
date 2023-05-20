import { GameObject } from "../types/gameObject";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ExplosionDefinition } from "../../../../common/src/definitions/explosions";
import gsap, { Expo } from "gsap";

export class Explosion extends GameObject {
    image: Phaser.GameObjects.Image;

    /* eslint-disable @typescript-eslint/no-empty-function */
    deserializePartial(stream: SuroiBitStream): void {}

    deserializeFull(stream: SuroiBitStream): void {
        this.type = stream.readObjectType();
        const definition = this.type.definition as ExplosionDefinition;

        this.position = stream.readPosition();
        this.image = this.scene.add.image(this.position.x * 20, this.position.y * 20, "main", definition.animation.frame).setScale(0);

        gsap.to(this.image, {
            scale: definition.animation.scale,
            duration: 1,
            ease: Expo.easeOut
        });

        void gsap.to(this.image, {
            alpha: 0,
            duration: 1.5,
            ease: Expo.easeOut
        }).then(() => {
            this.destroy();
        });

        this.scene.cameras.main.shake(definition.cameraShake.duration, definition.cameraShake.intensity);
    }

    destroy(): void {
        this.image.destroy(true);
    }
}
