import { Container } from "pixi.js";
import {
    AnimationType,
    ObjectCategory,
    PLAYER_RADIUS,
    PlayerActions,
    ZIndexes
} from "../../../../common/src/constants";
import { type ArmorDefinition } from "../../../../common/src/definitions/armors";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { type EmoteDefinition } from "../../../../common/src/definitions/emotes";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { type HealingItemDefinition, HealType } from "../../../../common/src/definitions/healingItems";
import { Helmets } from "../../../../common/src/definitions/helmets";
import { type LootDefinition } from "../../../../common/src/definitions/loots";
import { type MeleeDefinition } from "../../../../common/src/definitions/melees";
import { Vests } from "../../../../common/src/definitions/vests";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { angleBetweenPoints, distanceSquared, velFromAngle } from "../../../../common/src/utils/math";
import { type ItemDefinition, ItemType } from "../../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { random, randomBoolean, randomFloat, randomVector } from "../../../../common/src/utils/random";
import { v, vAdd, vAdd2, vClone, type Vector, vRotate } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";
import { consoleVariables } from "../utils/console/variables";
import { HITBOX_COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE, UI_DEBUG_MODE } from "../utils/constants";
import { drawHitbox, SuroiSprite, toPixiCoords } from "../utils/pixi";
import { type Sound } from "../utils/soundManager";
import { EaseFunctions, Tween } from "../utils/tween";
import { Obstacle } from "./obstacle";
import { type ParticleEmitter } from "./particles";

export class Player extends GameObject {
    declare readonly type: ObjectType<ObjectCategory.Player>;

    name!: string;

    activeItem = ObjectType.fromString<ObjectCategory.Loot, ItemDefinition>(ObjectCategory.Loot, "fists");

    oldItem = this.activeItem.idNumber;

    isNew = true;

    get isActivePlayer(): boolean {
        return this.id === this.game.activePlayerID;
    }

    animationSeq!: boolean;

    footstepSound?: Sound;
    actionSound?: Sound;

    action = {
        type: PlayerActions.None,
        seq: 0,
        item: undefined as undefined | ObjectType<ObjectCategory.Loot, HealingItemDefinition>
    };

    damageable = true;

    readonly images: {
        readonly vest: SuroiSprite
        readonly body: SuroiSprite
        readonly leftFist: SuroiSprite
        readonly rightFist: SuroiSprite
        readonly backpack: SuroiSprite
        readonly helmet: SuroiSprite
        readonly weapon: SuroiSprite
        readonly muzzleFlash: SuroiSprite
        readonly emoteBackground: SuroiSprite
        readonly emoteImage: SuroiSprite
    };

    readonly emoteContainer: Container;
    healingParticlesEmitter: ParticleEmitter;

    emoteAnim?: Tween<Container>;
    emoteHideAnim?: Tween<Container>;

    leftFistAnim?: Tween<SuroiSprite>;
    rightFistAnim?: Tween<SuroiSprite>;
    weaponAnim?: Tween<SuroiSprite>;
    muzzleFlashFadeAnim?: Tween<SuroiSprite>;
    muzzleFlashRecoilAnim?: Tween<SuroiSprite>;

    _emoteHideTimeoutID?: NodeJS.Timeout;

    distSinceLastFootstep = 0;

    helmetLevel = 0;
    vestLevel = 0;
    backpackLevel = 0;

    readonly radius = PLAYER_RADIUS;

    hitbox = new CircleHitbox(this.radius);

    constructor(game: Game, id: number) {
        super(game, ObjectType.categoryOnly(ObjectCategory.Player), id);

        this.images = {
            vest: new SuroiSprite().setVisible(false),
            body: new SuroiSprite(),
            leftFist: new SuroiSprite(),
            rightFist: new SuroiSprite(),
            backpack: new SuroiSprite().setPos(-55, 0).setVisible(false).setZIndex(5),
            helmet: new SuroiSprite().setPos(-5, 0).setVisible(false).setZIndex(6),
            weapon: new SuroiSprite(),
            muzzleFlash: new SuroiSprite("muzzle_flash").setVisible(false).setZIndex(7).setAnchor(v(0, 0.5)),
            emoteBackground: new SuroiSprite("emote_background").setPos(0, 0),
            emoteImage: new SuroiSprite().setPos(0, 0)
        };

        this.container.addChild(
            this.images.vest,
            this.images.body,
            this.images.leftFist,
            this.images.rightFist,
            this.images.weapon,
            this.images.muzzleFlash,
            this.images.backpack,
            this.images.helmet
        );

        this.game.camera.container.removeChild(this.container);
        this.game.playersContainer.addChild(this.container);

        this.emoteContainer = new Container();
        this.game.camera.container.addChild(this.emoteContainer);
        this.emoteContainer.addChild(this.images.emoteBackground, this.images.emoteImage);
        this.emoteContainer.zIndex = ZIndexes.Emotes;
        this.emoteContainer.visible = false;

        this.updateFistsPosition(false);
        this.updateWeapon();

        this.healingParticlesEmitter = this.game.particleManager.addEmitter({
            delay: 350,
            active: false,
            spawnOptions: () => {
                let frame = "";
                if (this.action.item?.definition.itemType === ItemType.Healing) {
                    frame = HealType[this.action.item.definition.healType].toLowerCase();
                }
                return {
                    frames: `${frame}_particle`,
                    position: this.hitbox.randomPoint(),
                    lifeTime: 1000,
                    zIndex: ZIndexes.Players,
                    rotation: 0,
                    alpha: {
                        start: 1,
                        end: 0
                    },
                    scale: {
                        start: 1,
                        end: 1.5
                    },
                    speed: v(randomFloat(-1, 1), -3)
                };
            }
        });
    }

    override updateContainerPosition(): void {
        super.updateContainerPosition();
        if (!this.destroyed) this.emoteContainer.position = vAdd2(this.container.position, 0, -175);
    }

    spawnCasingParticles(): void {
        const weaponDef = this.activeItem.definition as GunDefinition;
        const initialRotation = this.rotation + Math.PI / 2;
        const spinAmount = randomFloat(Math.PI / 2, Math.PI);
        if (weaponDef.casingParticles !== undefined) {
            this.game.particleManager.spawnParticle({
                frames: `${weaponDef.ammoType}_particle`,
                zIndex: ZIndexes.Players,
                position: vAdd(this.position, vRotate(weaponDef.casingParticles.position, this.rotation)),
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
                rotation: {
                    start: initialRotation,
                    end: initialRotation + spinAmount
                },
                speed: vRotate(vAdd2(randomVector(2, -5, 10, 15), -(spinAmount / 4), 0), this.rotation)
            });
        }
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Player]): void {
        // Position and rotation
        if (this.position !== undefined) this.oldPosition = vClone(this.position);
        this.position = data.position;
        this.hitbox.position = this.position;

        if (this.isActivePlayer) {
            if (consoleVariables.get.builtIn("cv_movement_smoothing").value) {
                this.game.camera.position = toPixiCoords(this.position);
            }
            this.game.soundManager.position = this.position;
            this.game.map.setPosition(this.position);
            if (consoleVariables.get.builtIn("cv_animate_rotation").value === "client") {
                this.game.map.indicator.setRotation(this.rotation);
            }

            if (consoleVariables.get.builtIn("pf_show_pos").value) {
                $("#coordinates-hud").text(`X: ${this.position.x.toFixed(2)} Y: ${this.position.y.toFixed(2)}`);
            }
        }

        if (this.oldPosition !== undefined) {
            this.distSinceLastFootstep += distanceSquared(this.oldPosition, this.position);
            if (this.distSinceLastFootstep > 7) {
                let floorType = "grass";
                for (const [hitbox, type] of this.game.floorHitboxes) {
                    if (hitbox.collidesWith(this.hitbox)) {
                        floorType = type;
                        break;
                    }
                }
                this.footstepSound = this.playSound(`${floorType}_step_${random(1, 2)}`, 0.6, 48);
                this.distSinceLastFootstep = 0;
            }
        }

        this.rotation = data.rotation;

        const rotationStyleIsClient = consoleVariables.get.builtIn("cv_animate_rotation").value === "client";
        if (!rotationStyleIsClient ||
            !(rotationStyleIsClient && this.isActivePlayer && !this.game.spectating)
        ) this.container.rotation = this.rotation;

        if (this.isNew || !consoleVariables.get.builtIn("cv_movement_smoothing").value) {
            const pos = toPixiCoords(this.position);
            const emotePos = vAdd(pos, v(0, -175));
            this.container.position.copyFrom(pos);
            this.emoteContainer.position.copyFrom(emotePos);
        }

        // Animation
        if (this.animationSeq !== data.animation.seq && this.animationSeq !== undefined) {
            this.playAnimation(data.animation.type);
        }
        this.animationSeq = data.animation.seq;

        if (data.fullUpdate) {
            this.container.alpha = data.invulnerable ? 0.5 : 1;

            this.oldItem = this.activeItem.idNumber;
            this.activeItem = data.activeItem;
            if (this.isActivePlayer && !UI_DEBUG_MODE) {
                $("#weapon-ammo-container").toggle(this.activeItem.definition.itemType === ItemType.Gun);
            }

            const skinID = data.skin.idString;
            this.images.body.setFrame(`${skinID}_base`);
            this.images.leftFist.setFrame(`${skinID}_fist`);
            this.images.rightFist.setFrame(`${skinID}_fist`);

            this.helmetLevel = data.helmet;
            this.vestLevel = data.vest;
            this.backpackLevel = data.backpack;

            if (this.action.type !== data.action.type || this.action.seq !== data.action.seq) {
                let actionTime = 0;
                let actionSoundName = "";
                let actionName = "";
                this.healingParticlesEmitter.active = false;
                switch (data.action.type) {
                    case PlayerActions.None:
                        if (this.isActivePlayer) $("#action-container").hide().stop();
                        if (this.actionSound) this.game.soundManager.stop(this.actionSound);
                        break;
                    case PlayerActions.Reload: {
                        const weaponDef = (this.activeItem.definition as GunDefinition);
                        actionName = "Reloading...";
                        if (weaponDef.casingParticles?.spawnOnReload) this.spawnCasingParticles();
                        actionSoundName = `${this.activeItem.idString}_reload`;
                        actionTime = (this.activeItem.definition as GunDefinition).reloadTime;
                        break;
                    }
                    case PlayerActions.UseItem: {
                        const itemDef = (data.action.item as ObjectType<ObjectCategory.Loot, HealingItemDefinition>).definition;
                        actionName = `${itemDef.useText} ${itemDef.name}`;
                        actionTime = itemDef.useTime;
                        actionSoundName = itemDef.idString;
                        this.healingParticlesEmitter.active = true;
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
            this.action.type = data.action.type;
            this.action.seq = data.action.seq;
            this.action.item = data.action.item;

            this.updateEquipment();

            this.updateFistsPosition(true);
            this.updateWeapon();
            this.isNew = false;
        }

        if (HITBOX_DEBUG_MODE) {
            const ctx = this.debugGraphics;
            ctx.clear();

            drawHitbox(this.hitbox, HITBOX_COLORS.player, ctx);

            switch (this.activeItem.definition.itemType) {
                case ItemType.Gun: {
                    const weaponDef = this.activeItem.definition as GunDefinition;
                    ctx.lineStyle({
                        color: HITBOX_COLORS.playerWeapon,
                        width: 4
                    });
                    ctx.moveTo(this.container.position.x, this.container.position.y);
                    const lineEnd = toPixiCoords(vAdd(this.position, vRotate(v(weaponDef.length, 0), this.rotation)));
                    ctx.lineTo(lineEnd.x, lineEnd.y);
                    ctx.endFill();
                    break;
                }
                case ItemType.Melee: {
                    const weaponDef = this.activeItem.definition as MeleeDefinition;
                    const rotated = vRotate(weaponDef.offset, this.rotation);
                    const position = vAdd(this.position, rotated);
                    const hitbox = new CircleHitbox(weaponDef.radius, position);
                    drawHitbox(hitbox, HITBOX_COLORS.playerWeapon, ctx);
                    break;
                }
            }
        }
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
        this.images.muzzleFlash.setVisible(weaponDef.image !== undefined);
        if (weaponDef.image) {
            if (weaponDef.itemType === ItemType.Melee) {
                this.images.weapon.setFrame(`${weaponDef.idString}`);
            } else if (weaponDef.itemType === ItemType.Gun) {
                this.images.weapon.setFrame(`${weaponDef.idString}_world`);
            }
            this.images.weapon.setPos(weaponDef.image.position.x, weaponDef.image.position.y);
            this.images.weapon.setAngle(weaponDef.image.angle);

            if (this.activeItem.idNumber !== this.oldItem) {
                this.muzzleFlashFadeAnim?.kill();
                this.muzzleFlashRecoilAnim?.kill();
                this.images.muzzleFlash.alpha = 0;
                if (this.isActivePlayer) this.playSound(`${this.activeItem.idString}_switch`, 0);
            }
        }

        if (weaponDef.itemType === ItemType.Gun) {
            this.images.leftFist.setZIndex(1);
            this.images.rightFist.setZIndex(1);
            this.images.weapon.setZIndex(2);
            this.images.body.setZIndex(3);
        } else if (weaponDef.itemType === ItemType.Melee) {
            this.images.leftFist.setZIndex(3);
            this.images.rightFist.setZIndex(3);
            this.images.body.setZIndex(2);
            this.images.weapon.setZIndex(1);
        }
        this.container.sortChildren();
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
            image.setFrame(`${definitions[equipmentType === "backpack" ? level : level - 1].idString}_world`).setVisible(true);
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
            container.children(".item-image").attr("src", `./img/game/loot/${definition.idString}.svg`);

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
        this.images.emoteImage.setFrame(`${type.idString}`);

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

                this.playSound("swing", 0.4, 96);

                setTimeout(() => {
                    // Play hit effect on closest object
                    // TODO: share this logic with the server
                    const rotated = vRotate(weaponDef.offset, this.rotation);
                    const position = vAdd(this.position, rotated);
                    const hitbox = new CircleHitbox(weaponDef.radius, position);

                    const damagedObjects: Array<Player | Obstacle> = [];

                    for (const object of this.game.objects) {
                        if (
                            !object.dead &&
                            object !== this &&
                            object.damageable &&
                            (object instanceof Obstacle || object instanceof Player)
                        ) {
                            if (object.hitbox?.collidesWith(hitbox)) {
                                damagedObjects.push(object);
                            }
                        }
                    }

                    damagedObjects
                        .sort((a: Player | Obstacle, b: Player | Obstacle): number => {
                            if (a instanceof Obstacle && a.type.definition.noMeleeCollision) return Infinity;
                            if (b instanceof Obstacle && b.type.definition.noMeleeCollision) return -Infinity;

                            return a.hitbox.distanceTo(this.hitbox).distance - b.hitbox.distanceTo(this.hitbox).distance;
                        })
                        .slice(0, Math.min(damagedObjects.length, weaponDef.maxTargets))
                        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
                        .forEach(target => target.hitEffect(position, angleBetweenPoints(this.position, position)));
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

                    if (!weaponDef.noMuzzleFlash) {
                        const muzzleFlash = this.images.muzzleFlash;
                        muzzleFlash.x = weaponDef.length * PIXI_SCALE;
                        muzzleFlash.setVisible(true);
                        muzzleFlash.alpha = 0.95;
                        const scale = randomFloat(0.75, 1);
                        muzzleFlash.scale = v(scale, scale * (randomBoolean() ? 1 : -1));
                        muzzleFlash.rotation += Math.PI * 2;
                        this.muzzleFlashFadeAnim?.kill();
                        this.muzzleFlashRecoilAnim?.kill();
                        this.muzzleFlashFadeAnim = new Tween(this.game, {
                            target: muzzleFlash,
                            to: { alpha: 0 },
                            duration: 100,
                            onComplete: () => muzzleFlash.setVisible(false)
                        });
                        this.muzzleFlashRecoilAnim = new Tween(this.game, {
                            target: muzzleFlash,
                            to: { x: muzzleFlash.x - recoilAmount },
                            duration: 50,
                            yoyo: true
                        });
                    }

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

                    if (!weaponDef.casingParticles?.spawnOnReload) this.spawnCasingParticles();
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
        this.game.soundManager.play(randomBoolean() ? "player_hit_1" : "player_hit_2", position, 0.2, 96);

        this.game.particleManager.spawnParticle({
            frames: "blood_particle",
            zIndex: 4,
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
            speed: velFromAngle(angle, randomFloat(0.5, 1))
        });
    }

    destroy(): void {
        super.destroy();
        this.healingParticlesEmitter.destroy();
        if (this.actionSound) this.game.soundManager.stop(this.actionSound);
        if (this.isActivePlayer) $("#action-container").hide();
        clearTimeout(this._emoteHideTimeoutID);
        this.emoteHideAnim?.kill();
        this.emoteAnim?.kill();
        this.emoteContainer.destroy();
        this.leftFistAnim?.kill();
        this.rightFistAnim?.kill();
        this.weaponAnim?.kill();
        this.muzzleFlashFadeAnim?.kill();
        this.muzzleFlashRecoilAnim?.kill();
    }
}
