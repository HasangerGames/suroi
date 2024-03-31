import $ from "jquery";
import { Container, Text, TilingSprite } from "pixi.js";
import { AnimationType, GameConstants, InputActions, ObjectCategory, PlayerActions, SpectateActions, ZIndexes } from "../../../../common/src/constants";
import { Ammos } from "../../../../common/src/definitions/ammos";
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
import { random, randomBoolean, randomFloat, randomRotation, randomSign, randomVector } from "../../../../common/src/utils/random";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GameSound } from "../managers/soundManager";
import { COLORS, GHILLIE_TINT, HITBOX_COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import { GameObject } from "./gameObject";
import { Obstacle } from "./obstacle";
import { type ParticleEmitter } from "./particles";

export class Player extends GameObject<ObjectCategory.Player> {
    override readonly type = ObjectCategory.Player;

    teamID!: number;

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

    footstepSound?: GameSound;
    actionSound?: GameSound;

    action = {
        type: PlayerActions.None,
        item: undefined as undefined | HealingItemDefinition
    };

    damageable = true;

    hideEquipment = false;

    downed = false;
    beingRevived = false;
    bleedEffectInterval?: NodeJS.Timeout;

    readonly images: {
        readonly aimTrail: TilingSprite
        readonly vest: SuroiSprite
        readonly body: SuroiSprite
        readonly leftFist: SuroiSprite
        readonly rightFist: SuroiSprite
        readonly leftLeg?: SuroiSprite
        readonly rightLeg?: SuroiSprite
        readonly backpack: SuroiSprite
        readonly helmet: SuroiSprite
        readonly weapon: SuroiSprite
        readonly altWeapon: SuroiSprite
        readonly muzzleFlash: SuroiSprite
        readonly waterOverlay: SuroiSprite
        readonly badge?: SuroiSprite
    };

    readonly emote: {
        image: SuroiSprite
        background: SuroiSprite
        container: Container
    };

    teammateName?: {
        text: Text
        badge?: SuroiSprite
        container: Container
    };

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

    helmetLevel = NaN;
    vestLevel = NaN;
    backpackLevel = NaN;

    hitbox = new CircleHitbox(GameConstants.player.radius);

    floorType: keyof typeof FloorTypes = "grass";

    constructor(game: Game, id: number, data: Required<ObjectsNetData[ObjectCategory.Player]>) {
        super(game, id);

        this.images = {
            aimTrail: new TilingSprite({ texture: SuroiSprite.getTexture("aimTrail"), width: 20, height: 6000 }),
            vest: new SuroiSprite().setVisible(false),
            body: new SuroiSprite(),
            leftFist: new SuroiSprite(),
            rightFist: new SuroiSprite(),
            leftLeg: game.teamMode ? new SuroiSprite().setPos(-38, 26).setZIndex(-1) : undefined,
            rightLeg: game.teamMode ? new SuroiSprite().setPos(-38, -26).setZIndex(-1) : undefined,
            backpack: new SuroiSprite().setPos(-55, 0).setVisible(false).setZIndex(5),
            helmet: new SuroiSprite().setPos(-8, 0).setVisible(false).setZIndex(6),
            weapon: new SuroiSprite().setZIndex(3),
            altWeapon: new SuroiSprite().setZIndex(3),
            muzzleFlash: new SuroiSprite("muzzle_flash").setVisible(false).setZIndex(7).setAnchor(Vec.create(0, 0.5)),
            waterOverlay: new SuroiSprite("water_overlay").setVisible(false).setTint(COLORS.water)
        };

        this.container.addChild(
            this.images.aimTrail,
            this.images.vest,
            this.images.body,
            this.images.leftFist,
            this.images.rightFist,
            ...(game.teamMode ? [this.images.leftLeg!, this.images.rightLeg!] : []),
            this.images.backpack,
            this.images.helmet,
            this.images.weapon,
            this.images.altWeapon,
            this.images.muzzleFlash,
            this.images.waterOverlay
        );

        if (game.teamMode) {
            this.images.leftLeg!.scale = this.images.rightLeg!.scale = Vec.create(1.5, 0.8);
        }

        this.images.aimTrail.angle = 90;
        this.images.aimTrail.position = Vec.create(6000, -8);
        this.images.aimTrail.alpha = 0;
        if (!this.isActivePlayer) this.images.aimTrail.alpha = 0;

        let emote: this["emote"];
        this.emote = emote = {
            background: new SuroiSprite("emote_background").setPos(0, 0),
            image: new SuroiSprite().setPos(0, 0),
            container: new Container()
        };

        this.game.camera.addObject(emote.container);
        emote.container.addChild(emote.background, emote.image);
        emote.container.zIndex = ZIndexes.Emotes;
        emote.container.visible = false;

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

        this.images.body.eventMode = "static";
        this.images.body.on("pointerdown", (): void => {
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
        if (!this.destroyed) {
            this.emote.container.position = Vec.addComponent(this.container.position, 0, -175);
            if (this.teammateName) this.teammateName.container.position = Vec.addComponent(this.container.position, 0, 95);
        }
    }

    spawnCasingParticles(filterBy: "fire" | "reload", altFire = false): void {
        const weaponDef = this.activeItem as GunDefinition;
        const reference = this._getItemReference() as SingleGunNarrowing;
        const initialRotation = this.rotation + Math.PI / 2;
        const casings = reference.casingParticles.filter(c => (c.on ?? "fire") === filterBy) as NonNullable<SingleGunNarrowing["casingParticles"]>;

        if (!casings.length) return;

        for (const casingSpec of casings) {
            const position = Vec.clone(casingSpec.position);
            if (weaponDef.isDual) {
                position.y = (altFire ? -1 : 1) * (position.y + weaponDef.leftRightOffset);
            }

            const spawnCasings = (): void => {
                const casingVelX = casingSpec.velocity?.x;
                const casingVelY = casingSpec.velocity?.y;

                this.game.particleManager.spawnParticles(
                    casingSpec.count ?? 1,
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
                            frames: casingSpec.frame ?? Ammos.fromString(weaponDef.ammoType).defaultCasingFrame,
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

            if (!casingSpec.ejectionDelay) {
                spawnCasings();
            } else {
                const reference = weaponDef.idString;
                this.addTimeout(
                    () => {
                        if (reference !== this.activeItem.idString) return;

                        spawnCasings();
                    },
                    casingSpec.ejectionDelay
                );
            }
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

            if (this.game.console.getBuiltInCVar("pf_show_pos")) {
                this.game.uiManager.debugReadouts.pos.text(`X: ${this.position.x.toFixed(2)} Y: ${this.position.y.toFixed(2)}`);
            }
        }

        const floorType = this.game.map.terrain.getFloor(this.position);

        const doOverlay = FloorTypes[floorType].overlay;
        let updateContainerZIndex = isNew || FloorTypes[this.floorType].overlay !== doOverlay;

        if (floorType !== this.floorType) {
            if (doOverlay) this.images.waterOverlay.setVisible(true);

            this.anims.waterOverlay?.kill();
            this.anims.waterOverlay = this.game.addTween(
                {
                    target: this.images.waterOverlay,
                    to: {
                        alpha: doOverlay ? 1 : 0
                    },
                    duration: 200,
                    onComplete: () => {
                        if (!doOverlay) this.images.waterOverlay.setVisible(false);

                        this.anims.waterOverlay = undefined;
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
                        falloff: 0.6,
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
            this.emote.container.position.copyFrom(Vec.add(toPixiCoords(this.position), Vec.create(0, -175)));
            this.teammateName?.container.position.copyFrom(Vec.add(toPixiCoords(this.position), Vec.create(0, 95)));
        }

        if (data.animation !== undefined) {
            this.playAnimation(data.animation);
        }

        if (data.full) {
            const full = data.full;

            this.container.visible = !full.dead;
            this.dead = full.dead;

            this.teamID = data.full.teamID;
            if (
                !this.isActivePlayer &&
                !this.teammateName &&
                !this.dead &&
                this.teamID === this.game.teamID
            ) {
                const name = this.game.playerNames.get(this.id);
                this.teammateName = {
                    text: new Text({
                        text: this.game.uiManager.getRawPlayerName(this.id),
                        style: {
                            fill: name?.hasColor ? name?.nameColor : "#ffffff",
                            fontSize: 36,
                            fontFamily: "Inter",
                            dropShadow: {
                                alpha: 0.8,
                                color: "black",
                                blur: 2,
                                distance: 2
                            }
                        }
                    }),
                    badge: name?.badge ? new SuroiSprite(name.badge.idString) : undefined,
                    container: new Container()
                };
                const { text, badge, container } = this.teammateName;

                text.anchor.set(0.5);
                container.addChild(this.teammateName.text);

                if (badge) {
                    const oldWidth = badge.width;
                    badge.width = text.height / 1.25;
                    badge.height *= badge.width / oldWidth;
                    badge.position = Vec.create(
                        text.width / 2 + 20,
                        0
                    );
                    container.addChild(badge);
                }

                container.zIndex = ZIndexes.DeathMarkers;
                this.game.camera.addObject(container);
            }

            this.container.alpha = full.invulnerable ? 0.5 : 1;

            if (this.downed !== full.downed) {
                updateContainerZIndex = true;
                this.downed = full.downed;
                this.updateFistsPosition(false);
                this.updateWeapon(isNew);
                this.updateEquipment();

                if (!this.dead) {
                    this.updateFistsPosition(false);
                    this.updateWeapon(isNew);
                }
            }

            if (this.beingRevived !== full.beingRevived) {
                this.beingRevived = full.beingRevived;

                if (this.isActivePlayer) {
                    // somewhat an abuse of that system, but dedicating an
                    // entire "action" to this would be wasteful
                    if (this.beingRevived) {
                        this.game.uiManager.animateAction("Being revived...", GameConstants.player.reviveTime, true);
                    } else {
                        this.game.uiManager.cancelAction();
                    }
                }
            }

            if (this.downed && !this.beingRevived && !this.bleedEffectInterval) {
                const bleed = (): void => this.hitEffect(this.position, randomRotation(), "bleed");
                bleed();
                this.bleedEffectInterval = setInterval(bleed, 1000);
            }

            if (this.dead || this.beingRevived) {
                clearInterval(this.bleedEffectInterval);
                this.bleedEffectInterval = undefined;
            }

            if (this.dead && this.teammateName) this.teammateName.container.visible = false;

            this._oldItem = this.activeItem;
            const itemDirty = this.activeItem !== full.activeItem;
            this.activeItem = full.activeItem;

            const skinID = full.skin.idString;
            if (this.isActivePlayer) {
                this.game.uiManager.skinID = skinID;
                this.game.uiManager.updateWeapons();
            }
            const skinDef = Loots.fromString<SkinDefinition>(skinID);
            const tint = skinDef.grassTint ? GHILLIE_TINT : 0xffffff;

            const { body, leftFist, rightFist, leftLeg, rightLeg } = this.images;

            body
                .setFrame(`${skinID}_base`)
                .setTint(tint);
            leftFist
                .setFrame(`${skinID}_fist`)
                .setTint(tint);
            rightFist
                .setFrame(`${skinID}_fist`)
                .setTint(tint);
            leftLeg
                ?.setFrame(`${skinID}_fist`)
                .setTint(tint);
            rightLeg
                ?.setFrame(`${skinID}_fist`)
                .setTint(tint);

            const { hideEquipment, helmetLevel, vestLevel, backpackLevel } = this;

            this.hideEquipment = skinDef.hideEquipment;

            this.helmetLevel = (this.equipment.helmet = full.helmet)?.level ?? 0;
            this.vestLevel = (this.equipment.vest = full.vest)?.level ?? 0;
            this.backpackLevel = (this.equipment.backpack = full.backpack).level;

            const equipmentDirty =
                hideEquipment !== this.hideEquipment ||
                helmetLevel !== this.helmetLevel ||
                vestLevel !== this.vestLevel ||
                backpackLevel !== this.backpackLevel;

            if (equipmentDirty) {
                this.updateEquipment();
            }

            if (itemDirty) {
                this.updateFistsPosition(true);
                this.updateWeapon(isNew);
            }
        }

        if (updateContainerZIndex) {
            // i love ternary spam
            this.container.zIndex = doOverlay
                ? this.downed
                    ? ZIndexes.UnderwaterDownedPlayers
                    : ZIndexes.UnderwaterPlayers
                : this.downed
                    ? ZIndexes.DownedPlayers
                    : ZIndexes.Players;
        }

        if (data.action !== undefined) {
            const action = data.action;

            let actionSoundName = "";
            this.healingParticlesEmitter.active = false;

            this.actionSound?.stop();

            switch (action.type) {
                case PlayerActions.None: {
                    // Reset fists after reviving
                    if (this.action.type === PlayerActions.Revive) {
                        this.updateFistsPosition(true);
                        this.updateWeapon();
                    }

                    if (this.isActivePlayer) {
                        this.game.uiManager.cancelAction();
                    }
                    break;
                }
                case PlayerActions.Reload: {
                    const weaponDef = this.activeItem as GunDefinition;

                    if (weaponDef.isDual) {
                        this.spawnCasingParticles("reload", true);
                    }

                    this.spawnCasingParticles("reload", false);

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
                    if (this.isActivePlayer) {
                        this.game.uiManager.animateAction(`${itemDef.useText} ${itemDef.name}`, itemDef.useTime);
                    }
                    break;
                }
                case PlayerActions.Revive: {
                    if (this.isActivePlayer) {
                        this.game.uiManager.animateAction("Reviving...", GameConstants.player.reviveTime);
                    }
                    break;
                }
            }

            if (actionSoundName) {
                this.actionSound = this.playSound(
                    actionSoundName,
                    {
                        falloff: 0.6,
                        maxRange: 48
                    }
                );
            }

            // @ts-expect-error 'item' not existing is okay
            this.action = action;
        }

        if (HITBOX_DEBUG_MODE) {
            const ctx = this.debugGraphics;
            ctx.clear();

            drawHitbox(this.hitbox, HITBOX_COLORS.player, ctx);

            if (this.downed) {
                drawHitbox(new CircleHitbox(5, this.position), HITBOX_COLORS.obstacleNoCollision, ctx);
                // revival range
            }

            switch (this.activeItem.itemType) {
                case ItemType.Gun: {
                    ctx.setStrokeStyle({
                        color: HITBOX_COLORS.playerWeapon,
                        width: 4
                    });
                    ctx.moveTo(this.container.position.x, this.container.position.y);
                    const lineEnd = toPixiCoords(Vec.add(this.position, Vec.rotate(Vec.create(this.activeItem.length, 0), this.rotation)));
                    ctx.lineTo(lineEnd.x, lineEnd.y);
                    ctx.stroke();
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

        this.images.leftLeg?.setVisible(this.downed);
        this.images.rightLeg?.setVisible(this.downed);

        if (this.downed) {
            this.images.leftFist.setPos(38, 32);
            this.images.rightFist.setPos(38, -32);
            return;
        }

        const reference = this._getItemReference();
        const fists = reference.fists ?? {
            left: Vec.create(38, -35),
            right: Vec.create(38, 35)
        };
        const offset = this._getOffset();

        if (anim) {
            const duration = "animationDuration" in fists ? fists.animationDuration : 150;

            this.anims.leftFist = this.game.addTween({
                target: this.images.leftFist,
                to: { x: fists.left.x, y: fists.left.y - offset },
                duration,
                onComplete: () => {
                    this.anims.leftFist = undefined;
                }
            });

            this.anims.rightFist = this.game.addTween({
                target: this.images.rightFist,
                to: { x: fists.right.x, y: fists.right.y + offset },
                duration,
                onComplete: () => {
                    this.anims.rightFist = undefined;
                }
            });
        } else {
            this.images.leftFist.setPos(fists.left.x, fists.left.y - offset);
            this.images.rightFist.setPos(fists.right.x, fists.right.y + offset);
        }

        if (reference.image) {
            this.images.weapon.setPos(reference.image.position.x, reference.image.position.y + offset);
            this.images.altWeapon.setPos(reference.image.position.x, reference.image.position.y - offset);
            this.images.weapon.setAngle(reference.image.angle);
        }
    }

    updateWeapon(isNew = false): void {
        if (this.downed) {
            this.images.weapon.setVisible(false);
            this.images.altWeapon.setVisible(false);
            this.images.muzzleFlash.setVisible(false);
            this.images.leftFist.setZIndex(-1);
            this.images.rightFist.setZIndex(-1);
            this.container.sortChildren();
            return;
        }

        const weaponDef = this.activeItem;
        const reference = this._getItemReference();

        this.images.weapon.setVisible(reference.image !== undefined);
        this.images.muzzleFlash.setVisible(reference.image !== undefined);

        if (reference.image) {
            const frame = `${reference.idString}${weaponDef.itemType === ItemType.Gun || (reference.image as NonNullable<MeleeDefinition["image"]>).separateWorldImage ? "_world" : ""}`;

            this.images.weapon.setFrame(frame);
            this.images.altWeapon.setFrame(frame);
            this.images.weapon.setAngle(reference.image.angle);
            this.images.altWeapon.setAngle(reference.image.angle); // there's an ambiguity here as to whether the angle should be inverted or the same

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
                this.images.rightFist.setZIndex(reference.fists.rightZIndex);
                this.images.leftFist.setZIndex(reference.fists.leftZIndex);
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
        if (
            def &&
            def.level > 0 &&
            !this.hideEquipment &&
            (type !== "backpack" || !this.downed)
        ) {
            image.setFrame(`${def.idString}_world`).setVisible(true);

            if (type === "helmet") {
                image.setPos(
                    this.downed ? 10 : -8,
                    0
                );
            }
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

        container[0].addEventListener(
            "pointerdown",
            (e: PointerEvent): void => {
                e.stopImmediatePropagation();
                if (e.button === 2 && def) {
                    this.game.inputManager.addAction({
                        type: InputActions.DropItem,
                        item: def
                    });
                }
            }
        );

        if (equipmentType === "backpack") {
            this.game.uiManager.updateItems();
        }
    }

    getEquipment(equipmentType: string): ArmorDefinition | BackpackDefinition {
        const equipment: ArmorDefinition | BackpackDefinition = Loots.fromString("bag");
        switch (equipmentType) {
            case "helmet":
                if (this.equipment.helmet) {
                    return this.equipment.helmet;
                }
                break;
            case "vest":
                if (this.equipment.vest) {
                    return this.equipment.vest;
                }
                break;
            case "backpack":
                if (this.equipment.backpack) {
                    return this.equipment.backpack;
                }
                break;
        }
        return equipment;
    }

    canInteract(player: Player): boolean {
        return this.game.teamMode &&
            !player.downed &&
            this.downed &&
            !this.beingRevived &&
            this !== player &&
            this.teamID === player.teamID;
    }

    sendEmote(type: EmoteDefinition): void {
        this.anims.emote?.kill();
        this.anims.emoteHide?.kill();
        this._emoteHideTimeout?.kill();
        this.playSound(
            "emote",
            {
                falloff: 0.4,
                maxRange: 128
            }
        );
        this.emote.image.setFrame(`${type.idString}`);

        this.emote.container.visible = true;
        this.emote.container.scale.set(0);
        this.emote.container.alpha = 0;

        this.anims.emote = this.game.addTween({
            target: this.emote.container,
            to: { alpha: 1 },
            duration: 250,
            ease: EaseFunctions.backOut,
            onUpdate: () => {
                this.emote.container.scale.set(this.emote.container.alpha);
            },
            onComplete: () => {
                this.anims.emote = undefined;
            }
        });

        this._emoteHideTimeout = this.addTimeout(() => {
            this.anims.emoteHide = this.game.addTween({
                target: this.emote.container,
                to: { alpha: 0 },
                duration: 200,
                onUpdate: () => {
                    this.emote.container.scale.set(this.emote.container.alpha);
                },
                onComplete: () => {
                    this._emoteHideTimeout = undefined;
                    this.anims.emoteHide = undefined;

                    this.emote.container.visible = false;
                    this.anims.emote?.kill();
                    this.anims.emote = undefined;
                    this._emoteHideTimeout = undefined;
                }
            });
        }, 4000);
    }

    playAnimation(anim: AnimationType): void {
        switch (anim) {
            case AnimationType.Melee: {
                if (this.activeItem.itemType !== ItemType.Melee) {
                    console.warn(`Attempted to play melee animation with non-melee item '${this.activeItem.idString}'`);
                    return;
                }
                this.updateFistsPosition(false);
                const weaponDef = this.activeItem;
                if (weaponDef.fists.useLeft === undefined) break;

                let altFist = Math.random() < 0.5;
                if (!weaponDef.fists.randomFist) altFist = true;

                const duration = weaponDef.fists.animationDuration;

                if (!weaponDef.fists.randomFist || !altFist) {
                    this.anims.leftFist = this.game.addTween({
                        target: this.images.leftFist,
                        to: { x: weaponDef.fists.useLeft.x, y: weaponDef.fists.useLeft.y },
                        duration,
                        ease: EaseFunctions.sineIn,
                        yoyo: true
                    });
                }

                if (altFist) {
                    this.anims.rightFist = this.game.addTween({
                        target: this.images.rightFist,
                        to: { x: weaponDef.fists.useRight.x, y: weaponDef.fists.useRight.y },
                        duration,
                        ease: EaseFunctions.sineIn,
                        yoyo: true
                    });
                }

                if (weaponDef.image !== undefined) {
                    this.anims.weapon = this.game.addTween({
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
                        falloff: 0.4,
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
                    console.warn(`Attempted to play gun animation (${AnimationType[anim]}) with non-gun item '${this.activeItem.idString}'`);
                    return;
                }
                const weaponDef = this.activeItem;
                const reference = this._getItemReference();

                this.playSound(
                    `${reference.idString}_fire`,
                    {
                        falloff: 0.5
                    }
                );

                if (anim === AnimationType.LastShot) {
                    this.playSound(
                        `${reference.idString}_last_shot`,
                        {
                            falloff: 0.5
                        }
                    );
                }

                const isAltFire = weaponDef.isDual
                    ? anim === AnimationType.GunAlt
                    : undefined;

                this.updateFistsPosition(false);
                const recoilAmount = PIXI_SCALE * (1 - weaponDef.recoilMultiplier);

                this.anims.weapon = this.game.addTween({
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
                    this.anims.muzzleFlashFade = this.game.addTween({
                        target: muzzleFlash,
                        to: { alpha: 0 },
                        duration: 100,
                        onComplete: () => {
                            muzzleFlash.setVisible(false);
                            this.anims.muzzleFlashFade = undefined;
                        }
                    });

                    this.anims.muzzleFlashRecoil = this.game.addTween({
                        target: muzzleFlash,
                        to: { x: muzzleFlash.x - recoilAmount },
                        duration: 50,
                        yoyo: true,
                        onComplete: () => {
                            this.anims.muzzleFlashRecoil = undefined;
                        }
                    });
                }

                if (isAltFire !== false) {
                    this.anims.leftFist = this.game.addTween({
                        target: this.images.leftFist,
                        to: { x: reference.fists.left.x - recoilAmount },
                        duration: 50,
                        yoyo: true,
                        onComplete: () => {
                            this.anims.leftFist = undefined;
                        }
                    });
                }

                if (isAltFire !== true) {
                    this.anims.rightFist = this.game.addTween({
                        target: this.images.rightFist,
                        to: { x: reference.fists.right.x - recoilAmount },
                        duration: 50,
                        yoyo: true,
                        onComplete: () => {
                            this.anims.rightFist = undefined;
                        }
                    });
                }

                this.spawnCasingParticles("fire", isAltFire);
                break;
            }
            case AnimationType.GunClick: {
                this.playSound(
                    "gun_click",
                    {
                        falloff: 0.8,
                        maxRange: 48
                    }
                );
                break;
            }
            case AnimationType.ThrowableCook: {
                if (this.activeItem.itemType !== ItemType.Throwable) {
                    console.warn(`Attempted to play throwable cooking animation with non-throwable item '${this.activeItem.idString}'`);
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

                this.anims.leftFist = this.game.addTween({
                    target: this.images.leftFist,
                    to: { x: 35, y: 0 },
                    duration: def.cookTime / 2,
                    onComplete: () => {
                        this.anims.leftFist = this.game.addTween({
                            target: this.images.leftFist,
                            to: Vec.scale(def.animation.cook.leftFist, PIXI_SCALE),
                            duration: def.cookTime / 2,
                            onComplete: () => {
                                this.anims.leftFist = undefined;
                            }
                        });

                        pinImage.visible = true;
                        this.anims.pin = this.game.addTween({
                            target: pinImage,
                            duration: def.cookTime / 2,
                            to: {
                                ...Vec.add(Vec.scale(def.animation.cook.leftFist, PIXI_SCALE), Vec.create(15, 0))
                            },
                            onComplete: () => {
                                this.anims.pin = undefined;
                            }
                        });
                    }
                });

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

                this.anims.weapon = this.game.addTween({
                    target: projImage,
                    to: { x: 25, y: 10 },
                    duration: def.cookTime / 2,
                    onComplete: () => {
                        this.anims.weapon = undefined;
                    }
                });

                this.anims.rightFist = this.game.addTween({
                    target: this.images.rightFist,
                    to: { x: 25, y: 10 },
                    duration: def.cookTime / 2,
                    onComplete: () => {
                        this.anims.weapon = this.game.addTween({
                            target: projImage,
                            to: Vec.scale(def.animation.cook.rightFist, PIXI_SCALE),
                            duration: def.cookTime / 2,
                            onComplete: () => {
                                this.anims.weapon = undefined;
                            }
                        });

                        this.anims.rightFist = this.game.addTween({
                            target: this.images.rightFist,
                            to: Vec.scale(def.animation.cook.rightFist, PIXI_SCALE),
                            duration: def.cookTime / 2,
                            onComplete: () => {
                                this.anims.rightFist = undefined;
                            }
                        });
                    }
                });

                break;
            }
            case AnimationType.ThrowableThrow: {
                if (this.activeItem.itemType !== ItemType.Throwable) {
                    console.warn(`Attempted to play throwable throwing animation with non-throwable item '${this.activeItem.idString}'`);
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

                this.anims.leftFist = this.game.addTween({
                    target: this.images.leftFist,
                    to: Vec.scale(def.animation.throw.leftFist, PIXI_SCALE),
                    duration: def.throwTime,
                    onComplete: () => {
                        this.anims.leftFist = undefined;
                        projImage.setVisible(true);
                        this.updateFistsPosition(true);
                    }
                });

                this.anims.rightFist = this.game.addTween({
                    target: this.images.rightFist,
                    to: Vec.scale(def.animation.throw.rightFist, PIXI_SCALE),
                    duration: def.throwTime,
                    onComplete: () => {
                        this.anims.rightFist = undefined;
                    }
                });

                break;
            }
            case AnimationType.Revive: {
                this.images.weapon.setVisible(false);
                this.images.altWeapon.setVisible(false);
                this.images.muzzleFlash.setVisible(false);
                this.images.leftFist.setZIndex(4);
                this.images.rightFist.setZIndex(4);
                this.anims.leftFist = this.game.addTween({
                    target: this.images.leftFist,
                    to: Vec.create(28, -45),
                    duration: 100,
                    onComplete: () => {
                        this.anims.leftFist = undefined;
                    }
                });
                this.anims.rightFist = this.game.addTween({
                    target: this.images.rightFist,
                    to: Vec.create(58, 48),
                    duration: 100,
                    onComplete: () => {
                        this.anims.rightFist = undefined;
                    }
                });
                break;
            }
        }
    }

    hitEffect(position: Vector, angle: number, sound?: string): void {
        this.game.soundManager.play(
            sound ?? (randomBoolean() ? "player_hit_1" : "player_hit_2"),
            {
                position,
                falloff: 0.2,
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

        const { images, emote, teammateName, anims } = this;

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
        images.waterOverlay.destroy();

        emote.image.destroy();
        emote.background.destroy();
        emote.container.destroy();

        teammateName?.text.destroy();
        teammateName?.badge?.destroy();
        teammateName?.container.destroy();

        anims.emoteHide?.kill();
        anims.waterOverlay?.kill();
        anims.emote?.kill();
        anims.leftFist?.kill();
        anims.rightFist?.kill();
        anims.weapon?.kill();
        anims.muzzleFlashFade?.kill();
        anims.muzzleFlashRecoil?.kill();

        this.healingParticlesEmitter.destroy();
        this.actionSound?.stop();
        clearInterval(this.bleedEffectInterval);
        if (this.isActivePlayer) $("#action-container").hide();
    }
}
