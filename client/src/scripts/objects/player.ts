import type { Game } from "../game";

import { localStorageInstance } from "../utils/localStorageHandler";

import {
    ANIMATION_TYPE_BITS, AnimationType,
    ObjectCategory,
    PLAYER_ACTIONS_BITS,
    PLAYER_RADIUS,
    PlayerActions
} from "../../../../common/src/constants";

import { vClone, vAdd, v, vRotate, vAdd2, type Vector } from "../../../../common/src/utils/vector";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { random, randomBoolean, randomFloat, randomVector } from "../../../../common/src/utils/random";
import { angleBetween, distanceSquared, velFromAngle } from "../../../../common/src/utils/math";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { type ItemDefinition, ItemType } from "../../../../common/src/utils/objectDefinitions";

import type { MeleeDefinition } from "../../../../common/src/definitions/melees";
import type { GunDefinition } from "../../../../common/src/definitions/guns";
import { PIXI_SCALE, UI_DEBUG_MODE } from "../utils/constants";
import { type LootDefinition } from "../../../../common/src/definitions/loots";
import { Helmets } from "../../../../common/src/definitions/helmets";
import { Vests } from "../../../../common/src/definitions/vests";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { type ArmorDefinition } from "../../../../common/src/definitions/armors";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { type EmoteDefinition } from "../../../../common/src/definitions/emotes";
import { FloorType } from "../../../../common/src/definitions/buildings";
import { type SkinDefinition } from "../../../../common/src/definitions/skins";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { Container, Graphics } from "pixi.js";
import { type Sound } from "../utils/soundManager";
import { type HealingItemDefinition } from "../../../../common/src/definitions/healingItems";
import { Obstacle } from "./obstacle";
import { GameObject } from "../types/gameObject";
import { EaseFunctions, Tween } from "../utils/tween";

const showMeleeDebugCircle = false;

export class Player extends GameObject<ObjectCategory.Player> {
    name!: string;

    activeItem = ObjectType.fromString<ObjectCategory.Loot, ItemDefinition>(ObjectCategory.Loot, "fists");

    oldItem = this.activeItem.idNumber;

    isNew = true;

    isActivePlayer: boolean;

    animationSeq!: boolean;

    footstepSound?: Sound;
    actionSound?: Sound;

    damageable = true;

    readonly images: {
        readonly vest: SuroiSprite
        readonly body: SuroiSprite
        readonly leftFist: SuroiSprite
        readonly rightFist: SuroiSprite
        readonly backpack: SuroiSprite
        readonly helmet: SuroiSprite
        readonly weapon: SuroiSprite
        readonly emoteBackground: SuroiSprite
        readonly emoteImage: SuroiSprite
    };

    readonly emoteContainer: Container;

    emoteAnim?: Tween<Container>;
    emoteHideAnim?: Tween<Container>;

    leftFistAnim?: Tween<SuroiSprite>;
    rightFistAnim?: Tween<SuroiSprite>;
    weaponAnim?: Tween<SuroiSprite>;

    _emoteHideTimeoutID?: NodeJS.Timeout;

    distSinceLastFootstep = 0;

    helmetLevel = 0;
    vestLevel = 0;
    backpackLevel = 0;

    readonly radius = PLAYER_RADIUS;

    hitbox = new CircleHitbox(this.radius);

    constructor(game: Game, id: number, isActivePlayer = false) {
        super(game, ObjectType.categoryOnly(ObjectCategory.Player), id);
        this.isActivePlayer = isActivePlayer;

        this.images = {
            vest: new SuroiSprite().setVisible(false),
            body: new SuroiSprite(),
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
        this.game.camera.container.removeChild(this.container);
        this.game.playersContainer.addChild(this.container);

        this.emoteContainer = new Container();
        this.game.camera.container.addChild(this.emoteContainer);
        this.emoteContainer.addChild(this.images.emoteBackground, this.images.emoteImage);
        this.emoteContainer.zIndex = 10;
        this.emoteContainer.visible = false;

        this.updateFistsPosition(false);
        this.updateWeapon();
    }

    override updatePosition(): void {
        super.updatePosition();
        this.emoteContainer.position = vAdd2(this.container.position, 0, -175);
    }

    override deserializePartial(stream: SuroiBitStream): void {
        // Position and rotation
        if (this.position !== undefined) this.oldPosition = vClone(this.position);
        this.position = stream.readPosition();

        this.hitbox.position = this.position;

        if (this.isActivePlayer) {
            this.game.camera.setPosition(this.position);
            this.game.soundManager.position = this.position;
            this.game.map.setPosition(this.position);
            if (!localStorageInstance.config.clientSidePrediction) {
                this.game.map.indicator.setRotation(this.rotation);
            }
        }
        if (this.oldPosition !== undefined) {
            this.distSinceLastFootstep += distanceSquared(this.oldPosition, this.position);
            if (this.distSinceLastFootstep > 7) {
                let floorType = FloorType.Grass;
                for (const [hitbox, type] of this.game.floorHitboxes) {
                    if (hitbox.collidesWith(this.hitbox)) {
                        floorType = type;
                        break;
                    }
                }
                this.footstepSound = this.playSound(`${FloorType[floorType].toLowerCase()}_step_${random(1, 2)}`, 0.6, 48);
                this.distSinceLastFootstep = 0;
            }
        }

        this.rotation = stream.readRotation(16);

        if (
            !this.isActivePlayer ||
            this.game.spectating ||
            !localStorageInstance.config.clientSidePrediction
        ) this.container.rotation = this.rotation;

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

        if (this.isNew || !localStorageInstance.config.movementSmoothing) {
            const pos = toPixiCoords(this.position);
            const emotePos = vAdd(pos, v(0, -175));
            this.container.position.copyFrom(pos);
            this.emoteContainer.position.copyFrom(emotePos);
        }

        // Animation
        const animation: AnimationType = stream.readBits(ANIMATION_TYPE_BITS);
        const animationSeq = stream.readBoolean();
        if (this.animationSeq !== animationSeq && this.animationSeq !== undefined) {
            this.playAnimation(animation);
        }
        this.animationSeq = animationSeq;
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

        // Action
        if (stream.readBoolean()) {
            const action = stream.readBits(PLAYER_ACTIONS_BITS) as PlayerActions;
            let actionTime = 0;
            let actionName = "";
            let actionSoundName = "";
            switch (action) {
                case PlayerActions.None:
                    if (this.isActivePlayer) $("#action-container").hide().stop();
                    if (this.actionSound) this.game.soundManager.stop(this.actionSound);
                    break;
                case PlayerActions.Reload: {
                    actionName = "Reloading...";
                    actionSoundName = `${this.activeItem.idString}_reload`;
                    actionTime = (this.activeItem.definition as GunDefinition).reloadTime;
                    break;
                }
                case PlayerActions.UseItem: {
                    const itemDef = stream.readObjectTypeNoCategory(ObjectCategory.Loot).definition as HealingItemDefinition;
                    actionName = `${itemDef.useText} ${itemDef.name}`;
                    actionTime = itemDef.useTime;
                    actionSoundName = itemDef.idString;
                    break;
                }
            }
            if (this.isActivePlayer) {
                if (actionName) {
                    $("#action-name").text(actionName);
                    $("#action-container").show();
                }
                if (actionTime > 0) {
                    $("#action-timer-anim").stop().width("0%").animate({ width: "100%" }, actionTime * 1000, "linear", () => {
                        $("#action-container").hide();
                    });
                }
            }
            if (actionSoundName) this.actionSound = this.playSound(actionSoundName, 0.6, 48);
        }

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
            this.leftFistAnim = new Tween(this.game, {
                target: this.images.leftFist,
                to: { x: fists.left.x, y: fists.left.y },
                duration: fists.animationDuration
            });
            this.rightFistAnim = new Tween(this.game, {
                target: this.images.rightFist,
                to: { x: fists.right.x, y: fists.right.y },
                duration: fists.animationDuration
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
                this.playSound(`${this.activeItem.idString}_switch`, 0);
            }
        }

        if (weaponDef.itemType === ItemType.Gun) {
            this.container.setChildIndex(this.images.leftFist, 1);
            this.container.setChildIndex(this.images.rightFist, 2);
            this.container.setChildIndex(this.images.weapon, 3);
            this.container.setChildIndex(this.images.body, 4);
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
                itemTooltip += `<br>Reduces ${(definition as ArmorDefinition).damageReduction * 100}% damage`;
            }
            container.children(".item-tooltip").html(itemTooltip);
        }
        container.css("visibility", level > 0 ? "visible" : "hidden");
    }

    emote(type: ObjectType<ObjectCategory.Emote, EmoteDefinition>): void {
        this.emoteAnim?.kill();
        this.emoteHideAnim?.kill();
        clearTimeout(this._emoteHideTimeoutID);
        this.playSound("emote", 0.4, 128);
        this.images.emoteImage.setFrame(`${type.idString}.svg`);

        this.emoteContainer.visible = true;
        this.emoteContainer.scale.set(0);
        this.emoteContainer.alpha = 0;

        this.emoteAnim = new Tween(this.game, {
            target: this.emoteContainer,
            to: { alpha: 1 },
            duration: 250,
            ease: EaseFunctions.backOut,
            onUpdate: () => {
                this.emoteContainer.scale.set(this.emoteContainer.alpha);
            }
        });

        this._emoteHideTimeoutID = setTimeout(() => {
            this.emoteHideAnim = new Tween(this.game, {
                target: this.emoteContainer,
                to: { alpha: 0 },
                duration: 200,
                onUpdate: () => {
                    this.emoteContainer.scale.set(this.emoteContainer.alpha);
                },
                onComplete: () => {
                    this.emoteContainer.visible = false;
                }
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

                const duration = weaponDef.fists.animationDuration;

                if (!weaponDef.fists.randomFist || !altFist) {
                    this.leftFistAnim = new Tween(this.game, {
                        target: this.images.leftFist,
                        to: { x: weaponDef.fists.useLeft.x, y: weaponDef.fists.useLeft.y },
                        duration,
                        ease: EaseFunctions.sineIn,
                        yoyo: true
                    });
                }
                if (altFist) {
                    this.rightFistAnim = new Tween(this.game, {
                        target: this.images.rightFist,
                        to: { x: weaponDef.fists.useRight.x, y: weaponDef.fists.useRight.y },
                        duration,
                        ease: EaseFunctions.sineIn,
                        yoyo: true
                    });
                }

                if (weaponDef.image !== undefined) {
                    this.weaponAnim = new Tween(this.game, {
                        target: this.images.weapon,
                        to: {
                            x: weaponDef.image.usePosition.x,
                            y: weaponDef.image.usePosition.y,
                            angle: weaponDef.image.useAngle
                        },
                        duration,
                        ease: EaseFunctions.sineIn,
                        yoyo: true
                    });
                }

                if (showMeleeDebugCircle) {
                    const graphics = new Graphics();
                    graphics.beginFill();
                    graphics.fill.color = 0xff0000;
                    graphics.fill.alpha = 0.9;
                    graphics.drawCircle(weaponDef.offset.x * PIXI_SCALE, weaponDef.offset.y * PIXI_SCALE, weaponDef.radius * PIXI_SCALE);
                    graphics.endFill();
                    this.container.addChild(graphics);
                    setTimeout(() => this.container.removeChild(graphics), 500);
                }

                this.playSound("swing", 0.4, 96);

                setTimeout(() => {
                    // Play hit effect on closest object
                    // TODO: share this logic with the server
                    const rotated = vRotate(weaponDef.offset, this.rotation);
                    const position = vAdd(this.position, rotated);
                    const hitbox = new CircleHitbox(weaponDef.radius, position);

                    const damagedObjects: Array<Player | Obstacle> = [];

                    for (const object of this.game.objectsSet) {
                        if (!object.dead && object !== this && object.damageable && (object instanceof Obstacle || object instanceof Player)) {
                            if (object.hitbox && hitbox.collidesWith(object.hitbox)) damagedObjects.push(object);
                        }
                    }

                    damagedObjects.sort((a: Player | Obstacle, b: Player | Obstacle): number => {
                        if (a instanceof Obstacle && a.type.definition.noMeleeCollision) return 99;
                        if (b instanceof Obstacle && b.type.definition.noMeleeCollision) return -99;
                        const distanceA = a.hitbox.distanceTo(this.hitbox).distance;
                        const distanceB = b.hitbox.distanceTo(this.hitbox).distance;

                        return distanceA - distanceB;
                    });

                    const targetLimit = Math.min(damagedObjects.length, weaponDef.maxTargets);
                    for (let i = 0; i < targetLimit; i++) {
                        const closestObject = damagedObjects[i];
                        closestObject.hitEffect(position, angleBetween(this.position, position));
                    }
                }, 50);

                break;
            }
            case AnimationType.Gun: {
                const weaponDef = this.activeItem.definition as GunDefinition;
                this.playSound(`${weaponDef.idString}_fire`, 0.5);

                if (weaponDef.itemType === ItemType.Gun) {
                    this.updateFistsPosition(false);
                    const recoilAmount = PIXI_SCALE * (1 - weaponDef.recoilMultiplier);
                    this.weaponAnim = new Tween(this.game, {
                        target: this.images.weapon,
                        to: { x: weaponDef.image.position.x - recoilAmount },
                        duration: 50,
                        yoyo: true
                    });

                    this.leftFistAnim = new Tween(this.game, {
                        target: this.images.leftFist,
                        to: { x: weaponDef.fists.left.x - recoilAmount },
                        duration: 50,
                        yoyo: true
                    });

                    this.rightFistAnim = new Tween(this.game, {
                        target: this.images.rightFist,
                        to: { x: weaponDef.fists.right.x - recoilAmount },
                        duration: 50,
                        yoyo: true
                    });

                    if (weaponDef.particles) {
                        this.game.particleManager.spawnParticle({
                            frames: `${weaponDef.ammoType}_particle.svg`,
                            depth: 3,
                            position: vAdd(this.position, vRotate(weaponDef.particles.position, this.rotation)),
                            lifeTime: 400,
                            scale: {
                                start: 0.8,
                                end: 0.4
                            },
                            alpha: {
                                start: 1,
                                end: 0,
                                ease: EaseFunctions.sextIn
                            },
                            rotation: this.rotation + randomFloat(-0.2, 0.2) + Math.PI / 2,
                            speed: vRotate(randomVector(0.2, -0.5, 1, 1.5), this.rotation)
                        });
                    }
                }
                break;
            }
            case AnimationType.GunClick: {
                this.playSound("gun_click", 0.8, 48);
                break;
            }
        }
    }

    hitEffect(position: Vector, angle: number): void {
        this.game.soundManager.play(randomBoolean() ? "player_hit_1" : "player_hit_2", position, 0.5, 96);

        this.game.particleManager.spawnParticle({
            frames: "blood_particle.svg",
            depth: 3,
            position,
            lifeTime: 1000,
            scale: {
                start: 0.5,
                end: 1
            },
            alpha: {
                start: 1,
                end: 0
            },
            speed: velFromAngle(angle, randomFloat(0.1, 0.2))
        });
    }

    destroy(): void {
        super.destroy();
        this.leftFistAnim?.kill();
        this.rightFistAnim?.kill();
        this.weaponAnim?.kill();
    }
}
