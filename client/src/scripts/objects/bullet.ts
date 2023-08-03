import type { Game } from "../game";

import { ObjectCategory } from "../../../../common/src/constants";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { type Vector, vAdd, v } from "../../../../common/src/utils/vector";
import { SuroiSprite } from "../utils/pixi";
import { angleBetween } from "../../../../common/src/utils/math";
import { gsap } from "gsap";

export class Bullet {
    game: Game;
    image: SuroiSprite;

    source: ObjectType<ObjectCategory.Loot, GunDefinition>;

    initialPosition: Vector;

    moveTween: gsap.core.Tween;
    scaleTween: gsap.core.Tween;

    constructor(game: Game, stream: SuroiBitStream) {
        this.game = game;

        this.source = stream.readObjectTypeNoCategory<ObjectCategory.Loot, GunDefinition>(ObjectCategory.Loot);
        const ballistics = this.source.definition.ballistics;

        this.initialPosition = stream.readPosition();
        const rotation = stream.readRotation(16);
        const maxDist = ballistics.maxDistance;
        const finalPosition = vAdd(this.initialPosition, v(maxDist * Math.sin(rotation), -(maxDist * Math.cos(rotation))));

        this.image = new SuroiSprite(`${this.source.definition.ammoType}_trail.svg`)
        .setRotation(angleBetween(this.initialPosition, finalPosition)).setDepth(3)
        .setPos(this.initialPosition.x * 20, this.initialPosition.y * 20);

        this.image.scale.set(0, ballistics.tracerWidth ?? 1);

        this.image.anchor.set(1, 0.5);

        this.image.alpha = ballistics.tracerOpacity?.start ?? 1;

        this.moveTween = gsap.to(this.image, {
            x: finalPosition.x * 20,
            y: finalPosition.y * 20,
            alpha: ballistics.tracerOpacity?.end ?? 0.3,
            duration: maxDist / ballistics.speed / 1000,
            onComplete: (): void => {
                this.destroy();
            }
        });

        this.scaleTween = gsap.to(this.image.scale, {
            x: ballistics.tracerLength ?? 1,
            duration: ballistics.speed * 500 / 1000
        });

        this.game.pixi.stage.addChild(this.image);
    }

    destroy(): void {
        this.moveTween.kill();
        this.scaleTween.kill();
        const ballistics = this.source.definition.ballistics;
        gsap.to(this.image.scale, {
            x: 0,
            duration: ballistics.speed * 500 * (ballistics.tracerLength ?? 1) / 1000,
            onComplete: () => {
                this.image.destroy();
            }
        });
    }
}
