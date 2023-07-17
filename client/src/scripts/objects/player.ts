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
    GasState,
    ObjectCategory,
    PLAYER_RADIUS
} from "../../../../common/src/constants";

import { vClone, type Vector } from "../../../../common/src/utils/vector";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { randomBoolean } from "../../../../common/src/utils/random";
import { distanceSquared } from "../../../../common/src/utils/math";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { type ItemDefinition, ItemType } from "../../../../common/src/utils/objectDefinitions";

import type { MeleeDefinition } from "../../../../common/src/definitions/melees";
import type { GunDefinition } from "../../../../common/src/definitions/guns";
import { MINIMAP_SCALE } from "../utils/constants";
import { type LootDefinition } from "../../../../common/src/definitions/loots";
import { Helmets } from "../../../../common/src/definitions/helmets";
import { Vests } from "../../../../common/src/definitions/vests";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { type ArmorDefinition } from "../../../../common/src/definitions/armors";

const showMeleeDebugCircle = false;

export class Player extends GameObject<ObjectCategory.Player> {
    name!: string;

    oldPosition!: Vector;

    activeItem = ObjectType.fromString<ObjectCategory.Loot, LootDefinition>(ObjectCategory.Loot, "fists");

    oldItem = this.activeItem.idNumber;

    isNew = true;

    isActivePlayer: boolean;

    animationSeq!: boolean;

    readonly images: {
        readonly vest: Phaser.GameObjects.Image
        readonly body: Phaser.GameObjects.Image
        readonly leftFist: Phaser.GameObjects.Image
        readonly rightFist: Phaser.GameObjects.Image
        readonly backpack: Phaser.GameObjects.Image
        readonly helmet: Phaser.GameObjects.Image
        readonly weapon: Phaser.GameObjects.Image
        readonly bloodEmitter: Phaser.GameObjects.Particles.ParticleEmitter
    };

    leftFistAnim!: Phaser.Tweens.Tween;
    rightFistAnim!: Phaser.Tweens.Tween;
    weaponAnim!: Phaser.Tweens.Tween;

    distSinceLastFootstep = 0;

    helmetLevel = 0;
    vestLevel = 0;
    backpackLevel = 0;

    readonly radius = PLAYER_RADIUS;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Player>, id: number, isActivePlayer = false) {
        super(game, scene, type, id);
        this.isActivePlayer = isActivePlayer;

        this.images = {
            vest: this.scene.add.image(0, 0, "main").setVisible(false),
            body: this.scene.add.image(0, 0, "main", "player_base.svg"),
            leftFist: this.scene.add.image(0, 0, "main", "player_fist.svg"),
            rightFist: this.scene.add.image(0, 0, "main", "player_fist.svg"),
            backpack: this.scene.add.image(0, 0, "main").setPosition(-55, 0).setVisible(false),
            helmet: this.scene.add.image(0, 0, "main").setPosition(-5, 0).setVisible(false),
            weapon: this.scene.add.image(0, 0, "main"),
            bloodEmitter: this.scene.add.particles(0, 0, "main", {
                frame: "blood_particle.svg",
                quantity: 1,
                rotate: { min: 0, max: 360 },
                lifespan: 1000,
                speed: { min: 20, max: 30 },
                scale: { start: 0.75, end: 1 },
                alpha: { start: 1, end: 0 },
                emitting: false
            })
        };
        this.container.add([
            this.images.vest,
            this.images.body,
            this.images.leftFist,
            this.images.rightFist,
            this.images.weapon,
            this.images.backpack,
            this.images.helmet,
            this.images.bloodEmitter
        ]).setDepth(3);

        this.updateFistsPosition(false);
        this.updateWeapon();
    }

    override deserializePartial(stream: SuroiBitStream): void {
        // Position and rotation
        if (this.position !== undefined) this.oldPosition = vClone(this.position);
        this.position = stream.readPosition();

        if (this.oldPosition !== undefined) {
            this.distSinceLastFootstep += distanceSquared(this.oldPosition, this.position);
            if (this.distSinceLastFootstep > 9) {
                this.scene.playSound(Math.random() < 0.5 ? "grass_step_1" : "grass_step_2");
                this.distSinceLastFootstep = 0;
            }
        }

        this.rotation = stream.readRotation(16);

        const oldAngle = this.container.angle;
        const newAngle = Phaser.Math.RadToDeg(this.rotation);
        const finalAngle = oldAngle + Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);
        const minimap = this.scene.scene.get("minimap") as MinimapScene;
        if (this.isActivePlayer && !this.game.gameOver) {
            gsap.to(minimap.playerIndicator, {
                x: this.position.x * MINIMAP_SCALE,
                y: this.position.y * MINIMAP_SCALE,
                angle: finalAngle,
                ease: "none",
                duration: 0.03
            });
            if (this.game.gas.oldRadius !== 0 && this.game.gas.state !== GasState.Inactive) {
                minimap.gasToCenterLine.setTo(
                    this.game.gas.newPosition.x * MINIMAP_SCALE,
                    this.game.gas.newPosition.y * MINIMAP_SCALE,
                    minimap.playerIndicator.x,
                    minimap.playerIndicator.y
                );
            }
        }

        if (!this.isActivePlayer || !localStorageInstance.config.clientSidePrediction) {
            if (this.isNew || !localStorageInstance.config.rotationSmoothing) {
                this.container.setRotation(this.rotation);
            } else {
                gsap.to(this.container, {
                    angle: finalAngle,
                    ease: "none",
                    duration: 0.03
                });
            }
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
                            targets: this.images.weapon,
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
                        this.container.add(meleeDebugCircle);
                        setTimeout(() => this.container.remove(meleeDebugCircle, true), 500);
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
                            targets: this.images.weapon,
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
        this.container.setAlpha(stream.readBoolean() ? 0.5 : 1); // Invulnerability

        this.oldItem = this.activeItem.idNumber;
        this.activeItem = stream.readObjectType<ObjectCategory.Loot, LootDefinition>();

        if (this.isActivePlayer) {
            $("#weapon-ammo-container").toggle((this.activeItem.definition as ItemDefinition).itemType === ItemType.Gun);
        }

        this.helmetLevel = stream.readBits(2);
        this.vestLevel = stream.readBits(2);
        this.backpackLevel = stream.readBits(2);
        this.updateEquipment();

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
            this.images.weapon.setPosition(weaponDef.image.position.x, weaponDef.image.position.y);
            this.images.weapon.setAngle(weaponDef.image.angle);
        }
    }

    updateWeapon(): void {
        const weaponDef = this.activeItem.definition as GunDefinition | MeleeDefinition;
        this.images.weapon.setVisible(weaponDef.image !== undefined);
        if (weaponDef.image) {
            if (weaponDef.itemType === ItemType.Melee) {
                this.images.weapon.setFrame(`${weaponDef.idString}.svg`);
            } else if (weaponDef.itemType === ItemType.Gun) {
                this.images.weapon.setFrame(`${weaponDef.idString}_world.svg`);
            }
            this.images.weapon.setPosition(weaponDef.image.position.x, weaponDef.image.position.y);
            this.images.weapon.setAngle(weaponDef.image.angle);

            if (this.isActivePlayer && this.activeItem.idNumber !== this.oldItem) {
                this.scene.playSound(`${this.activeItem.idString}_switch`);
            }
        }
        if (weaponDef.itemType === ItemType.Gun) {
            this.container.bringToTop(this.images.weapon);
            this.container.bringToTop(this.images.body);
            this.container.bringToTop(this.images.backpack);
            this.container.bringToTop(this.images.helmet);
        } else if (weaponDef.itemType === ItemType.Melee) {
            this.container.sendToBack(this.images.helmet);
            this.container.sendToBack(this.images.backpack);
            this.container.sendToBack(this.images.body);
            this.container.sendToBack(this.images.vest);
            this.container.sendToBack(this.images.weapon);
        }
        this.container.bringToTop(this.images.bloodEmitter);
    }

    updateEquipment(): void {
        this.updateEquipmentWorldImage("helmet", Helmets);
        this.updateEquipmentWorldImage("vest", Vests);
        this.updateEquipmentWorldImage("backpack", Backpacks);

        if (this.isActivePlayer) {
            this.updateEquipmentSlot("helmet", Helmets);
            this.updateEquipmentSlot("vest", Vests);
            this.updateEquipmentSlot("backpack", Backpacks);
        }
    }

    updateEquipmentWorldImage(equipmentType: "helmet" | "vest" | "backpack", definitions: LootDefinition[]): void {
        const level = this[`${equipmentType}Level`];
        const image = this.images[equipmentType];
        if (level > 0) {
            image.setTexture("main", `${definitions[equipmentType === "backpack" ? level : level - 1].idString}_world.svg`).setVisible(true);
        } else {
            image.setVisible(false);
        }
    }

    updateEquipmentSlot(equipmentType: "helmet" | "vest" | "backpack", definitions: LootDefinition[]): void {
        const container = $(`#${equipmentType}-slot`);
        const level = this[`${equipmentType}Level`];
        if (level > 0) {
            const definition = definitions[equipmentType === "backpack" ? level : level - 1];
            container.children(".item-name").text(`Lvl. ${level}`);
            container.children(".item-image").attr("src", `/img/game/loot/${definition.idString}.svg`);

            let itemTooltip = definition.name;
            if (equipmentType === "helmet" || equipmentType === "vest") {
                itemTooltip += `<br>Reduces ${(definition as ArmorDefinition).damageReductionPercentage * 100}% damage`;
            }
            container.children(".item-tooltip").html(itemTooltip);
        }
        container.css("visibility", level > 0 ? "visible" : "hidden");
    }

    destroy(): void {
        super.destroy();
        this.images.body.destroy(true);
        this.images.leftFist.destroy(true);
        this.images.rightFist.destroy(true);
        this.images.weapon.destroy(true);
        this.images.bloodEmitter.destroy(true);
    }
}
