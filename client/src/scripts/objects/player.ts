import $ from "jquery";
import { Container, Texture, TilingSprite } from "pixi.js";
import { AnimationType, GameConstants, ObjectCategory, PlayerActions, SpectateActions, ZIndexes } from "../../../../common/src/constants";
import { type ArmorDefinition } from "../../../../common/src/definitions/armors";
import { type BackpackDefinition } from "../../../../common/src/definitions/backpacks";
import { type EmoteDefinition } from "../../../../common/src/definitions/emotes";
import { type GunDefinition, type SingleGunNarrowing } from "../../../../common/src/definitions/guns";
import { HealType, type HealingItemDefinition } from "../../../../common/src/definitions/healingItems";
import { Loots, type WeaponDefinition } from "../../../../common/src/definitions/loots";
import { type MeleeDefinition } from "../../../../common/src/definitions/melees";
import { type SkinDefinition } from "../../../../common/src/definitions/skins";
import { SpectatePacket } from "../../../../common/src/packets/spectatePacket";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { Angle, EaseFunctions, Geometry } from "../../../../common/src/utils/math";
import { type Timeout } from "../../../../common/src/utils/misc";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { random, randomBoolean, randomFloat, randomSign, randomVector } from "../../../../common/src/utils/random";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { COLORS, GHILLIE_TINT, HITBOX_COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { type GameSound } from "../utils/soundManager";
import { Tween } from "../utils/tween";
import { GameObject } from "./gameObject";
import { Obstacle } from "./obstacle";
import { type ParticleEmitter } from "./particles";

export class Player extends GameObject<ObjectCategory.Player> {
    override readonly type = ObjectCategory.Player;

    name!: string;

    activeItem: WeaponDefinition = Loots.fromString("fists");

    private _oldItem = this.activeItem;

    equipment: {
        helmet?: ArmorDefinition
        vest?: ArmorDefinition
        backpack: BackpackDefinition
    } = {
            backpack: Loots.fromString("bag")
        };

    get isActivePlayer(): boolean {
        return this.id === this.game.activePlayerID;
    }

    animationSeq!: boolean;

    footstepSound?: GameSound;
    actionSound?: GameSound;

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
        readonly altWeapon: SuroiSprite
        readonly muzzleFlash: SuroiSprite
        readonly emoteBackground: SuroiSprite
        readonly emote: SuroiSprite
        readonly waterOverlay: SuroiSprite
    };

    hideEquipment? = false;

    readonly emoteContainer: Container;
    healingParticlesEmitter: ParticleEmitter;

    readonly anims: {
        emote?: Tween<Container>
        emoteHide?: Tween<Container>

        leftFist?: Tween<SuroiSprite>
        rightFist?: Tween<SuroiSprite>
        weapon?: Tween<SuroiSprite>
        pin?: Tween<SuroiSprite>
        muzzleFlashFade?: Tween<SuroiSprite>
        muzzleFlashRecoil?: Tween<SuroiSprite>
        waterOverlay?: Tween<SuroiSprite>
    } = {};

    private _emoteHideTimeout?: Timeout;

    distSinceLastFootstep = 0;

    helmetLevel = 0;
    vestLevel = 0;
    backpackLevel = 0;

    hitbox = new CircleHitbox(GameConstants.player.radius);

    floorType = "grass";

    constructor(game: Game, id: number, data: Required<ObjectsNetData[ObjectCategory.Player]>) {
        super(game, id);

        this.images = {
            aimTrail: new TilingSprite(Texture.from("aimTrail.svg"), 20, 6000), // SuroiSprite().setFrame("aimTrail").setVisible(false).setZIndex(1000).setAngle(90).setPos(1800,0)
            vest: new SuroiSprite().setVisible(false),
            body: new SuroiSprite(),
            leftFist: new SuroiSprite(),
            rightFist: new SuroiSprite(),
            backpack: new SuroiSprite().setPos(-55, 0).setVisible(false).setZIndex(5),
            helmet: new SuroiSprite().setPos(-8, 0).setVisible(false).setZIndex(6),
            weapon: new SuroiSprite().setZIndex(3),
            altWeapon: new SuroiSprite().setZIndex(3),
            muzzleFlash: new SuroiSprite("muzzle_flash").setVisible(false).setZIndex(7).setAnchor(Vec.create(0, 0.5)),
            emoteBackground: new SuroiSprite("emote_background").setPos(0, 0),
            emote: new SuroiSprite().setPos(0, 0),
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
            this.images.altWeapon,
            this.images.muzzleFlash,
            this.images.backpack,
            this.images.helmet
        );
        this.container.eventMode = "static";

        this.images.aimTrail.angle = 90;
        this.images.aimTrail.position = Vec.create(6000, -8);
        this.images.aimTrail.alpha = 0;
        if (!this.isActivePlayer) this.images.aimTrail.alpha = 0;

        this.emoteContainer = new Container();
        this.game.camera.addObject(this.emoteContainer);
        this.emoteContainer.addChild(this.images.emoteBackground, this.images.emote);
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
                    speed: Vec.create(randomFloat(-1, 1), -3)
                };
            }
        });

        this.container.on("pointerdown", (): void => {
            if (!this.game.spectating || this.game.activePlayerID === this.id) return;
            const packet = new SpectatePacket();
            packet.spectateAction = SpectateActions.SpectateSpecific;
            packet.playerID = this.id;
            this.game.sendPacket(packet);
        });
        this.updateFromData(data, true);
    }

    override updateContainerPosition(): void {
        super.updateContainerPosition();
        if (!this.destroyed) this.emoteContainer.position = Vec.addComponent(this.container.position, 0, -175);
    }

    spawnCasingParticles(altFire = false): void {
        const weaponDef = this.activeItem as GunDefinition;
        const reference = this._getItemReference() as SingleGunNarrowing;
        const initialRotation = this.rotation + Math.PI / 2;
        const casings = reference.casingParticles;

        if (casings === undefined) return;

        const position = Vec.clone(casings.position);
        if (weaponDef.isDual) {
            position.y = (altFire ? -1 : 1) * (position.y + weaponDef.leftRightOffset);
        }

        const spawnCasings = (): void => {
            const casingVelX = casings.velocity?.x;
            const casingVelY = casings.velocity?.y;

            this.game.particleManager.spawnParticles(
                casings.count ?? 1,
                () => {
                    const spinAmount = randomFloat(Math.PI / 2, Math.PI);
                    const displacement = randomVector(
                        casingVelX?.min ?? 2,
                        casingVelX?.max ?? -5,
                        casingVelY?.min ?? 10,
                        casingVelY?.max ?? 15
                    );

                    if (casingVelX?.randomSign) {
                        displacement.x *= randomSign();
                    }

                    if (casingVelY?.randomSign) {
                        displacement.y *= randomSign();
                    }

                    return {
                        frames: `${weaponDef.ammoType}_particle`,
                        zIndex: ZIndexes.Players,
                        position: Vec.add(this.position, Vec.rotate(position, this.rotation)),
                        lifetime: 400,
                        scale: {
                            start: 0.8,
                            end: 0.4
                        },
                        alpha: {
                            start: 1,
                            end: 0,
                            ease: EaseFunctions.sexticIn
                        },
                        rotation: {
                            start: initialRotation,
                            end: initialRotation + Math.sign(displacement.y) * spinAmount
                            //                    ^^^^^^^^^^ make casings spin clockwise or counterclockwise depending on which way they're flying
                        },
                        speed: Vec.rotate(
                            Vec.addComponent(
                                displacement,
                                -(spinAmount / 4),
                                0
                            ),
                            this.rotation
                        )
                    };
                }
            );
        };

        if (!casings.ejectionDelay) {
            spawnCasings();
        } else {
            const reference = weaponDef.idString;
            this.addTimeout(
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
        const oldPosition = Vec.clone(this.position);
        this.position = data.position;
        this.hitbox.position = this.position;

        this.rotation = data.rotation;

        const noMovementSmoothing = !this.game.console.getBuiltInCVar("cv_movement_smoothing");

        if (noMovementSmoothing || isNew) this.container.rotation = this.rotation;

        if (this.isActivePlayer) {
            this.game.soundManager.position = this.position;
            this.game.map.setPosition(this.position);

            if (noMovementSmoothing) this.game.camera.position = toPixiCoords(this.position);

            if (!this.game.console.getBuiltInCVar("cv_responsive_rotation")) this.game.map.indicator.setRotation(data.rotation);

            if (this.game.console.getBuiltInCVar("pf_show_pos")) {
                $("#coordinates-hud").text(`X: ${this.position.x.toFixed(2)} Y: ${this.position.y.toFixed(2)}`);
            }
        }

        const floorType = this.game.map.terrain.getFloor(this.position);

        this.container.zIndex = FloorTypes[floorType].overlay ? ZIndexes.UnderwaterPlayers : ZIndexes.Players;

        if (floorType !== this.floorType) {
            if (FloorTypes[floorType].overlay) this.images.waterOverlay.setVisible(true);
            this.anims.waterOverlay?.kill();
            this.anims.waterOverlay = new Tween(
                this.game,
                {
                    target: this.images.waterOverlay,
                    to: {
                        alpha: FloorTypes[floorType].overlay ? 1 : 0
                    },
                    duration: 200,
                    onComplete: () => {
                        if (!FloorTypes[floorType].overlay) this.images.waterOverlay.setVisible(false);
                    }
                }
            );
        }
        this.floorType = floorType;

        if (oldPosition !== undefined) {
            this.distSinceLastFootstep += Geometry.distance(oldPosition, this.position);

            if (this.distSinceLastFootstep > 10) {
                this.footstepSound = this.playSound(
                    `${this.floorType}_step_${random(1, 2)}`,
                    {
                        fallOff: 0.6,
                        maxRange: 48
                    }
                );
                this.distSinceLastFootstep = 0;

                if (FloorTypes[floorType].particles) {
                    const options = {
                        frames: "ripple_particle",
                        zIndex: ZIndexes.Ground,
                        position: this.hitbox.randomPoint(),
                        lifetime: 1000,
                        speed: Vec.create(0, 0)
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
            this.container.position.copyFrom(toPixiCoords(this.position));
            this.emoteContainer.position.copyFrom(Vec.add(toPixiCoords(this.position), Vec.create(0, -175)));
        }

        // Animation
        if (this.animationSeq !== data.animation.seq && this.animationSeq !== undefined) {
            this.playAnimation(data.animation.type);
        }
        this.animationSeq = data.animation.seq;

        if (data.full) {
            const full = data.full;

            this.container.visible = !full.dead;
            this.dead = full.dead;

            this.container.alpha = full.invulnerable ? 0.5 : 1;

            this._oldItem = this.activeItem;
            this.activeItem = full.activeItem;

            const skinID = full.skin.idString;
            const skinDef = Loots.fromString<SkinDefinition>(skinID);

            this.images.body.setFrame(`${skinID}_base`);
            this.images.leftFist.setFrame(`${skinID}_fist`);
            this.images.rightFist.setFrame(`${skinID}_fist`);

            const tint = skinDef.grassTint ? GHILLIE_TINT : 0xffffff;
            this.images.body.setTint(tint);
            this.images.leftFist.setTint(tint);
            this.images.rightFist.setTint(tint);

            this.hideEquipment = skinDef.hideEquipment;

            this.equipment.helmet = full.helmet;
            this.equipment.vest = full.vest;
            this.equipment.backpack = full.backpack;

            this.helmetLevel = full.helmet?.level ?? 0;
            this.vestLevel = full.vest?.level ?? 0;
            this.backpackLevel = full.backpack.level;

            const action = full.action;

            if (this.action.type !== action.type || this.action.seq !== action.seq) {
                let actionSoundName = "";
                this.healingParticlesEmitter.active = false;

                this.actionSound?.stop();

                switch (action.type) {
                    case PlayerActions.None: {
                        if (this.isActivePlayer) this.game.uiManager.cancelAction();
                        break;
                    }
                    case PlayerActions.Reload: {
                        const weaponDef = this.activeItem as GunDefinition;
                        const reference = this._getItemReference() as GunDefinition;

                        if (reference.casingParticles?.spawnOnReload) {
                            if (weaponDef.isDual) {
                                this.spawnCasingParticles(true);
                            }
                            this.spawnCasingParticles(false);
                        }

                        actionSoundName = `${weaponDef.idString}_reload`;
                        if (this.isActivePlayer) {
                            this.game.uiManager.animateAction("Reloading...", weaponDef.reloadTime);
                        }

                        break;
                    }
                    case PlayerActions.UseItem: {
                        const itemDef = action.item;
                        actionSoundName = itemDef.idString;
                        this.healingParticlesEmitter.active = true;
                        if (this.isActivePlayer) this.game.uiManager.animateAction(`${itemDef.useText} ${itemDef.name}`, itemDef.useTime);
                        break;
                    }
                }

                if (actionSoundName) {
                    this.actionSound = this.playSound(
                        actionSoundName,
                        {
                            fallOff: 0.6,
                            maxRange: 48
                        }
                    );
                }
            }

            // @ts-expect-error 'item' not existing is okay
            this.action = action;

            this.updateEquipment();

            this.updateFistsPosition(true);
            this.updateWeapon(isNew);
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
                    const lineEnd = toPixiCoords(Vec.add(this.position, Vec.rotate(Vec.create(this.activeItem.length, 0), this.rotation)));
                    ctx.lineTo(lineEnd.x, lineEnd.y);
                    ctx.endFill();
                    break;
                }
                case ItemType.Melee: {
                    drawHitbox(
                        new CircleHitbox(
                            this.activeItem.radius,
                            Vec.add(
                                this.position,
                                Vec.rotate(this.activeItem.offset, this.rotation)
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

    private _getItemReference(): SingleGunNarrowing & WeaponDefinition {
        const weaponDef = this.activeItem;

        return weaponDef.itemType === ItemType.Gun && weaponDef.isDual
            ? Loots.fromString<SingleGunNarrowing>(weaponDef.singleVariant)
            : weaponDef as SingleGunNarrowing & WeaponDefinition;
    }

    private _getOffset(): number {
        const weaponDef = this.activeItem;

        return weaponDef.itemType === ItemType.Gun && weaponDef.isDual
            ? weaponDef.leftRightOffset * PIXI_SCALE
            : 0;
    }

    updateFistsPosition(anim: boolean): void {
        this.anims.leftFist?.kill();
        this.anims.rightFist?.kill();
        this.anims.weapon?.kill();

        const reference = this._getItemReference();
        const fists = reference.fists ?? {
            left: Vec.create(38, -35),
            right: Vec.create(38, 35)
        };
        const offset = this._getOffset();

        if (anim) {
            const duration = "animationDuration" in fists ? fists.animationDuration : 150;

            this.anims.leftFist = new Tween(
                this.game,
                {
                    target: this.images.leftFist,
                    to: { x: fists.left.x, y: fists.left.y - offset },
                    duration
                }
            );

            this.anims.rightFist = new Tween(
                this.game,
                {
                    target: this.images.rightFist,
                    to: { x: fists.right.x, y: fists.right.y + offset },
                    duration
                }
            );
        } else {
            this.images.leftFist.setPos(fists.left.x, fists.left.y - offset);
            this.images.rightFist.setPos(fists.right.x, fists.right.y + offset);
        }

        if (reference.image) {
            this.images.weapon.setPos(reference.image.position.x, reference.image.position.y + offset);
            this.images.altWeapon.setPos(reference.image.position.x, reference.image.position.y - offset);
            this.images.weapon.setAngle(reference.image.angle ?? 0);
        }
    }

    updateWeapon(isNew = false): void {
        const weaponDef = this.activeItem;
        const reference = this._getItemReference();

        this.images.weapon.setVisible(reference.image !== undefined);
        this.images.muzzleFlash.setVisible(reference.image !== undefined);

        if (reference.image) {
            const frame = `${reference.idString}${weaponDef.itemType === ItemType.Gun || (reference.image as NonNullable<MeleeDefinition["image"]>).separateWorldImage ? "_world" : ""}`;

            this.images.weapon.setFrame(frame);
            this.images.altWeapon.setFrame(frame);
            this.images.weapon.setAngle(reference.image.angle ?? 0);
            this.images.altWeapon.setAngle(reference.image.angle ?? 0); // there's an ambiguity here as to whether the angle should be inverted or the same

            if (this.activeItem !== this._oldItem) {
                this.anims.muzzleFlashFade?.kill();
                this.anims.muzzleFlashRecoil?.kill();
                this.images.muzzleFlash.alpha = 0;
                if (this.isActivePlayer && !isNew) this.game.soundManager.play(`${reference.idString}_switch`);
            }

            const offset = this._getOffset();
            this.images.weapon.setPos(reference.image.position.x, reference.image.position.y + offset);
            this.images.altWeapon.setPos(reference.image.position.x, reference.image.position.y - offset);
        }

        this.images.altWeapon.setVisible(weaponDef.itemType === ItemType.Gun && (weaponDef.isDual ?? false));

        switch (weaponDef.itemType) {
            case ItemType.Gun: {
                this.images.rightFist.setZIndex((reference as SingleGunNarrowing).fists.rightZIndex ?? 1);
                this.images.leftFist.setZIndex((reference as SingleGunNarrowing).fists.leftZIndex ?? 1);
                this.images.weapon.setZIndex(2);
                this.images.altWeapon.setZIndex(2);
                this.images.body.setZIndex(3);
                break;
            }
            case ItemType.Melee: {
                this.images.leftFist.setZIndex(4);
                this.images.rightFist.setZIndex(4);
                this.images.body.setZIndex(2);
                this.images.weapon.setZIndex(1);
                break;
            }
            case ItemType.Throwable: {
                this.images.leftFist.setZIndex(4);
                this.images.rightFist.setZIndex(4);
                this.images.body.setZIndex(2);
                this.images.weapon.setZIndex(5);
                break;
            }
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
        if (def && def.level > 0 && !this.hideEquipment) {
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

        if (equipmentType === "backpack") {
            this.game.uiManager.updateItems();
        }
    }

    emote(type: EmoteDefinition): void {
        this.anims.emote?.kill();
        this.anims.emoteHide?.kill();
        this._emoteHideTimeout?.kill();
        this.playSound(
            "emote",
            {
                fallOff: 0.4,
                maxRange: 128
            }
        );
        this.images.emote.setFrame(`${type.idString}`);

        this.emoteContainer.visible = true;
        this.emoteContainer.scale.set(0);
        this.emoteContainer.alpha = 0;

        this.anims.emote = new Tween(
            this.game,
            {
                target: this.emoteContainer,
                to: { alpha: 1 },
                duration: 250,
                ease: EaseFunctions.backOut,
                onUpdate: () => {
                    this.emoteContainer.scale.set(this.emoteContainer.alpha);
                }
            }
        );

        this._emoteHideTimeout = this.addTimeout(() => {
            this.anims.emoteHide = new Tween(this.game, {
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
                if (this.activeItem.itemType !== ItemType.Melee) {
                    console.warn(`Attempted to play melee animation with non melee item ${this.activeItem.idString}`);
                    return;
                }
                this.updateFistsPosition(false);
                const weaponDef = this.activeItem;
                if (weaponDef.fists.useLeft === undefined) break;

                let altFist = Math.random() < 0.5;
                if (!weaponDef.fists.randomFist) altFist = true;

                const duration = weaponDef.fists.animationDuration;

                if (!weaponDef.fists.randomFist || !altFist) {
                    this.anims.leftFist = new Tween(this.game, {
                        target: this.images.leftFist,
                        to: { x: weaponDef.fists.useLeft.x, y: weaponDef.fists.useLeft.y },
                        duration,
                        ease: EaseFunctions.sineIn,
                        yoyo: true
                    });
                }

                if (altFist) {
                    this.anims.rightFist = new Tween(this.game, {
                        target: this.images.rightFist,
                        to: { x: weaponDef.fists.useRight.x, y: weaponDef.fists.useRight.y },
                        duration,
                        ease: EaseFunctions.sineIn,
                        yoyo: true
                    });
                }

                if (weaponDef.image !== undefined) {
                    this.anims.weapon = new Tween(this.game, {
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

                this.playSound(
                    "swing",
                    {
                        fallOff: 0.4,
                        maxRange: 96
                    }
                );

                this.addTimeout(() => {
                    // Play hit effect on closest object
                    // TODO: share this logic with the server
                    const rotated = Vec.rotate(weaponDef.offset, this.rotation);
                    const position = Vec.add(this.position, rotated);
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
                        .forEach(target => target.hitEffect(position, Angle.betweenPoints(this.position, position)));
                }, 50);

                break;
            }
            case AnimationType.Gun:
            case AnimationType.GunAlt:
            case AnimationType.LastShot: {
                if (this.activeItem.itemType !== ItemType.Gun) {
                    console.warn(`Attempted to play gun animation with non gun item ${this.activeItem.idString}`);
                    return;
                }
                const weaponDef = this.activeItem;
                const reference = this._getItemReference();

                this.playSound(
                    `${reference.idString}_fire`,
                    {
                        fallOff: 0.5
                    }
                );

                if (anim === AnimationType.LastShot) {
                    this.playSound(
                        `${reference.idString}_last_shot`,
                        {
                            fallOff: 0.5
                        }
                    );
                }

                const isAltFire = weaponDef.isDual
                    ? anim === AnimationType.GunAlt
                    : undefined;

                this.updateFistsPosition(false);
                const recoilAmount = PIXI_SCALE * (1 - weaponDef.recoilMultiplier);

                this.anims.weapon = new Tween(this.game, {
                    target: isAltFire ? this.images.altWeapon : this.images.weapon,
                    to: { x: reference.image.position.x - recoilAmount },
                    duration: 50,
                    yoyo: true
                });

                if (!weaponDef.noMuzzleFlash) {
                    const muzzleFlash = this.images.muzzleFlash;

                    muzzleFlash.x = weaponDef.length * PIXI_SCALE;
                    muzzleFlash.y = (isAltFire ? -1 : 1) * this._getOffset();
                    muzzleFlash.setVisible(true);
                    muzzleFlash.alpha = 0.95;
                    muzzleFlash.scale = Vec.create(
                        randomFloat(0.75, 1.25),
                        randomFloat(0.5, 1.5) * (randomBoolean() ? 1 : -1)
                    );

                    this.anims.muzzleFlashFade?.kill();
                    this.anims.muzzleFlashRecoil?.kill();
                    this.anims.muzzleFlashFade = new Tween(
                        this.game,
                        {
                            target: muzzleFlash,
                            to: { alpha: 0 },
                            duration: 100,
                            onComplete: () => muzzleFlash.setVisible(false)
                        }
                    );

                    this.anims.muzzleFlashRecoil = new Tween(
                        this.game,
                        {
                            target: muzzleFlash,
                            to: { x: muzzleFlash.x - recoilAmount },
                            duration: 50,
                            yoyo: true
                        }
                    );
                }

                if (isAltFire !== false) {
                    this.anims.leftFist = new Tween(
                        this.game,
                        {
                            target: this.images.leftFist,
                            to: { x: reference.fists.left.x - recoilAmount },
                            duration: 50,
                            yoyo: true
                        }
                    );
                }

                if (isAltFire !== true) {
                    this.anims.rightFist = new Tween(
                        this.game,
                        {
                            target: this.images.rightFist,
                            to: { x: reference.fists.right.x - recoilAmount },
                            duration: 50,
                            yoyo: true
                        }
                    );
                }

                if (!reference.casingParticles?.spawnOnReload) {
                    this.spawnCasingParticles(isAltFire);
                }
                break;
            }
            case AnimationType.GunClick: {
                this.playSound(
                    "gun_click",
                    {
                        fallOff: 0.8,
                        maxRange: 48
                    }
                );
                break;
            }
            case AnimationType.ThrowableCook: {
                if (this.activeItem.itemType !== ItemType.Throwable) {
                    console.warn(`Attempted to play throwable animation with non throwable item ${this.activeItem.idString}`);
                    return;
                }

                this.playSound("throwable_pin");

                const def = this.activeItem;
                const projImage = this.images.weapon;
                const pinImage = this.images.altWeapon;

                projImage.visible = true;
                pinImage.setFrame(def.animation.pinImage);
                pinImage.setPos(35, 0);
                pinImage.setZIndex(ZIndexes.Players + 1);
                projImage.setFrame(def.animation.cook.cookingImage ?? def.animation.liveImage);

                this.anims.leftFist = new Tween(
                    this.game,
                    {
                        target: this.images.leftFist,
                        to: { x: 35, y: 0 },
                        duration: def.cookTime / 2,
                        onComplete: () => {
                            this.anims.leftFist = new Tween(
                                this.game,
                                {
                                    target: this.images.leftFist,
                                    to: Vec.scale(def.animation.cook.leftFist, PIXI_SCALE),
                                    duration: def.cookTime / 2
                                }
                            );

                            pinImage.visible = true;
                            this.anims.pin = new Tween(
                                this.game, {
                                    target: pinImage,
                                    duration: def.cookTime / 2,
                                    to: {
                                        ...Vec.add(Vec.scale(def.animation.cook.leftFist, PIXI_SCALE), Vec.create(15, 0))
                                    }
                                }
                            );
                        }
                    }
                );

                if (def.cookable) {
                    this.game.particleManager.spawnParticle({
                        frames: def.animation.leverImage,
                        lifetime: 600,
                        position: this.position,
                        zIndex: ZIndexes.Players + 1,
                        speed: Vec.rotate(Vec.create(8, 8), this.rotation),
                        rotation: this.rotation,
                        alpha: {
                            start: 1,
                            end: 0
                        },
                        scale: {
                            start: 0.8,
                            end: 1
                        }
                    });
                }

                this.anims.weapon = new Tween(
                    this.game,
                    {
                        target: projImage,
                        to: { x: 25, y: 10 },
                        duration: def.cookTime / 2
                    }
                );

                this.anims.rightFist = new Tween(
                    this.game,
                    {
                        target: this.images.rightFist,
                        to: { x: 25, y: 10 },
                        duration: def.cookTime / 2,
                        onComplete: () => {
                            this.anims.weapon = new Tween(
                                this.game,
                                {
                                    target: projImage,
                                    to: Vec.scale(def.animation.cook.rightFist, PIXI_SCALE),
                                    duration: def.cookTime / 2
                                }
                            );

                            this.anims.rightFist = new Tween(
                                this.game,
                                {
                                    target: this.images.rightFist,
                                    to: Vec.scale(def.animation.cook.rightFist, PIXI_SCALE),
                                    duration: def.cookTime / 2
                                }
                            );
                        }
                    }
                );

                break;
            }
            case AnimationType.ThrowableThrow: {
                if (this.activeItem.itemType !== ItemType.Throwable) {
                    console.warn(`Attempted to play throwable animation with non throwable item ${this.activeItem.idString}`);
                    return;
                }
                this.playSound("throwable_throw");

                const def = this.activeItem;

                this.images.altWeapon.visible = false;
                const projImage = this.images.weapon;
                projImage.visible = false;
                projImage.setFrame(def.idString);

                if (!def.cookable) {
                    this.game.particleManager.spawnParticle({
                        frames: def.animation.leverImage,
                        lifetime: 600,
                        position: this.position,
                        zIndex: ZIndexes.Players + 1,
                        speed: Vec.rotate(Vec.create(8, 8), this.rotation),
                        rotation: this.rotation,
                        alpha: {
                            start: 1,
                            end: 0
                        },
                        scale: {
                            start: 0.8,
                            end: 1
                        }
                    });
                }

                this.anims.rightFist?.kill();
                this.anims.leftFist?.kill();
                this.anims.weapon?.kill();

                this.anims.leftFist = new Tween(
                    this.game,
                    {
                        target: this.images.leftFist,
                        to: Vec.scale(def.animation.throw.leftFist, PIXI_SCALE),
                        duration: def.throwTime,
                        onComplete: () => {
                            projImage.setVisible(true);
                            this.updateFistsPosition(true);
                        }
                    }
                );

                this.anims.rightFist = new Tween(
                    this.game,
                    {
                        target: this.images.rightFist,
                        to: Vec.scale(def.animation.throw.rightFist, PIXI_SCALE),
                        duration: def.throwTime
                    }
                );

                break;
            }
        }
    }

    hitEffect(position: Vector, angle: number): void {
        this.game.soundManager.play(
            randomBoolean() ? "player_hit_1" : "player_hit_2",
            {
                position,
                fallOff: 0.2,
                maxRange: 96
            });

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
            speed: Vec.fromPolar(angle, randomFloat(0.5, 1))
        });
    }

    destroy(): void {
        super.destroy();

        const images = this.images;
        images.aimTrail.destroy();
        images.vest.destroy();
        images.body.destroy();
        images.leftFist.destroy();
        images.rightFist.destroy();
        images.backpack.destroy();
        images.helmet.destroy();
        images.weapon.destroy();
        images.altWeapon.destroy();
        images.muzzleFlash.destroy();
        images.emoteBackground.destroy();
        images.emote.destroy();
        images.waterOverlay.destroy();

        this.healingParticlesEmitter.destroy();
        this.actionSound?.stop();
        if (this.isActivePlayer) $("#action-container").hide();
        this.emoteContainer.destroy();

        const anims = this.anims;
        anims.emoteHide?.kill();
        anims.waterOverlay?.kill();
        anims.emote?.kill();
        anims.leftFist?.kill();
        anims.rightFist?.kill();
        anims.weapon?.kill();
        anims.muzzleFlashFade?.kill();
        anims.muzzleFlashRecoil?.kill();
    }
}
