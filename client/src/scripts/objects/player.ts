import gsap, { Cubic } from "gsap";

import type { Game } from "../game";

import { localStorageInstance } from "../utils/localStorageHandler";
import { GameObject } from "../types/gameObject";

import {
    ANIMATION_TYPE_BITS, AnimationType,
    ObjectCategory,
    PLAYER_RADIUS
} from "../../../../common/src/constants";

import { vClone, type Vector } from "../../../../common/src/utils/vector";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { random, randomBoolean } from "../../../../common/src/utils/random";
import { distanceSquared } from "../../../../common/src/utils/math";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { type ItemDefinition, ItemType } from "../../../../common/src/utils/objectDefinitions";

import type { MeleeDefinition } from "../../../../common/src/definitions/melees";
import type { GunDefinition } from "../../../../common/src/definitions/guns";
import { UI_DEBUG_MODE } from "../utils/constants";
import { type LootDefinition } from "../../../../common/src/definitions/loots";
import { Helmets } from "../../../../common/src/definitions/helmets";
import { Vests } from "../../../../common/src/definitions/vests";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { type ArmorDefinition } from "../../../../common/src/definitions/armors";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { type EmoteDefinition } from "../../../../common/src/definitions/emotes";
import { FloorType } from "../../../../common/src/definitions/buildings";
import { type SkinDefinition } from "../../../../common/src/definitions/skins";
import { SuroiSprite } from "../utils/pixi";
import { Container, Graphics } from "pixi.js";

const showMeleeDebugCircle = false;

export class Player extends GameObject<ObjectCategory.Player> {
    name!: string;

    oldPosition!: Vector;

    activeItem = ObjectType.fromString<ObjectCategory.Loot, ItemDefinition>(ObjectCategory.Loot, "fists");

    oldItem = this.activeItem.idNumber;

    isNew = true;

    isActivePlayer: boolean;

    animationSeq!: boolean;

    readonly images: {
        readonly vest: SuroiSprite
        readonly body: SuroiSprite
        readonly leftFist: SuroiSprite
        readonly rightFist: SuroiSprite
        readonly backpack: SuroiSprite
        readonly helmet: SuroiSprite
        readonly weapon: SuroiSprite
        // readonly bloodEmitter: Phaser.GameObjects.Particles.ParticleEmitter
        readonly emoteBackground: SuroiSprite
        readonly emoteImage: SuroiSprite
    };

    readonly emoteContainer: Container;

    emoteAnim?: gsap.core.Tween;
    emoteHideAnim?: gsap.core.Tween;

    leftFistAnim?: gsap.core.Tween;
    rightFistAnim?: gsap.core.Tween;
    weaponAnim?: gsap.core.Tween;

    _emoteHideTimeoutID?: NodeJS.Timeout;

    distSinceLastFootstep = 0;

    helmetLevel = 0;
    vestLevel = 0;
    backpackLevel = 0;

    readonly radius = PLAYER_RADIUS;

    hitbox = new CircleHitbox(this.radius);

    floorType = FloorType.Grass;

    constructor(game: Game, id: number, isActivePlayer = false) {
        super(game, ObjectType.categoryOnly(ObjectCategory.Player), id);
        this.isActivePlayer = isActivePlayer;

        this.images = {
            vest: new SuroiSprite().setVisible(false),
            body: new SuroiSprite("leia_base.svg"),
            leftFist: new SuroiSprite(),
            rightFist: new SuroiSprite(),
            backpack: new SuroiSprite().setPos(-55, 0).setVisible(false),
            helmet: new SuroiSprite().setPos(-5, 0).setVisible(false),
            weapon: new SuroiSprite(),
            emoteBackground: new SuroiSprite("emote_background.svg").setPos(0, 0),
            emoteImage: new SuroiSprite().setPos(0, 0)
            /*bloodEmitter: this.scene.add.particles(0, 0, "main", {
                frame: "blood_particle.svg",
                quantity: 1,
                lifespan: 1000,
                speed: { min: 20, max: 30 },
                scale: { start: 0.75, end: 1 },
                alpha: { start: 1, end: 0 },
                emitting: false
            })*/
        };

        this.container.addChild(
            this.images.vest,
            this.images.body,
            this.images.leftFist,
            this.images.rightFist,
            this.images.weapon,
            this.images.backpack,
            this.images.helmet
            // this.images.bloodEmitter
        );

        this.container.zIndex = 3;

        this.emoteContainer = new Container();
        this.game.camera.container.addChild(this.emoteContainer);
        this.emoteContainer.addChild(this.images.emoteBackground, this.images.emoteImage);
        this.emoteContainer.zIndex = 10;
        this.emoteContainer.visible = false;

        this.updateFistsPosition(false);
        this.updateWeapon();
    }

    override deserializePartial(stream: SuroiBitStream): void {
        // Position and rotation
        if (this.position !== undefined) this.oldPosition = vClone(this.position);
        this.position = stream.readPosition();

        this.hitbox.position = this.position;

        if (this.isActivePlayer) {
            this.game.camera.setPosition(this.position);

            Howler.pos(this.position.x, this.position.y);
        }

        if (this.oldPosition !== undefined) {
            this.distSinceLastFootstep += distanceSquared(this.oldPosition, this.position);
            if (this.distSinceLastFootstep > 9) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                this.playSound(`${FloorType[this.floorType].toLowerCase()}_step_${random(1, 2)}`, 0);
                this.distSinceLastFootstep = 0;
                this.floorType = FloorType.Grass;
            }
        }

        this.rotation = stream.readRotation(16);

        /*const oldAngle = this.container.angle;
        const newAngle = Phaser.Math.RadToDeg(this.rotation);
        const finalAngle = oldAngle + Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);
        const minimap = this.scene.scene.get("minimap") as MinimapScene;
        if (this.isActivePlayer && (!this.game.gameOver || this.game.spectating)) {
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

        if (!this.isActivePlayer || this.game.spectating || !localStorageInstance.config.clientSidePrediction) {
            if (this.isNew || !localStorageInstance.config.rotationSmoothing) {
                this.container.setRotation(this.rotation);
            } else {
                gsap.to(this.container, {
                    angle: finalAngle,
                    ease: "none",
                    duration: 0.03
                });
            }
        }*/

        if (!localStorageInstance.config.movementSmoothing || this.isNew) {
            this.emoteContainer.position.set(this.position.x * 20, (this.position.y * 20) - 175);
        } else {
            gsap.to(this.emoteContainer, {
                x: this.position.x * 20,
                y: (this.position.y * 20) - 175,
                duration: 0.03
            });
        }

        // Animation
        const animation: AnimationType = stream.readBits(ANIMATION_TYPE_BITS);
        const animationSeq = stream.readBoolean();
        if (this.animationSeq !== animationSeq && this.animationSeq !== undefined) {
            this.playAnimation(animation);
        }
        this.animationSeq = animationSeq;

        // Hit effect
        if (stream.readBoolean() && !this.isNew) {
            // this.images.bloodEmitter.emitParticle(1);
            this.game.soundManager.play(randomBoolean() ? "player_hit_1" : "player_hit_2");
        }
    }

    override deserializeFull(stream: SuroiBitStream): void {
        this.container.alpha = stream.readBoolean() ? 0.5 : 1; // Invulnerability

        this.oldItem = this.activeItem.idNumber;
        this.activeItem = stream.readObjectTypeNoCategory<ObjectCategory.Loot, LootDefinition>(ObjectCategory.Loot);

        const skinID = stream.readObjectTypeNoCategory<ObjectCategory.Loot, SkinDefinition>(ObjectCategory.Loot).idString;
        this.images.body.setFrame(`${skinID}_base.svg`);
        this.images.leftFist.setFrame(`${skinID}_fist.svg`);
        this.images.rightFist.setFrame(`${skinID}_fist.svg`);

        if (this.isActivePlayer && !UI_DEBUG_MODE) {
            $("#weapon-ammo-container").toggle(this.activeItem.definition.itemType === ItemType.Gun);
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
        this.leftFistAnim?.kill();
        this.rightFistAnim?.kill();
        this.weaponAnim?.kill();

        const weaponDef = this.activeItem.definition as GunDefinition | MeleeDefinition;
        const fists = weaponDef.fists;
        if (anim) {
            this.leftFistAnim = gsap.to(this.images.leftFist, {
                x: fists.left.x,
                y: fists.left.y,
                duration: fists.animationDuration / 1000
            });
            this.rightFistAnim = gsap.to(this.images.rightFist, {
                x: fists.right.x,
                y: fists.right.y,
                duration: fists.animationDuration / 1000
            });
        } else {
            this.images.leftFist.setPos(fists.left.x, fists.left.y);
            this.images.rightFist.setPos(fists.right.x, fists.right.y);
        }

        if (weaponDef.image) {
            this.images.weapon.setPos(weaponDef.image.position.x, weaponDef.image.position.y);
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
            this.images.weapon.setPos(weaponDef.image.position.x, weaponDef.image.position.y);
            this.images.weapon.setAngle(weaponDef.image.angle);

            if (this.isActivePlayer && this.activeItem.idNumber !== this.oldItem) {
                this.game.soundManager.play(`${this.activeItem.idString}_switch`);
            }
        }

        if (weaponDef.itemType === ItemType.Gun) {
            this.container.setChildIndex(this.images.leftFist, 2);
            this.container.setChildIndex(this.images.rightFist, 3);
            this.container.setChildIndex(this.images.weapon, 4);
            this.container.setChildIndex(this.images.body, 5);
        } else if (weaponDef.itemType === ItemType.Melee) {
            this.container.setChildIndex(this.images.weapon, 2);
            this.container.setChildIndex(this.images.body, 3);
            this.container.setChildIndex(this.images.leftFist, 4);
            this.container.setChildIndex(this.images.rightFist, 5);
        }
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
            image.setFrame(`${definitions[equipmentType === "backpack" ? level : level - 1].idString}_world.svg`).setVisible(true);
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

    emote(type: ObjectType<ObjectCategory.Emote, EmoteDefinition>): void {
        this.emoteAnim?.kill();
        this.emoteHideAnim?.kill();
        clearTimeout(this._emoteHideTimeoutID);
        this.game.soundManager.play("emote");
        this.images.emoteImage.setFrame(`${type.idString}.svg`);

        this.emoteContainer.visible = true;
        this.emoteContainer.scale.set(0);
        this.emoteContainer.alpha = 0;

        this.emoteAnim = gsap.to(this.emoteContainer, {
            alpha: 1,
            ease: "Back.out",
            duration: 0.25,
            onUpdate: () => {
                this.emoteContainer.scale.set(this.emoteContainer.alpha);
            }
        });

        this._emoteHideTimeoutID = setTimeout(() => {
            this.emoteHideAnim = gsap.to(this.emoteContainer, {
                alpha: 0,
                duration: 0.2,
                onUpdate: () => {
                    this.emoteContainer.scale.set(this.emoteContainer.alpha);
                },
                onComplete: () => { this.emoteContainer.visible = false; }
            });
        }, 4000);
    }

    playAnimation(anim: AnimationType): void {
        switch (anim) {
            case AnimationType.Melee: {
                this.updateFistsPosition(false);
                const weaponDef = this.activeItem.definition as MeleeDefinition;
                if (weaponDef.fists.useLeft === undefined) break;

                let altFist = Math.random() < 0.5;
                if (!weaponDef.fists.randomFist) altFist = true;

                const duration = weaponDef.fists.animationDuration / 1000;

                if (!weaponDef.fists.randomFist || !altFist) {
                    this.leftFistAnim = gsap.to(this.images.leftFist, {
                        x: weaponDef.fists.useLeft.x,
                        y: weaponDef.fists.useLeft.y,
                        duration,
                        yoyo: true,
                        repeat: 1,
                        ease: Cubic.easeOut
                    });
                }
                if (altFist) {
                    this.rightFistAnim = gsap.to(this.images.rightFist, {
                        x: weaponDef.fists.useRight.x,
                        y: weaponDef.fists.useRight.y,
                        duration,
                        yoyo: true,
                        repeat: 1,
                        ease: Cubic.easeOut
                    });
                }

                if (weaponDef.image !== undefined) {
                    this.weaponAnim = gsap.to(this.images.weapon, {
                        x: weaponDef.image.usePosition.x,
                        y: weaponDef.image.usePosition.y,
                        duration,
                        angle: weaponDef.image.useAngle,
                        yoyo: true,
                        repeat: 1,
                        ease: Cubic.easeOut
                    });
                }

                if (showMeleeDebugCircle) {
                    const graphics = new Graphics();
                    graphics.beginFill();
                    graphics.fill.color = 0xff0000;
                    graphics.fill.alpha = 0.9;
                    graphics.drawCircle(weaponDef.offset.x * 20, weaponDef.offset.y * 20, weaponDef.radius * 20);
                    graphics.endFill();
                    this.container.addChild(graphics);
                    setTimeout(() => this.container.removeChild(graphics), 500);
                }

                this.game.soundManager.play("swing");
                break;
            }
            case AnimationType.Gun: {
                const weaponDef = this.activeItem.definition as GunDefinition;
                this.game.soundManager.play(`${weaponDef.idString}_fire`);

                if (weaponDef.itemType === ItemType.Gun) {
                    this.updateFistsPosition(false);
                    const recoilAmount = 20 * (1 - weaponDef.recoilMultiplier);
                    this.weaponAnim = gsap.to(this.images.weapon, {
                        x: weaponDef.image.position.x - recoilAmount,
                        duration: 0.05,
                        yoyo: true,
                        repeat: 1
                    });

                    this.leftFistAnim = gsap.to(this.images.leftFist, {
                        x: weaponDef.fists.left.x - recoilAmount,
                        duration: 0.05,
                        yoyo: true,
                        repeat: 1
                    });

                    this.rightFistAnim = gsap.to(this.images.rightFist, {
                        x: weaponDef.fists.right.x - recoilAmount,
                        duration: 0.05,
                        yoyo: true,
                        repeat: 1
                    });
                }
                break;
            }
            case AnimationType.GunClick: {
                this.game.soundManager.play("gun_click");
                break;
            }
        }
    }

    destroy(): void {
        super.destroy();

        this.leftFistAnim?.kill();
        this.rightFistAnim?.kill();
        this.weaponAnim?.kill();
    }
}
