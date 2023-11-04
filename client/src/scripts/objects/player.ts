import { Container, Texture, TilingSprite } from "pixi.js";
import { AnimationType, ObjectCategory, PLAYER_RADIUS, PlayerActions, SpectateActions, ZIndexes } from "../../../../common/src/constants";
import { type ArmorDefinition } from "../../../../common/src/definitions/armors";
import { type BackpackDefinition } from "../../../../common/src/definitions/backpacks";
import { type EmoteDefinition } from "../../../../common/src/definitions/emotes";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { HealType, type HealingItemDefinition } from "../../../../common/src/definitions/healingItems";
import { Loots } from "../../../../common/src/definitions/loots";
import { type MeleeDefinition } from "../../../../common/src/definitions/melees";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { FloorTypes } from "../../../../common/src/utils/mapUtils";
import { angleBetweenPoints, distanceSquared, velFromAngle } from "../../../../common/src/utils/math";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { random, randomBoolean, randomFloat, randomVector } from "../../../../common/src/utils/random";
import { v, vAdd, vAdd2, vClone, vRotate, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";
import { type Sound } from "../utils/soundManager";
import { EaseFunctions, Tween } from "../utils/tween";
import { Obstacle } from "./obstacle";
import { type ParticleEmitter } from "./particles";
import { SpectatePacket } from "../packets/sending/spectatePacket";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { COLORS, HITBOX_COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE, UI_DEBUG_MODE } from "../utils/constants";

export class Player extends GameObject<ObjectCategory.Player> {
    override readonly type = ObjectCategory.Player;

    name!: string;

    activeItem = Loots.fromString("fists");

    oldItem = this.activeItem;

    equipment: {
        helmet?: ArmorDefinition
        vest?: ArmorDefinition
        backpack: BackpackDefinition
    } = {
            backpack: Loots.fromString("pack_0")
        };

    get isActivePlayer(): boolean {
        return this.id === this.game.activePlayerID;
    }

    animationSeq!: boolean;

    footstepSound?: Sound;
    actionSound?: Sound;

    action = {
        type: PlayerActions.None,
        seq: 0,
        item: undefined as undefined | HealingItemDefinition
    };

    damageable = true;

    readonly images: {
        readonly aimTrail: TilingSprite
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
        readonly waterOverlay: SuroiSprite
    };

    readonly emoteContainer: Container;
    healingParticlesEmitter: ParticleEmitter;

    readonly anims: {
        emoteAnim?: Tween<Container>
        emoteHideAnim?: Tween<Container>

        leftFistAnim?: Tween<SuroiSprite>
        rightFistAnim?: Tween<SuroiSprite>
        weaponAnim?: Tween<SuroiSprite>
        muzzleFlashFadeAnim?: Tween<SuroiSprite>
        muzzleFlashRecoilAnim?: Tween<SuroiSprite>
    } = {};

    _emoteHideTimeoutID?: NodeJS.Timeout;

    distSinceLastFootstep = 0;

    helmetLevel = 0;
    vestLevel = 0;
    backpackLevel = 0;

    readonly radius = PLAYER_RADIUS;

    hitbox = new CircleHitbox(this.radius);

    floorType = "grass";
    waterOverlayAnim?: Tween<SuroiSprite>;

    constructor(game: Game, id: number, data: Required<ObjectsNetData[ObjectCategory.Player]>) {
        super(game, id);

        this.images = {
            aimTrail: new TilingSprite(Texture.from("aimTrail.svg"), 20, 6000), //SuroiSprite().setFrame("aimTrail").setVisible(false).setZIndex(1000).setAngle(90).setPos(1800,0)
            vest: new SuroiSprite().setVisible(false),
            body: new SuroiSprite(),
            leftFist: new SuroiSprite(),
            rightFist: new SuroiSprite(),
            backpack: new SuroiSprite().setPos(-55, 0).setVisible(false).setZIndex(5),
            helmet: new SuroiSprite().setPos(-8, 0).setVisible(false).setZIndex(6),
            weapon: new SuroiSprite().setZIndex(3),
            muzzleFlash: new SuroiSprite("muzzle_flash").setVisible(false).setZIndex(7).setAnchor(v(0, 0.5)),
            emoteBackground: new SuroiSprite("emote_background").setPos(0, 0),
            emoteImage: new SuroiSprite().setPos(0, 0),
            waterOverlay: new SuroiSprite("water_overlay").setVisible(false).setTint(COLORS.water)
        };

        this.container.addChild(
            this.images.aimTrail,
            this.images.vest,
            this.images.body,
            this.images.waterOverlay,
            this.images.leftFist,
            this.images.rightFist,
            this.images.weapon,
            this.images.muzzleFlash,
            this.images.backpack,
            this.images.helmet
        );
        this.container.eventMode = "static";

        this.images.aimTrail.angle = 90;
        this.images.aimTrail.position = v(6000, -8);
        this.images.aimTrail.alpha = 0;
        if (!this.isActivePlayer) this.images.aimTrail.alpha = 0;

        this.game.camera.container.removeChild(this.container);
        this.game.playersContainer.addChild(this.container);

        this.emoteContainer = new Container();
        this.game.camera.addObject(this.emoteContainer);
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
                if (this.action.item?.itemType === ItemType.Healing) {
                    frame = HealType[this.action.item.healType].toLowerCase();
                }
                return {
                    frames: `${frame}_particle`,
                    position: this.hitbox.randomPoint(),
                    lifetime: 1000,
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

        const sendSpectatePacket = (): void => {
            if (!this.game.spectating || this.game.activePlayerID === this.id) return;

            this.game.sendPacket(new SpectatePacket(game.playerManager, SpectateActions.SpectateSpecific, this.id));
        };

        this.container.on("pointerdown", sendSpectatePacket);
        this.container.on("click", sendSpectatePacket);
        this.updateFromData(data, true);
    }

    override updateContainerPosition(): void {
        super.updateContainerPosition();
        if (!this.destroyed) this.emoteContainer.position = vAdd2(this.container.position, 0, -175);
    }

    spawnCasingParticles(): void {
        const weaponDef = this.activeItem as GunDefinition;
        const initialRotation = this.rotation + Math.PI / 2;
        const spinAmount = randomFloat(Math.PI / 2, Math.PI);
        const casings = weaponDef.casingParticles;

        if (casings === undefined) return;

        const spawnCasings = (): void => {
            this.game.particleManager.spawnParticles(
                casings.count ?? 1,
                () => ({
                    frames: `${weaponDef.ammoType}_particle`,
                    zIndex: ZIndexes.Players,
                    position: vAdd(this.position, vRotate(casings.position, this.rotation)),
                    lifetime: 400,
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
                })
            );
        };

        if (!casings.ejectionDelay) {
            spawnCasings();
        } else {
            const reference = weaponDef.idString;
            setTimeout(
                () => {
                    if (reference !== this.activeItem.idString) return;

                    spawnCasings();
                },
                casings.ejectionDelay
            );
        }
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Player], isNew = false): void {
        // Position and rotation
        if (this.position !== undefined) this.oldPosition = vClone(this.position);
        this.position = data.position;
        this.hitbox.position = this.position;

        this.rotation = data.rotation;

        const noMovementSmoothing = !this.game.console.getBuiltInCVar("cv_movement_smoothing");

        if (noMovementSmoothing || isNew) this.container.rotation = this.rotation;

        if (this.isActivePlayer) {
            this.game.soundManager.position = this.position;
            this.game.map.setPosition(this.position);

            if (noMovementSmoothing) {
                this.game.camera.position = toPixiCoords(this.position);
                this.game.map.indicator.setRotation(data.rotation);
            }

            if (this.game.console.getBuiltInCVar("pf_show_pos")) {
                $("#coordinates-hud").text(`X: ${this.position.x.toFixed(2)} Y: ${this.position.y.toFixed(2)}`);
            }
        }

        const floorType = this.game.map.terrainGrid.getFloor(this.position);

        if (floorType !== this.floorType) {
            if (FloorTypes[floorType].overlay) this.images.waterOverlay.setVisible(true);
            this.waterOverlayAnim?.kill();
            this.waterOverlayAnim = new Tween(this.game, {
                target: this.images.waterOverlay,
                to: {
                    alpha: FloorTypes[floorType].overlay ? 1 : 0
                },
                duration: 200,
                onComplete: () => {
                    if (!FloorTypes[floorType].overlay) this.images.waterOverlay.setVisible(false);
                }
            });
        }
        this.floorType = floorType;

        if (this.oldPosition !== undefined) {
            this.distSinceLastFootstep += distanceSquared(this.oldPosition, this.position);

            if (this.distSinceLastFootstep > 7) {
                this.footstepSound = this.playSound(`${this.floorType}_step_${random(1, 2)}`, 0.6, 48);
                this.distSinceLastFootstep = 0;

                if (FloorTypes[floorType].particles) {
                    const options = {
                        frames: "ripple_particle",
                        zIndex: ZIndexes.Ground,
                        position: this.hitbox.randomPoint(),
                        lifetime: 1000,
                        speed: v(0, 0)
                    };

                    // outer
                    this.game.particleManager.spawnParticle({
                        ...options,
                        scale: {
                            start: randomFloat(0.45, 0.55),
                            end: randomFloat(2.95, 3.05)
                        },
                        alpha: {
                            start: randomFloat(0.55, 0.65),
                            end: 0
                        }
                    });

                    // inner
                    this.game.particleManager.spawnParticle({
                        ...options,
                        scale: {
                            start: randomFloat(0.15, 0.35),
                            end: randomFloat(1.45, 1.55)
                        },
                        alpha: {
                            start: randomFloat(0.25, 0.35),
                            end: 0
                        }
                    });
                }
            }
        }

        if (isNew || !this.game.console.getBuiltInCVar("cv_movement_smoothing")) {
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

        if (data.full) {
            const full = data.full;
            this.container.alpha = full.invulnerable ? 0.5 : 1;

            this.oldItem = this.activeItem;
            this.activeItem = full.activeItem;
            if (this.isActivePlayer && !UI_DEBUG_MODE) {
                $("#weapon-ammo-container").toggle(this.activeItem.itemType === ItemType.Gun);
            }

            const skinID = full.skin.idString;
            this.images.body.setFrame(`${skinID}_base`);
            this.images.leftFist.setFrame(`${skinID}_fist`);
            this.images.rightFist.setFrame(`${skinID}_fist`);

            this.equipment.helmet = full.helmet;
            this.equipment.vest = full.vest;
            this.equipment.backpack = full.backpack;

            const action = full.action;

            if (this.action.type !== action.type || this.action.seq !== action.seq) {
                let actionTime = 0;
                let actionSoundName = "";
                let actionName = "";
                this.healingParticlesEmitter.active = false;

                switch (action.type) {
                    case PlayerActions.None: {
                        if (this.isActivePlayer) $("#action-container").hide().stop();
                        if (this.actionSound) this.game.soundManager.stop(this.actionSound);
                        break;
                    }
                    case PlayerActions.Reload: {
                        const weaponDef = (this.activeItem as GunDefinition);
                        actionName = "Reloading...";
                        if (weaponDef.casingParticles?.spawnOnReload) this.spawnCasingParticles();
                        actionSoundName = `${weaponDef.idString}_reload`;
                        actionTime = weaponDef.reloadTime;
                        break;
                    }
                    case PlayerActions.UseItem: {
                        const itemDef = action.item;
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
            //@ts-expect-error 'item' not existing is okay
            this.action = action;

            this.updateEquipment();

            this.updateFistsPosition(true);
            this.updateWeapon();
        }

        if (HITBOX_DEBUG_MODE) {
            const ctx = this.debugGraphics;
            ctx.clear();

            drawHitbox(this.hitbox, HITBOX_COLORS.player, ctx);

            switch (this.activeItem.itemType) {
                case ItemType.Gun: {
                    ctx.lineStyle({
                        color: HITBOX_COLORS.playerWeapon,
                        width: 4
                    });
                    ctx.moveTo(this.container.position.x, this.container.position.y);
                    const lineEnd = toPixiCoords(vAdd(this.position, vRotate(v(this.activeItem.length, 0), this.rotation)));
                    ctx.lineTo(lineEnd.x, lineEnd.y);
                    ctx.endFill();
                    break;
                }
                case ItemType.Melee: {
                    drawHitbox(
                        new CircleHitbox(
                            this.activeItem.radius,
                            vAdd(
                                this.position,
                                vRotate(this.activeItem.offset, this.rotation)
                            )
                        ),
                        HITBOX_COLORS.playerWeapon,
                        ctx
                    );
                    break;
                }
            }
        }
    }

    updateFistsPosition(anim: boolean): void {
        this.anims.leftFistAnim?.kill();
        this.anims.rightFistAnim?.kill();
        this.anims.weaponAnim?.kill();

        const weaponDef = this.activeItem as GunDefinition | MeleeDefinition;
        const fists = weaponDef.fists;
        if (anim) {
            this.anims.leftFistAnim = new Tween(
                this.game, {
                    target: this.images.leftFist,
                    to: { x: fists.left.x, y: fists.left.y },
                    duration: fists.animationDuration
                }
            );

            this.anims.rightFistAnim = new Tween(
                this.game, {
                    target: this.images.rightFist,
                    to: { x: fists.right.x, y: fists.right.y },
                    duration: fists.animationDuration
                }
            );
        } else {
            this.images.leftFist.setPos(fists.left.x, fists.left.y);
            this.images.rightFist.setPos(fists.right.x, fists.right.y);
        }

        if (weaponDef.image) {
            this.images.weapon.setPos(weaponDef.image.position.x, weaponDef.image.position.y);
            this.images.weapon.setAngle(weaponDef.image.angle ?? 0);
        }
    }

    updateWeapon(): void {
        const weaponDef = this.activeItem as GunDefinition | MeleeDefinition;
        this.images.weapon.setVisible(weaponDef.image !== undefined);
        this.images.muzzleFlash.setVisible(weaponDef.image !== undefined);
        if (weaponDef.image) {
            this.images.weapon.setFrame(`${weaponDef.idString}${weaponDef.itemType === ItemType.Gun || weaponDef.image.separateWorldImage ? "_world" : ""}`);
            this.images.weapon.setPos(weaponDef.image.position.x, weaponDef.image.position.y);
            this.images.weapon.setAngle(weaponDef.image.angle ?? 0);

            if (this.activeItem !== this.oldItem) {
                this.anims.muzzleFlashFadeAnim?.kill();
                this.anims.muzzleFlashRecoilAnim?.kill();
                this.images.muzzleFlash.alpha = 0;
                if (this.isActivePlayer) this.playSound(`${this.activeItem.idString}_switch`, 0);
            }
        }

        if (weaponDef.itemType === ItemType.Gun) {
            this.images.rightFist.setZIndex(weaponDef.fists.rightZIndex ?? 1);
            this.images.leftFist.setZIndex(weaponDef.fists.leftZIndex ?? 1);
            this.images.weapon.setZIndex(2);
            this.images.body.setZIndex(3);
        } else if (weaponDef.itemType === ItemType.Melee) {
            this.images.leftFist.setZIndex(4);
            this.images.rightFist.setZIndex(4);
            this.images.body.setZIndex(2);
            this.images.weapon.setZIndex(1);
        }
        this.images.waterOverlay.setZIndex(this.images.body.zIndex + 1);
        this.container.sortChildren();
    }

    updateEquipment(): void {
        for (const item of ["helmet", "vest", "backpack"] as const) {
            this.updateEquipmentWorldImage(item, this.equipment[item]);

            if (this.isActivePlayer) {
                this.updateEquipmentSlot(item, this.equipment[item]);
            }
        }
    }

    updateEquipmentWorldImage(type: "helmet" | "vest" | "backpack", def?: ArmorDefinition | BackpackDefinition): void {
        const image = this.images[type];
        if (def && def.level > 0) {
            image.setFrame(`${def.idString}_world`).setVisible(true);
        } else {
            image.setVisible(false);
        }
    }

    updateEquipmentSlot(equipmentType: "helmet" | "vest" | "backpack", def?: ArmorDefinition | BackpackDefinition): void {
        const container = $(`#${equipmentType}-slot`);
        if (def && def.level > 0) {
            container.children(".item-name").text(`Lvl. ${def.level}`);
            container.children(".item-image").attr("src", `./img/game/loot/${def.idString}.svg`);

            let itemTooltip = def.name;
            if (def.itemType === ItemType.Armor) {
                itemTooltip += `<br>Reduces ${def.damageReduction * 100}% damage`;
            }
            container.children(".item-tooltip").html(itemTooltip);
        }
        container.css("visibility", (def?.level ?? 0) > 0 ? "visible" : "hidden");
    }

    emote(type: EmoteDefinition): void {
        this.anims.emoteAnim?.kill();
        this.anims.emoteHideAnim?.kill();
        clearTimeout(this._emoteHideTimeoutID);
        this.playSound("emote", 0.4, 128);
        this.images.emoteImage.setFrame(`${type.idString}`);

        this.emoteContainer.visible = true;
        this.emoteContainer.scale.set(0);
        this.emoteContainer.alpha = 0;

        this.anims.emoteAnim = new Tween(this.game, {
            target: this.emoteContainer,
            to: { alpha: 1 },
            duration: 250,
            ease: EaseFunctions.backOut,
            onUpdate: () => {
                this.emoteContainer.scale.set(this.emoteContainer.alpha);
            }
        });

        this._emoteHideTimeoutID = setTimeout(() => {
            this.anims.emoteHideAnim = new Tween(this.game, {
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
                const weaponDef = this.activeItem as MeleeDefinition;
                if (weaponDef.fists.useLeft === undefined) break;

                let altFist = Math.random() < 0.5;
                if (!weaponDef.fists.randomFist) altFist = true;

                const duration = weaponDef.fists.animationDuration;

                if (!weaponDef.fists.randomFist || !altFist) {
                    this.anims.leftFistAnim = new Tween(this.game, {
                        target: this.images.leftFist,
                        to: { x: weaponDef.fists.useLeft.x, y: weaponDef.fists.useLeft.y },
                        duration,
                        ease: EaseFunctions.sineIn,
                        yoyo: true
                    });
                }
                if (altFist) {
                    this.anims.rightFistAnim = new Tween(this.game, {
                        target: this.images.rightFist,
                        to: { x: weaponDef.fists.useRight.x, y: weaponDef.fists.useRight.y },
                        duration,
                        ease: EaseFunctions.sineIn,
                        yoyo: true
                    });
                }

                if (weaponDef.image !== undefined) {
                    this.anims.weaponAnim = new Tween(this.game, {
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
                            if (a instanceof Obstacle && a.definition.noMeleeCollision) return Infinity;
                            if (b instanceof Obstacle && b.definition.noMeleeCollision) return -Infinity;

                            return a.hitbox.distanceTo(this.hitbox).distance - b.hitbox.distanceTo(this.hitbox).distance;
                        })
                        .slice(0, Math.min(damagedObjects.length, weaponDef.maxTargets))
                        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
                        .forEach(target => target.hitEffect(position, angleBetweenPoints(this.position, position)));
                }, 50);

                break;
            }
            case AnimationType.Gun: {
                const weaponDef = this.activeItem as GunDefinition;
                this.playSound(`${weaponDef.idString}_fire`, 0.5);

                if (weaponDef.itemType === ItemType.Gun) {
                    this.updateFistsPosition(false);
                    const recoilAmount = PIXI_SCALE * (1 - weaponDef.recoilMultiplier);
                    this.anims.weaponAnim = new Tween(this.game, {
                        target: this.images.weapon,
                        to: { x: weaponDef.image.position.x - recoilAmount },
                        duration: 50,
                        yoyo: true
                    });

                    if (!weaponDef.noMuzzleFlash) {
                        const muzzleFlash = this.images.muzzleFlash;
                        const scale = randomFloat(0.75, 1);

                        muzzleFlash.x = weaponDef.length * PIXI_SCALE;
                        muzzleFlash.setVisible(true);
                        muzzleFlash.alpha = 0.95;
                        muzzleFlash.scale = v(scale, scale * (randomBoolean() ? 1 : -1));

                        this.anims.muzzleFlashFadeAnim?.kill();
                        this.anims.muzzleFlashRecoilAnim?.kill();
                        this.anims.muzzleFlashFadeAnim = new Tween(
                            this.game,
                            {
                                target: muzzleFlash,
                                to: { alpha: 0 },
                                duration: 100,
                                onComplete: () => muzzleFlash.setVisible(false)
                            }
                        );

                        this.anims.muzzleFlashRecoilAnim = new Tween(
                            this.game,
                            {
                                target: muzzleFlash,
                                to: { x: muzzleFlash.x - recoilAmount },
                                duration: 50,
                                yoyo: true
                            }
                        );
                    }

                    this.anims.leftFistAnim = new Tween(
                        this.game,
                        {
                            target: this.images.leftFist,
                            to: { x: weaponDef.fists.left.x - recoilAmount },
                            duration: 50,
                            yoyo: true
                        }
                    );

                    this.anims.rightFistAnim = new Tween(
                        this.game,
                        {
                            target: this.images.rightFist,
                            to: { x: weaponDef.fists.right.x - recoilAmount },
                            duration: 50,
                            yoyo: true
                        }
                    );

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
            zIndex: ZIndexes.Players + 1,
            position,
            lifetime: 1000,
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
        this.waterOverlayAnim?.kill();
        this.anims.emoteHideAnim?.kill();
        this.anims.emoteAnim?.kill();
        this.emoteContainer.destroy();
        this.anims.leftFistAnim?.kill();
        this.anims.rightFistAnim?.kill();
        this.anims.weaponAnim?.kill();
        this.anims.muzzleFlashFadeAnim?.kill();
        this.anims.muzzleFlashRecoilAnim?.kill();
    }
}
