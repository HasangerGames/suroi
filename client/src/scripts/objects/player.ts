import Phaser from "phaser";
import gsap from "gsap";

import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import type { MinimapScene } from "../scenes/minimapScene";

import { localStorageInstance } from "../utils/localStorageHandler";
import { GameObject } from "../types/gameObject";

import {
    ANIMATION_TYPE_BITS,
    AnimationType,
    ObjectCategory,
    type PlayerActions
} from "../../../../common/src/constants";

import {
    vClone,
    type Vector,
    vMul
} from "../../../../common/src/utils/vector";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { randomBoolean } from "../../../../common/src/utils/random";
import { distanceSquared } from "../../../../common/src/utils/math";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { type ItemDefinition, ItemType } from "../../../../common/src/utils/objectDefinitions";

import type { MeleeDefinition } from "../../../../common/src/definitions/melees";
import type { GunDefinition } from "../../../../common/src/definitions/guns";

const showMeleeDebugCircle = false;

export class Player extends GameObject<ObjectCategory.Player> {
    name!: string;

    oldPosition!: Vector;

    activeItem = ObjectType.fromString(ObjectCategory.Loot, "fists");

    isNew = true;

    isActivePlayer: boolean;

    animationSeq!: boolean;

    readonly images: {
        readonly body: Phaser.GameObjects.Image
        readonly leftFist: Phaser.GameObjects.Image
        readonly rightFist: Phaser.GameObjects.Image
        readonly weaponImg: Phaser.GameObjects.Image
        readonly bloodEmitter: Phaser.GameObjects.Particles.ParticleEmitter
        readonly container: Phaser.GameObjects.Container
    };

    leftFistAnim!: Phaser.Tweens.Tween;
    rightFistAnim!: Phaser.Tweens.Tween;
    weaponAnim!: Phaser.Tweens.Tween;

    distSinceLastFootstep = 0;

    action!: PlayerActions;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Player>, id: number, isActivePlayer = false) {
        super(game, scene, type, id);
        this.isActivePlayer = isActivePlayer;

        const images = {
            body: this.scene.add.image(0, 0, "main", "player_base.svg"), //.setAlpha(0.5),
            leftFist: this.scene.add.image(0, 0, "main", "player_fist.svg"),
            rightFist: this.scene.add.image(0, 0, "main", "player_fist.svg"),
            weaponImg: this.scene.add.image(0, 0, "main"), //.setAlpha(0.5),
            bloodEmitter: this.scene.add.particles(0, 0, "main", {
                frame: "blood_particle.svg",
                quantity: 1,
                rotate: { min: 0, max: 360 },
                lifespan: 1000,
                speed: { min: 20, max: 30 },
                scale: { start: 0.75, end: 1 },
                alpha: { start: 1, end: 0 },
                emitting: false
            }),
            container: undefined as unknown as Phaser.GameObjects.Container
        };
        images.container = this.scene.add.container(0, 0, [images.body, images.leftFist, images.rightFist, images.weaponImg, images.bloodEmitter]).setDepth(2);
        this.images = images;

        this.updateFistsPosition(false);
        this.updateWeapon();
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

        const phaserPos = vMul(this.position, 20);
        this.rotation = stream.readRotation(16);

        if (this.isNew || !localStorageInstance.config.movementSmoothing) {
            this.images.container.setPosition(phaserPos.x, phaserPos.y);
        } else {
            gsap.to(this.images.container, {
                x: phaserPos.x,
                y: phaserPos.y,
                ease: "none",
                duration: 0.03
            });
        }

        const oldAngle = this.images.container.angle;
        const newAngle = Phaser.Math.RadToDeg(this.rotation);
        const finalAngle = oldAngle + Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);
        const minimap = this.scene.scene.get("minimap") as MinimapScene;
        if (this.isActivePlayer && !minimap.playerIndicatorDead) {
            gsap.to(minimap.playerIndicator, {
                x: this.position.x * minimap.mapScale,
                y: this.position.y * minimap.mapScale,
                angle: finalAngle,
                ease: "none",
                duration: 0.03
            });
        }

        if (this.isNew || !localStorageInstance.config.rotationSmoothing) {
            this.images.container.setRotation(this.rotation);
        } else {
            gsap.to(this.images.container, {
                angle: finalAngle,
                ease: "none",
                duration: 0.03
            });
        }

        // Animation
        const animation: AnimationType = stream.readBits(ANIMATION_TYPE_BITS);
        const animationSeq = stream.readBoolean();
        if (this.animationSeq !== animationSeq && this.animationSeq !== undefined) {
            switch (animation) {
                case AnimationType.Melee: {
                    this.updateFistsPosition(false);
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
                    if (weaponDef.image !== undefined) {
                        this.weaponAnim = this.scene.tweens.add({
                            targets: this.images.weaponImg,
                            x: weaponDef.image.usePosition.x,
                            y: weaponDef.image.usePosition.y,
                            duration: weaponDef.fists.animationDuration,
                            angle: weaponDef.image.useAngle,
                            yoyo: true,
                            ease: Phaser.Math.Easing.Cubic.Out
                        });
                    }

                    if (showMeleeDebugCircle) {
                        const meleeDebugCircle = this.scene.add.circle(weaponDef.offset.x * 20, weaponDef.offset.y * 20, weaponDef.radius * 20, 0xff0000, 90);
                        this.images.container.add(meleeDebugCircle);
                        setTimeout(() => this.images.container.remove(meleeDebugCircle, true), 500);
                    }

                    this.scene.playSound("swing");
                    break;
                }
                case AnimationType.Gun: {
                    const weaponDef = this.activeItem.definition as GunDefinition;
                    this.scene.playSound(`${weaponDef.idString}_fire`);
                    if (weaponDef.itemType === ItemType.Gun) {
                        this.updateFistsPosition(false);
                        const recoilAmount = (20 * (1 - weaponDef.recoilMultiplier));
                        this.weaponAnim = this.scene.tweens.add({
                            targets: this.images.weaponImg,
                            x: weaponDef.image.position.x - recoilAmount,
                            duration: 50,
                            yoyo: true
                        });
                        this.leftFistAnim = this.scene.tweens.add({
                            targets: this.images.leftFist,
                            x: weaponDef.fists.left.x - recoilAmount,
                            duration: 50,
                            yoyo: true
                        });
                        this.rightFistAnim = this.scene.tweens.add({
                            targets: this.images.rightFist,
                            x: weaponDef.fists.right.x - recoilAmount,
                            duration: 50,
                            yoyo: true
                        });
                    }
                    break;
                }
                case AnimationType.GunClick: {
                    this.scene.playSound("gun_click");
                    break;
                }
            }
        }
        this.animationSeq = animationSeq;

        // Hit effect
        if (stream.readBoolean() && !this.isNew) {
            this.images.bloodEmitter.emitParticle(1);
            this.scene.playSound(randomBoolean() ? "player_hit_1" : "player_hit_2");
        }
    }

    override deserializeFull(stream: SuroiBitStream): void {
        this.activeItem = stream.readObjectType() as ObjectType<ObjectCategory.Loot>;

        if (this.isActivePlayer) {
            $("#weapon-ammo-container").toggle((this.activeItem.definition as ItemDefinition).itemType === ItemType.Gun);
        }

        this.updateFistsPosition(true);
        this.updateWeapon();
        this.isNew = false;
    }

    updateFistsPosition(anim: boolean): void {
        this.leftFistAnim?.destroy();
        this.rightFistAnim?.destroy();
        this.weaponAnim?.destroy();

        const weaponDef = this.activeItem.definition as GunDefinition | MeleeDefinition;
        if (anim) {
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
        } else {
            this.images.leftFist.setPosition(weaponDef.fists.left.x, weaponDef.fists.left.y);
            this.images.rightFist.setPosition(weaponDef.fists.right.x, weaponDef.fists.right.y);
        }
        if (weaponDef.image) {
            this.images.weaponImg.setPosition(weaponDef.image.position.x, weaponDef.image.position.y);
        }
    }

    updateWeapon(): void {
        const weaponDef = this.activeItem.definition as GunDefinition | MeleeDefinition;
        this.images.weaponImg.setVisible(weaponDef.image !== undefined);
        if (weaponDef.image) {
            if (weaponDef.itemType === ItemType.Melee) {
                this.images.weaponImg.setFrame(`${weaponDef.idString}.svg`);
            } else if (weaponDef.itemType === ItemType.Gun) {
                this.images.weaponImg.setFrame(`${weaponDef.idString}_world.svg`);
            }
            this.images.weaponImg.setPosition(weaponDef.image.position.x, weaponDef.image.position.y);
            this.images.weaponImg.setAngle(weaponDef.image.angle);

            if (this.isActivePlayer || weaponDef.idString === "deathray") this.scene.playSound(`${this.activeItem.idString}_switch`);
        }
        if (weaponDef.itemType === ItemType.Gun) {
            this.images.container.bringToTop(this.images.weaponImg);
            this.images.container.bringToTop(this.images.body);
        } else if (weaponDef.itemType === ItemType.Melee) {
            this.images.container.sendToBack(this.images.body);
            this.images.container.sendToBack(this.images.weaponImg);
        }
    }

    destroy(): void {
        this.images.container.destroy(true);
        this.images.body.destroy(true);
        this.images.leftFist.destroy(true);
        this.images.rightFist.destroy(true);
        this.images.weaponImg.destroy(true);
        this.images.bloodEmitter.destroy(true);
    }
}
