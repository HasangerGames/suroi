import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";

import { ObjectCategory } from "../../../../common/src/constants";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { type Vector, vAdd, v } from "../../../../common/src/utils/vector";

export class Bullet {
    game: Game;
    scene: GameScene;
    image: Phaser.GameObjects.Image;

    source: ObjectType<ObjectCategory.Loot, GunDefinition>;

    initialPosition: Vector;

    moveTween: Phaser.Tweens.Tween;
    scaleTween: Phaser.Tweens.Tween;

    constructor(game: Game, scene: GameScene, stream: SuroiBitStream) {
        this.game = game;
        this.scene = scene;

        this.source = stream.readObjectTypeNoCategory<ObjectCategory.Loot, GunDefinition>(ObjectCategory.Loot);
        const ballistics = this.source.definition.ballistics;

        this.initialPosition = stream.readPosition();
        const rotation = stream.readRotation(16);
        const maxDist = ballistics.maxDistance;
        const finalPosition = vAdd(this.initialPosition, v(maxDist * Math.sin(rotation), -(maxDist * Math.cos(rotation))));

        // Spawn bullet
        this.image = scene.add.image(
            this.initialPosition.x * 20,
            this.initialPosition.y * 20,
            "main",
            `${this.source.definition.ammoType}_trail.svg`
        ).setRotation(Phaser.Math.Angle.BetweenPoints(this.initialPosition, finalPosition))
            .setDepth(3)
            .setOrigin(1, 0.5)
            .setScale(0, ballistics.tracerWidth ?? 1);

        this.moveTween = scene.tweens.add({
            targets: this.image,
            x: finalPosition.x * 20,
            y: finalPosition.y * 20,
            alpha: {
                getStart: () => ballistics.tracerOpacity?.start ?? 1,
                getEnd: () => ballistics.tracerOpacity?.end ?? 0.3
            },
            duration: maxDist / ballistics.speed,
            onComplete: (): void => {
                this.destroy();
            }
        });

        this.scaleTween = scene.tweens.add({
            targets: this.image,
            scaleX: ballistics.tracerLength ?? 1,
            duration: ballistics.speed * 500
        });
    }

    destroy(): void {
        this.moveTween.stop().destroy();
        this.scaleTween.stop().destroy();
        const ballistics = this.source.definition.ballistics;
        this.scene.tweens.add({
            targets: this.image,
            scaleX: 0,
            duration: ballistics.speed * 500 * (ballistics.tracerLength ?? 1),
            onComplete: () => {
                this.image.destroy(true);
            }
        });
    }
}
