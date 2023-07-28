import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import { type ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { ComplexHitbox, type RectangleHitbox, type Hitbox, type CircleHitbox } from "../../../../common/src/utils/hitbox";
import { type BuildingDefinition } from "../../../../common/src/definitions/buildings";
import { type Orientation } from "../../../../common/src/typings";
import { orientationToRotation } from "../utils/misc";

export class Building extends GameObject {
    readonly images: {
        floor: Phaser.GameObjects.Image
        ceilingContainer: Phaser.GameObjects.Container
        ceiling: Phaser.GameObjects.Image
        emmiter: Phaser.GameObjects.Particles.ParticleEmitter
    };

    ceilingHitbox: Hitbox;

    orientation!: Orientation;

    ceilingTween?: Phaser.Tweens.Tween;

    ceilingVisible = true;

    isNew = true;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Building, BuildingDefinition>, id: number) {
        super(game, scene, type, id);

        const definition = type.definition;
        this.images = {
            floor: scene.add.image(definition.floorImagePos.x * 20, definition.floorImagePos.y * 20, "main", `${type.idString}_floor.svg`),
            ceilingContainer: scene.add.container(),
            ceiling: scene.add.image(definition.ceilingImagePos.x * 20, definition.ceilingImagePos.y * 20, "main", `${type.idString}_ceiling.svg`),
            emmiter: scene.add.particles(0, 0, "main").setDepth(8)
        };

        this.container.add(this.images.floor).setDepth(-1);

        this.images.ceilingContainer.add(this.images.ceiling).setDepth(8);

        this.ceilingHitbox = (this.type.definition as BuildingDefinition).ceilingHitbox.clone();
    }

    toggleCeiling(visible: boolean): void {
        if (this.ceilingVisible === visible || this.ceilingTween?.isActive()) return;

        this.ceilingTween?.destroy();

        this.ceilingTween = this.scene.tweens.add({
            targets: this.images.ceilingContainer,
            alpha: visible ? 1 : 0,
            duration: 200,
            onended: () => {
                this.ceilingVisible = visible;
            }
        });
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    override deserializePartial(stream: SuroiBitStream): void {
        const dead = stream.readBoolean();

        if (dead) {
            if (dead && !this.dead && !this.isNew) {
                this.images.emmiter.setConfig({
                    frame: `${this.type.idString}_particle.svg`,
                    rotate: { min: -180, max: 180 },
                    lifespan: 1000,
                    speed: { min: 80, max: 150 },
                    alpha: { start: 1, end: 0 },
                    scale: { start: 1, end: 0.2 },
                    emitting: false,
                    // >:(
                    emitZone: new Phaser.GameObjects.Particles.Zones.RandomZone(
                        this.images.ceiling.getBounds() as Phaser.Types.GameObjects.Particles.RandomZoneSource)
                }).explode(10);
            }
            this.images.ceilingContainer.setDepth(-0.1).setAlpha(1);
            this.images.ceiling.setFrame(`${this.type.idString}_residue.svg`);
            this.ceilingTween?.destroy();
        }
        this.dead = dead;

        this.isNew = false;
    }

    override deserializeFull(stream: SuroiBitStream): void {
        this.position = stream.readPosition();

        this.orientation = stream.readBits(2) as Orientation;

        this.rotation = orientationToRotation(this.orientation);

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
        this.images.emmiter.destroy();
    }
}
