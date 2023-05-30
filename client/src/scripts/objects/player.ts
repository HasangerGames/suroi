import Phaser from "phaser";
import gsap from "gsap";

import { type Game } from "../game";
import { type GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import {
    ANIMATION_TYPE_BITS,
    AnimationType,
    ObjectCategory
} from "../../../../common/src/constants";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { type Vector, vClone } from "../../../../common/src/utils/vector";
import { randomBoolean } from "../../../../common/src/utils/random";
import { type MeleeDefinition } from "../../../../common/src/definitions/melees";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { distanceSquared } from "../../../../common/src/utils/math";

export class Player extends GameObject<ObjectCategory.Player> {
    name!: string;

    oldPosition!: Vector;

    activeItem = ObjectType.fromString(ObjectCategory.Loot, "fists");

    isNew = true;

    animationSeq!: boolean;

    readonly images: {
        readonly body: Phaser.GameObjects.Image
        readonly leftFist: Phaser.GameObjects.Image
        readonly rightFist: Phaser.GameObjects.Image
        readonly weaponImg: Phaser.GameObjects.Image
        readonly container: Phaser.GameObjects.Container
    };

    leftFistAnim!: Phaser.Tweens.Tween;
    rightFistAnim!: Phaser.Tweens.Tween;

    emitter: Phaser.GameObjects.Particles.ParticleEmitter;

    distSinceLastFootstep = 0;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Player>, id: number) {
        super(game, scene, type, id);

        const images = {
            body: this.scene.add.image(0, 0, "main", "player_base.svg"),
            leftFist: this.scene.add.image(0, 0, "main", "player_fist.svg"),
            rightFist: this.scene.add.image(0, 0, "main", "player_fist.svg"),
            weaponImg: this.scene.add.image(0, 0, "main"),
            container: undefined as unknown as Phaser.GameObjects.Container
        };
        images.container = this.scene.add.container(360, 360, [images.body, images.leftFist, images.rightFist, images.weaponImg]).setDepth(1);
        this.images = images;

        this.updateFistsPosition();

        this.emitter = this.scene.add.particles(0, 0, "main", {
            frame: "blood_particle.svg",
            quantity: 1,
            rotate: { min: 0, max: 360 },
            lifespan: 1000,
            speed: { min: 20, max: 30 },
            scale: { start: 0.75, end: 1 },
            alpha: { start: 1, end: 0 },
            emitting: false
        }).setDepth(2);
    }

    override deserializePartial(stream: SuroiBitStream): void {
        // Position and rotation
        if (this.position !== undefined) this.oldPosition = vClone(this.position);
        this.position = stream.readPosition();

        if (this.oldPosition !== undefined) {
            this.distSinceLastFootstep += distanceSquared(this.oldPosition.x, this.oldPosition.y, this.position.x, this.position.y);
            if (this.distSinceLastFootstep > 10) {
                this.scene.playSound(Math.random() < 0.5 ? "grass_step_01" : "grass_step_02");
                this.distSinceLastFootstep = 0;
            }
        }

        this.emitter.setPosition(this.position.x * 20, this.position.y * 20);
        this.rotation = stream.readRotation(16);

        if (this.isNew) {
            this.images.container.setPosition(this.position.x * 20, this.position.y * 20);
            this.images.container.setRotation(this.rotation);
        } else {
            const oldAngle = this.images.container.angle;
            const newAngle = Phaser.Math.RadToDeg(this.rotation);
            const angleBetween = Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);

            gsap.to(this.images.container, {
                x: this.position.x * 20,
                y: this.position.y * 20,
                angle: oldAngle + angleBetween,
                ease: "none",
                duration: 0.03
            });
        }

        // Animation
        const animation: AnimationType = stream.readBits(ANIMATION_TYPE_BITS);
        const animationSeq = stream.readBoolean();
        if (this.animationSeq !== animationSeq && this.animationSeq !== undefined) {
            switch (animation) {
                case AnimationType.Punch: {
                    this.updateFistsPosition();
                    const weaponDef = this.activeItem.definition as MeleeDefinition;
                    if (weaponDef.fists.useLeft === undefined) break;

                    let altFist = Math.random() < 0.5;
                    if (!weaponDef.fists.randomFist) altFist = true;

                    if (!weaponDef.fists.randomFist || !altFist) {
                        this.leftFistAnim = this.scene.tweens.add({
                            targets: this.images.leftFist,
                            x: weaponDef.fists.useLeft.x,
                            y: weaponDef.fists.useLeft.y,
                            duration: weaponDef.fists.animationDuration,
                            yoyo: true,
                            ease: Phaser.Math.Easing.Cubic.Out
                        });
                    }
                    if (altFist) {
                        this.rightFistAnim = this.scene.tweens.add({
                            targets: this.images.rightFist,
                            x: weaponDef.fists.useRight.x,
                            y: weaponDef.fists.useRight.y,
                            duration: weaponDef.fists.animationDuration,
                            yoyo: true,
                            ease: Phaser.Math.Easing.Cubic.Out
                        });
                    }

                    this.scene.playSound("swing");
                    break;
                }
            }
        }
        this.animationSeq = animationSeq;

        // Hit effect
        if (stream.readBoolean()) {
            this.emitter.emitParticle(1);
            this.scene.playSound(randomBoolean() ? "player_hit_1" : "player_hit_2");
        }

    }

    override deserializeFull(stream: SuroiBitStream): void {
        this.activeItem = stream.readObjectType() as ObjectType<ObjectCategory.Loot>;
        this.updateFistsPosition();
    }

    updateFistsPosition(): void {
        this.leftFistAnim?.destroy();
        this.rightFistAnim?.destroy();

        const weaponDef = this.activeItem.definition as GunDefinition | MeleeDefinition;
        if (this.isNew) {
            this.isNew = false;
            this.images.leftFist.setPosition(weaponDef.fists.left.x, weaponDef.fists.left.y);
            this.images.rightFist.setPosition(weaponDef.fists.right.x, weaponDef.fists.right.y);
        } else {
            this.leftFistAnim = this.scene.tweens.add({
                targets: this.images.leftFist,
                x: weaponDef.fists.left.x,
                y: weaponDef.fists.left.y,
                duration: weaponDef.fists.animationDuration,
                ease: "Linear"
            });
            this.rightFistAnim = this.scene.tweens.add({
                targets: this.images.rightFist,
                x: weaponDef.fists.right.x,
                y: weaponDef.fists.right.y,
                duration: weaponDef.fists.animationDuration,
                ease: "Linear"
            });
        }

        this.images.weaponImg.setVisible(weaponDef.image !== undefined);
        if (weaponDef.image !== undefined) {
            this.images.weaponImg.setFrame(`${weaponDef.idString}-world.svg`);
            this.images.weaponImg.setPosition(weaponDef.image.position.x, weaponDef.image.position.y);
            this.images.weaponImg.setAngle(weaponDef.image.angle);
            this.scene.playSound(`${this.activeItem.idString}_switch`);
            if (this.images.container !== undefined) this.images.container.bringToTop(this.images.body);
        } else {
            if (this.images.container !== undefined) this.images.container.sendToBack(this.images.body);
        }
    }

    destroy(): void {
        this.images.container.destroy(true);
        this.images.body.destroy(true);
        this.images.leftFist.destroy(true);
        this.images.rightFist.destroy(true);
        this.images.weaponImg.destroy(true);
        this.emitter.destroy(true);
    }
}
