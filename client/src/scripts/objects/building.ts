import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import { type ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type RectangleHitbox } from "../../../../common/src/utils/hitbox";
import { type BuildingDefinition } from "../../../../common/src/definitions/buildings";
import { type Orientation } from "../../../../common/src/typings";
import { normalizeAngle } from "../../../../common/src/utils/math";

export class Building extends GameObject {
    readonly images: {
        floor: Phaser.GameObjects.Image
        ceiling: Phaser.GameObjects.Image
    };

    ceilingHitbox: RectangleHitbox;

    orientation!: Orientation;

    ceilingTween?: Phaser.Tweens.Tween;

    ceilingVisible = true;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Building>, id: number) {
        super(game, scene, type, id);

        this.images = {
            floor: scene.add.image(0, 0, "main", `${type.idString}_floor.svg`),
            ceiling: scene.add.image(0, 0, "main", `${type.idString}_ceiling.svg`).setDepth(8)
        };

        this.container.add([this.images.floor]).setDepth(-1);

        this.ceilingHitbox = (this.type.definition as BuildingDefinition).ceilingHitbox.clone();
    }

    toggleCeiling(visible: boolean): void {
        if (this.ceilingVisible === visible || this.ceilingTween?.isActive()) return;

        this.ceilingTween?.destroy();

        this.ceilingTween = this.scene.tweens.add({
            targets: this.images.ceiling,
            alpha: visible ? 1 : 0,
            duration: 200,
            onended: () => {
                this.ceilingVisible = visible;
            }
        });
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    override deserializePartial(stream: SuroiBitStream): void { }

    override deserializeFull(stream: SuroiBitStream): void {
        this.position = stream.readPosition();

        this.orientation = stream.readBits(2) as Orientation;

        this.rotation = -normalizeAngle(this.orientation * (Math.PI / 2));

        this.container.setRotation(this.rotation);
        this.images.ceiling.setPosition(this.container.x, this.container.y).setRotation(this.rotation);
        this.ceilingHitbox = this.ceilingHitbox.transform(this.position, 1, this.orientation) as RectangleHitbox;
    }

    destroy(): void {
        super.destroy();
        this.images.floor.destroy();
        this.images.ceiling.destroy();
    }
}
