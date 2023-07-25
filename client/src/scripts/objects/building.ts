import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import { type ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { ComplexHitbox, type RectangleHitbox, type Hitbox, type CircleHitbox } from "../../../../common/src/utils/hitbox";
import { type BuildingDefinition } from "../../../../common/src/definitions/buildings";
import { type Orientation } from "../../../../common/src/typings";
import { normalizeAngle } from "../../../../common/src/utils/math";

export class Building extends GameObject {
    readonly images: {
        floor: Phaser.GameObjects.Image
        ceilingContainer: Phaser.GameObjects.Container
        ceiling: Phaser.GameObjects.Image
    };

    ceilingHitbox: Hitbox;

    orientation!: Orientation;

    ceilingTween?: Phaser.Tweens.Tween;

    ceilingVisible = true;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Building, BuildingDefinition>, id: number) {
        super(game, scene, type, id);

        const definition = type.definition;
        this.images = {
            floor: scene.add.image(definition.floorImagePos.x * 20, definition.floorImagePos.y * 20, "main", `${type.idString}_floor.svg`),
            ceilingContainer: scene.add.container(),
            ceiling: scene.add.image(definition.ceilingImagePos.x * 20, definition.ceilingImagePos.y * 20, "main", `${type.idString}_ceiling.svg`)
        };

        this.container.add(this.images.floor).setDepth(-1);

        this.images.ceilingContainer.add(this.images.ceiling).setDepth(8);

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
        this.images.ceilingContainer.setPosition(this.container.x, this.container.y).setRotation(this.rotation);

        if (!(this.ceilingHitbox instanceof ComplexHitbox)) {
            this.ceilingHitbox = this.ceilingHitbox.transform(this.position, 1, this.orientation);
        } else {
            const hitBoxes: Array<RectangleHitbox | CircleHitbox> = [];
            for (const hitbox of this.ceilingHitbox.hitBoxes) {
                // inverted Y axis moment?
                let newOrientation = this.orientation;
                if (this.orientation === 1) newOrientation = 3;
                else if (this.orientation === 3) newOrientation = 1;

                hitBoxes.push(hitbox.transform(this.position, 1, newOrientation));
            }
            this.ceilingHitbox = new ComplexHitbox(hitBoxes);
        }
    }

    destroy(): void {
        super.destroy();
        this.images.floor.destroy();
        this.images.ceilingContainer.destroy();
        this.images.ceiling.destroy();
    }
}
