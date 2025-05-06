import { AnimationType, GameConstants, InputActions, Layer, ObjectCategory, PlayerActions, SpectateActions, ZIndexes } from "@common/constants";
import { type EmoteDefinition } from "@common/definitions/emotes";
import { Ammos } from "@common/definitions/items/ammos";
import { type ArmorDefinition } from "@common/definitions/items/armors";
import { type BackpackDefinition } from "@common/definitions/items/backpacks";
import { type GunDefinition, type SingleGunNarrowing } from "@common/definitions/items/guns";
import { HealType, type HealingItemDefinition } from "@common/definitions/items/healingItems";
import { DEFAULT_HAND_RIGGING, type MeleeDefinition } from "@common/definitions/items/melees";
import { PerkData, PerkIds } from "@common/definitions/items/perks";
import { Skins, type SkinDefinition } from "@common/definitions/items/skins";
import { Loots, type WeaponDefinition } from "@common/definitions/loots";
import { MaterialSounds, type ObstacleDefinition } from "@common/definitions/obstacles";
import { SpectatePacket } from "@common/packets/spectatePacket";
import { CircleHitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer } from "@common/utils/layer";
import { Angle, EaseFunctions, Geometry } from "@common/utils/math";
import { removeFrom, type Timeout } from "@common/utils/misc";
import { ItemType, type ReferenceTo } from "@common/utils/objectDefinitions";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { random, randomBoolean, randomFloat, randomPointInsideCircle, randomRotation, randomSign, randomVector } from "@common/utils/random";
import { FloorNames, FloorTypes } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import $ from "jquery";
import { Container, Graphics, Text } from "pixi.js";
import { GameConsole } from "../console/gameConsole";
import { Game } from "../game";
import { CameraManager } from "../managers/cameraManager";
import { InputManager } from "../managers/inputManager";
import { MapManager } from "../managers/mapManager";
import { ParticleManager, type Particle, type ParticleEmitter, type ParticleOptions } from "../managers/particleManager";
import { ClientPerkManager } from "../managers/perkManager";
import { SoundManager, type GameSound } from "../managers/soundManager";
import { UIManager } from "../managers/uiManager";
import { BULLET_WHIZ_SCALE, DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS, PIXI_SCALE, TEAMMATE_COLORS, UI_DEBUG_MODE } from "../utils/constants";
import { DebugRenderer } from "../utils/debugRenderer";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { getTranslatedString } from "../utils/translations/translations";
import { type TranslationKeys } from "../utils/translations/typings";
import { type Tween } from "../utils/tween";
import { GameObject } from "./gameObject";
import { Loot } from "./loot";
import { Obstacle } from "./obstacle";

export class Player extends GameObject.derive(ObjectCategory.Player) {
    teamID!: number;

    activeItem: WeaponDefinition = Loots.fromString("fists");

    // for common code
    get activeItemDefinition(): WeaponDefinition {
        return this.activeItem;
    }

    private _meleeSoundTimeoutID?: number;

    meleeStopSound?: GameSound;
    meleeAttackCounter = 0;

    bushID?: number;

    backEquippedMelee?: MeleeDefinition;

    private activeDisguise?: ObstacleDefinition;
    halloweenThrowableSkin = false;

    infected = false;

    private _oldItem = this.activeItem;

    equipment: {
        helmet?: ArmorDefinition
        vest?: ArmorDefinition
        backpack: BackpackDefinition
    } = {
            backpack: Loots.fromString("bag")
        };

    distTraveled = 0;

    get isActivePlayer(): boolean {
        return this.id === Game.activePlayerID;
    }

    footstepSound?: GameSound;
    actionSound?: GameSound;

    action = {
        type: PlayerActions.None,
        item: undefined as undefined | HealingItemDefinition
    };

    animation = AnimationType.None;
    animationChangeTime = 0;

    damageable = true;

    hideEquipment = false;

    downed = false;
    beingRevived = false;
    bleedEffectInterval?: NodeJS.Timeout;

    private _skin: ReferenceTo<SkinDefinition> = "";

    readonly images: {
        aimTrail?: Graphics
        readonly vest: SuroiSprite
        readonly body: SuroiSprite
        readonly leftFist: SuroiSprite
        readonly rightFist: SuroiSprite
        leftLeg?: SuroiSprite
        rightLeg?: SuroiSprite
        readonly backpack: SuroiSprite
        readonly helmet: SuroiSprite
        readonly weapon: SuroiSprite
        readonly altWeapon: SuroiSprite
        readonly muzzleFlash: SuroiSprite
        readonly waterOverlay: SuroiSprite
        readonly blood: Container
        readonly backMeleeSprite: SuroiSprite
        disguiseSprite?: SuroiSprite
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
        leftLeg?: Tween<SuroiSprite>
        rightLeg?: Tween<SuroiSprite>
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

    private _hitbox = new CircleHitbox(GameConstants.player.radius);
    get hitbox(): CircleHitbox { return this._hitbox; }

    private readonly _bulletWhizHitbox = new CircleHitbox(GameConstants.player.radius * BULLET_WHIZ_SCALE);
    get bulletWhizHitbox(): CircleHitbox { return this._bulletWhizHitbox; }

    floorType: FloorNames = FloorNames.Grass;

    sizeMod = 1;

    constructor(id: number, data: ObjectsNetData[ObjectCategory.Player]) {
        super(id);

        this.images = {
            vest: new SuroiSprite().setVisible(false),
            body: new SuroiSprite(),
            leftFist: new SuroiSprite(),
            rightFist: new SuroiSprite(),
            backpack: new SuroiSprite().setVisible(false).setPos(-35, 0).setZIndex(-1),
            helmet: new SuroiSprite().setVisible(false).setPos(-8, 0).setZIndex(6),
            weapon: new SuroiSprite().setZIndex(3),
            altWeapon: new SuroiSprite().setZIndex(3),
            muzzleFlash: new SuroiSprite("muzzle_flash").setVisible(false).setZIndex(7).setAnchor(Vec.create(0, 0.5)),
            waterOverlay: new SuroiSprite("water_overlay").setVisible(false).setTint(Game.colors.water),
            blood: new Container(),
            backMeleeSprite: new SuroiSprite()
        };

        if (Game.teamMode) {
            const createLegImage = (): SuroiSprite => new SuroiSprite().setPos(-35, 26).setZIndex(-1).setScale(1.5, 0.8);
            this.images.leftLeg = createLegImage();
            this.images.rightLeg = createLegImage();
        }

        if (InputManager.isMobile && this.isActivePlayer) {
            const aimTrail = this.images.aimTrail = new Graphics();
            for (let i = 0; i < 100; i++) {
                aimTrail.circle((i * 50) + 20, 0, 8).fill({ color: 0xffffff, alpha: 0.35 });
            }
            aimTrail.alpha = 0;
            this.container.addChild(aimTrail);
        }

        this.container.addChild(
            this.images.vest,
            this.images.body,
            this.images.leftFist,
            this.images.rightFist,
            ...(Game.teamMode ? [this.images.leftLeg, this.images.rightLeg] as readonly SuroiSprite[] : []),
            this.images.backpack,
            this.images.helmet,
            this.images.weapon,
            this.images.altWeapon,
            this.images.muzzleFlash,
            this.images.waterOverlay,
            this.images.blood,
            this.images.backMeleeSprite
        );

        this.container.zIndex = ZIndexes.Players;

        const emote = this.emote = {
            background: new SuroiSprite("emote_background").setPos(0, 0),
            image: new SuroiSprite().setPos(0, 0),
            container: new Container()
        };

        emote.container.addChild(emote.background, emote.image);
        emote.container.zIndex = ZIndexes.Emotes;
        emote.container.visible = false;
        this.containers.push(emote.container);

        this.updateFistsPosition(false);
        this.updateWeapon();

        this.healingParticlesEmitter = ParticleManager.addEmitter({
            delay: 350,
            active: false,
            spawnOptions: () => {
                let frame = "";
                if (this.action.item?.itemType === ItemType.Healing) {
                    if (this.action.item.healType === HealType.Special) {
                        frame = this.action.item.idString.toLowerCase();
                    } else { frame = HealType[this.action.item.healType].toLowerCase(); }
                }

                return {
                    frames: `${frame}_particle`,
                    position: this._hitbox.randomPoint(),
                    lifetime: 1000,
                    zIndex: ZIndexes.Players,
                    layer: this.layer,
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
            if (!Game.spectating || Game.activePlayerID === this.id) return;
            Game.sendPacket(
                SpectatePacket.create({
                    spectateAction: SpectateActions.SpectateSpecific,
                    playerID: this.id
                })
            );
        });

        this.updateFromData(data, true);
    }

    override updateContainerPosition(): void {
        super.updateContainerPosition();

        if (this.destroyed) return;

        this.emote.container.position = Vec.addComponent(this.container.position, 0, -175);
        if (this.teammateName) {
            this.teammateName.container.position = Vec.addComponent(this.container.position, 0, 95);
        }
    }

    override update(): void { /* bleh */ }

    override updateInterpolation(): void {
        this.updateContainerPosition();
        if (!this.isActivePlayer || !GameConsole.getBuiltInCVar("cv_responsive_rotation") || Game.spectating) {
            this.updateContainerRotation();
        }
    }

    spawnCasingParticles(filterBy: "fire" | "reload", altFire = false): void {
        const weaponDef = this.activeItem as GunDefinition;
        const reference = this._getItemReference() as SingleGunNarrowing;
        const initialRotation = this.rotation + Math.PI / 2;
        const casings = reference.casingParticles?.filter(c => (c.on ?? "fire") === filterBy) as NonNullable<SingleGunNarrowing["casingParticles"]>;

        if (casings?.length === 0 || reference.casingParticles === undefined) return;

        for (const casingSpec of casings) {
            const position = Vec.scale(casingSpec.position, this.sizeMod);
            if (weaponDef.isDual) {
                position.y = (altFire ? -1 : 1) * (position.y + weaponDef.leftRightOffset);
            }

            const spawnCasings = (): void => {
                const casingVelX = casingSpec.velocity?.x;
                const casingVelY = casingSpec.velocity?.y;

                ParticleManager.spawnParticles(
                    casingSpec.count ?? 1,
                    () => {
                        const spinAmount = randomFloat(Math.PI / 2, Math.PI);
                        const displacement = Vec.scale(
                            randomVector(
                                casingVelX?.min ?? 2,
                                casingVelX?.max ?? -5,
                                casingVelY?.min ?? 10,
                                casingVelY?.max ?? 15
                            ), this.sizeMod
                        );

                        if (casingVelX?.randomSign) {
                            displacement.x *= randomSign();
                        }

                        if (casingVelY?.randomSign) {
                            displacement.y *= randomSign();
                        }

                        return {
                            frames: casingSpec.frame ?? Ammos.fromString(weaponDef.ammoType).defaultCasingFrame ?? "",
                            zIndex: ZIndexes.Players,
                            position: Vec.add(this.position, Vec.rotate(position, this.rotation)),
                            lifetime: 400,
                            layer: this.layer,
                            scale: {
                                start: 0.8 * this.sizeMod,
                                end: 0.4 * this.sizeMod
                            },
                            alpha: {
                                start: 1,
                                end: 0,
                                ease: EaseFunctions.sexticIn
                            },
                            rotation: {
                                start: initialRotation,
                                end: initialRotation + (
                                    Math.sign(displacement.y) || (randomSign() * randomFloat(0, 0.3))
                                //  ^^^^^^^^^ make casings spin clockwise or counterclockwise
                                //            depending on which way they're flying
                                ) * spinAmount
                            },
                            speed: Vec.rotate(
                                Vec.addComponent(
                                    displacement,
                                    -(spinAmount / 4),
                                    0
                                ),
                                this.rotation
                            )
                        } satisfies ParticleOptions;
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
        this._hitbox.position = this.position;
        this._bulletWhizHitbox.position = this.position;

        this.rotation = data.rotation;

        const noMovementSmoothing = !GameConsole.getBuiltInCVar("cv_movement_smoothing");

        if (noMovementSmoothing || isNew) this.container.rotation = this.rotation;

        if (this.isActivePlayer) {
            SoundManager.position = this.position;
            MapManager.setPosition(this.position);

            if (noMovementSmoothing) CameraManager.position = toPixiCoords(this.position);

            if (GameConsole.getBuiltInCVar("pf_show_pos")) {
                UIManager.ui.debugPos.text(
                    `X: ${this.position.x.toFixed(2)} Y: ${this.position.y.toFixed(2)} Z: ${this.layer}`
                );
            }
        }

        const floorType = MapManager.terrain.getFloor(this.position, this.layer);
        if (floorType !== this.floorType) {
            const doOverlay = FloorTypes[floorType].overlay;
            if (doOverlay) {
                this.images.waterOverlay.setVisible(true);
            }

            this.anims.waterOverlay?.kill();
            this.anims.waterOverlay = Game.addTween({
                target: this.images.waterOverlay,
                to: { alpha: doOverlay ? 1 : 0 },
                duration: 200,
                onComplete: () => {
                    this.anims.waterOverlay = undefined;
                    if (!doOverlay) {
                        this.images.waterOverlay.setVisible(false);
                    }
                }
            });
        }
        this.floorType = floorType;

        if (!isNew) {
            const dist = Geometry.distance(oldPosition, this.position);
            this.distSinceLastFootstep += dist;
            this.distTraveled += dist;

            if (this.distTraveled > 8 && this.downed) {
                this.playAnimation(AnimationType.Downed);

                this.distTraveled = 0;
            }

            if (this.distSinceLastFootstep > 10) {
                this.footstepSound = this.playSound(
                    `${this.floorType}_step_${random(1, 2)}`,
                    {
                        falloff: 0.6,
                        maxRange: 48
                    }
                );

                this.distSinceLastFootstep = 0;

                if (FloorTypes[floorType].particles && this.layer >= Layer.Ground) {
                    const options = {
                        frames: "ripple_particle",
                        zIndex: ZIndexes.Ground,
                        position: this._hitbox.randomPoint(),
                        lifetime: 1000,
                        layer: this.layer,
                        speed: Vec.create(0, 0)
                    };

                    // outer
                    ParticleManager.spawnParticle({
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
                    ParticleManager.spawnParticle({
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

        if (isNew || !GameConsole.getBuiltInCVar("cv_movement_smoothing")) {
            this.container.position.copyFrom(toPixiCoords(this.position));
            this.emote.container.position.copyFrom(Vec.addComponent(toPixiCoords(this.position), 0, -175));
            this.teammateName?.container.position.copyFrom(Vec.addComponent(toPixiCoords(this.position), 0, 95));
        }

        if (data.animation !== undefined) {
            this.animation = data.animation;
            this.animationChangeTime = Date.now();
            this.playAnimation(data.animation);
        }

        if (data.full) {
            const {
                full: {
                    layer,
                    dead,
                    downed,
                    beingRevived,
                    teamID,
                    invulnerable,
                    activeItem,
                    sizeMod,
                    skin,
                    helmet,
                    vest,
                    backpack,
                    halloweenThrowableSkin,
                    activeDisguise,
                    infected,
                    backEquippedMelee
                }
            } = data;

            const layerChanged = layer !== this.layer;
            let oldLayer: Layer | undefined;
            if (layerChanged) {
                oldLayer = this.layer;
                this.layer = layer;
                if (!this.isActivePlayer || isNew) this.updateLayer();
            }
            if (this.isActivePlayer && (layerChanged || isNew)) {
                Game.updateLayer(isNew, oldLayer);
            }

            this.backEquippedMelee = backEquippedMelee;

            this.container.visible = !dead;

            const hadSkin = this.halloweenThrowableSkin;
            if (
                hadSkin !== (this.halloweenThrowableSkin = halloweenThrowableSkin)
                && this.activeItem.itemType === ItemType.Throwable
                && !this.activeItem.noSkin
            ) {
                this.images.weapon.setFrame(`${this.activeItem.idString}${this.halloweenThrowableSkin ? "_halloween" : ""}`);
            }

            // Blood particles on death (cooler graphics only)
            if (
                GameConsole.getBuiltInCVar("cv_cooler_graphics")
                && !isNew
                && !this.dead
                && dead
            ) {
                ParticleManager.spawnParticles(random(15, 30), () => ({
                    frames: "blood_particle",
                    lifetime: random(1000, 3000),
                    position: this.position,
                    layer: this.layer,
                    alpha: {
                        start: 1,
                        end: 0
                    },
                    scale: {
                        start: randomFloat(0.8, 1.6),
                        end: 0
                    },
                    speed: randomPointInsideCircle(Vec.create(0, 0), 4),
                    zIndex: ZIndexes.Players + 1
                }));
            }

            this.dead = dead;

            this.teamID = teamID;

            void Game.fontObserver.then(() => this.updateTeammateName());

            this.container.alpha = invulnerable ? 0.5 : 1;

            if (this.downed !== downed) {
                this.downed = downed;
                this.container.zIndex = this.downed ? ZIndexes.DownedPlayers : ZIndexes.Players;
                this.updateFistsPosition(false);
                this.updateWeapon(isNew);
                this.updateEquipment();
            }

            if (this.beingRevived !== beingRevived) {
                this.beingRevived = beingRevived;

                if (this.isActivePlayer) {
                    // somewhat an abuse of that system, but dedicating an
                    // entire "action" to this would be wasteful
                    if (this.beingRevived) {
                        UIManager.animateAction(getTranslatedString("action_being_revived"), GameConstants.player.reviveTime, true);
                    } else {
                        UIManager.cancelAction();
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

            if (this.dead) {
                if (this.teammateName !== undefined) this.teammateName.container.visible = false;
            }

            this._oldItem = this.activeItem;
            const itemDirty = this.activeItem !== activeItem;
            this.activeItem = activeItem;

            const skinID = skin.idString;
            if (this.isActivePlayer) {
                UIManager.skinID = skinID;
                UIManager.updateWeapons();
            }
            this._skin = skinID;
            const skinDef = Loots.fromString<SkinDefinition>(skinID);
            const tint = skinDef.grassTint ? Game.colors.ghillie : 0xffffff;

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

            if (sizeMod !== undefined) {
                this.sizeMod = this.container.scale = sizeMod;
                this._hitbox = new CircleHitbox(GameConstants.player.radius * sizeMod, this._hitbox.position);
            }

            const { hideEquipment, helmetLevel, vestLevel, backpackLevel } = this;

            this.hideEquipment = skinDef.hideEquipment ?? false;

            this.helmetLevel = (this.equipment.helmet = helmet)?.level ?? 0;
            this.vestLevel = (this.equipment.vest = vest)?.level ?? 0;
            this.backpackLevel = (this.equipment.backpack = backpack).level;

            const backpackTint = skinDef.backpackTint
                ?? this.equipment.backpack?.defaultTint
                ?? 0xffffff;

            this.images.backpack.setTint(backpackTint);

            if (
                hideEquipment !== this.hideEquipment
                || helmetLevel !== this.helmetLevel
                || vestLevel !== this.vestLevel
                || backpackLevel !== this.backpackLevel
            ) {
                this.updateEquipment();
            }

            if (itemDirty) {
                this.updateFistsPosition(true);
                this.updateWeapon(isNew);
            }

            if (this.activeDisguise !== activeDisguise) {
                const def = this.activeDisguise = activeDisguise;
                let disguiseSprite = this.images.disguiseSprite;
                if (def !== undefined) {
                    if (!disguiseSprite) {
                        disguiseSprite = this.images.disguiseSprite = new SuroiSprite();
                        disguiseSprite.zIndex = 999; // this only applies within the player container, not globally
                        this.container.addChild(disguiseSprite);
                    }
                    disguiseSprite.setFrame(`${def.frames?.base ?? def.idString}${def.variations !== undefined ? `_${random(1, def.variations)}` : ""}`);
                    disguiseSprite.setVisible(true);
                } else {
                    disguiseSprite?.setVisible(false);
                }
            }

            if (infected !== this.infected) {
                this.infected = infected;
                this.container.tint = infected ? 0x8a4c70 : 0xffffff;
                if (!isNew) {
                    if (infected) this.playSound("infected");
                    else this.playSound("cured");
                }
            }

            // Pan Image Display
            const backMeleeSprite = this.images.backMeleeSprite;
            const backMelee = this.backEquippedMelee;
            backMeleeSprite.setVisible(!!backMelee?.onBack);

            if (backMelee?.onBack) {
                const frame = `${backMelee.idString}${backMelee.image?.separateWorldImage ? "_world" : ""}`;
                backMeleeSprite.setFrame(frame);
                const { onBack } = backMelee;
                backMeleeSprite.setPos(onBack.position.x, onBack.position.y);
                backMeleeSprite.setAngle(onBack.angle);
            }
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
                        UIManager.cancelAction();
                    }
                    break;
                }
                case PlayerActions.Reload: {
                    const weaponDef = this.activeItem as GunDefinition;

                    if (weaponDef.isDual) {
                        this.spawnCasingParticles("reload", true);
                    }

                    this.spawnCasingParticles("reload", false);

                    const { weapons, activeWeaponIndex } = UIManager.inventory;
                    const reloadFullClip = weaponDef.reloadFullOnEmpty && (weapons[activeWeaponIndex]?.count ?? 0) <= 0;

                    actionSoundName = `${weaponDef.idString}_reload${reloadFullClip ? "_full" : ""}`;
                    if (this.isActivePlayer) {
                        UIManager.animateAction(
                            getTranslatedString("action_reloading"),
                            (reloadFullClip ? weaponDef.fullReloadTime : weaponDef.reloadTime) / (ClientPerkManager.mapOrDefault(PerkIds.CombatExpert, ({ reloadMod }) => reloadMod, 1))
                        );
                    }

                    break;
                }
                case PlayerActions.UseItem: {
                    const itemDef = action.item;
                    actionSoundName = itemDef.idString;
                    this.healingParticlesEmitter.active = true;
                    if (this.isActivePlayer) {
                        UIManager.animateAction(
                            getTranslatedString(
                                `action_${itemDef.idString}_use` as TranslationKeys,
                                { item: getTranslatedString(itemDef.idString as TranslationKeys) }
                            ),
                            itemDef.useTime / ClientPerkManager.mapOrDefault(PerkIds.FieldMedic, ({ usageMod }) => usageMod, 1)
                        );
                    }
                    break;
                }
                case PlayerActions.Revive: {
                    if (this.isActivePlayer) {
                        UIManager.animateAction(
                            getTranslatedString("action_reviving"),
                            GameConstants.player.reviveTime / ClientPerkManager.mapOrDefault(PerkIds.FieldMedic, ({ usageMod }) => usageMod, 1)
                        );
                    }
                    break;
                }
            }

            if (actionSoundName) {
                let speed = 1;
                if (ClientPerkManager.hasItem(PerkIds.CombatExpert) && action.type === PlayerActions.Reload) {
                    speed = PerkData[PerkIds.CombatExpert].reloadMod;
                } else if (ClientPerkManager.hasItem(PerkIds.FieldMedic) && actionSoundName === action.item?.idString) {
                    speed = PerkData[PerkIds.FieldMedic].usageMod;
                }
                this.actionSound = this.playSound(
                    actionSoundName,
                    {
                        falloff: 0.6,
                        maxRange: 48,
                        speed
                    }
                );
            }

            // @ts-expect-error 'item' not existing is okay
            this.action = action;
        }
    }

    override updateDebugGraphics(): void {
        if (!DEBUG_CLIENT) return;

        DebugRenderer.addHitbox(this.hitbox, HITBOX_COLORS.player);
        const alpha = this.layer === Game.activePlayer?.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY;

        if (this.downed) {
            DebugRenderer.addCircle(5, this.position, HITBOX_COLORS.obstacleNoCollision, alpha);
        }

        const renderMeleeReflectionSurface = (surface: { pointA: Vector, pointB: Vector }): void => {
            const start = Vec.add(
                this.position,
                Vec.rotate(surface.pointA, this.rotation)
            );

            const lineEnd = (Vec.add(
                this.position,
                Vec.rotate(surface.pointB, this.rotation)
            ));

            DebugRenderer.addLine(start, lineEnd, HITBOX_COLORS.playerWeapon, alpha);
        };

        switch (this.activeItem.itemType) {
            case ItemType.Gun: {
                const offset = this.activeItem.bulletOffset ?? 0;

                const start = Vec.add(this.position,
                    Vec.scale(
                        Vec.rotate(Vec.create(0, offset), this.rotation),
                        this.sizeMod
                    ));

                DebugRenderer.addRay(
                    start,
                    this.rotation,
                    this.activeItem.length,
                    HITBOX_COLORS.playerWeapon,
                    alpha
                );
                break;
            }
            case ItemType.Melee: {
                DebugRenderer.addCircle(
                    this.activeItem.radius * this.sizeMod,
                    Vec.add(
                        this.position,
                        Vec.scale(
                            Vec.rotate(this.activeItem.offset, this.rotation),
                            this.sizeMod
                        )
                    ),
                    HITBOX_COLORS.playerWeapon,
                    alpha
                );
                if (this.activeItem.reflectiveSurface) {
                    renderMeleeReflectionSurface(this.activeItem.reflectiveSurface);
                }

                if (this.activeItem.image?.pivot) {
                    DebugRenderer.addCircle(
                        this.sizeMod,
                        Vec.add(
                            this.position,
                            Vec.scale(
                                Vec.rotate(this.activeItem.image.pivot, this.rotation),
                                this.sizeMod
                            )
                        ),
                        HITBOX_COLORS.pivot,
                        alpha
                    );
                }
                break;
            }
        }

        if (this.backEquippedMelee?.onBack?.reflectiveSurface) {
            renderMeleeReflectionSurface(this.backEquippedMelee?.onBack.reflectiveSurface);
        }
    }

    private _getItemReference(): SingleGunNarrowing | Exclude<WeaponDefinition, GunDefinition> {
        const weaponDef = this.activeItem;

        return weaponDef.itemType === ItemType.Gun && weaponDef.isDual
            ? Loots.fromString<SingleGunNarrowing>(weaponDef.singleVariant)
            : weaponDef as SingleGunNarrowing | Exclude<WeaponDefinition, GunDefinition>;
    }

    private _getOffset(): number {
        const weaponDef = this.activeItem;

        return weaponDef.itemType === ItemType.Gun && weaponDef.isDual
            ? weaponDef.leftRightOffset * PIXI_SCALE
            : 0;
    }

    updateTeammateName(): void {
        if (
            Game.teamMode
            && (
                !this.isActivePlayer
                && !this.teammateName
                && !this.dead
                && this.teamID === Game.teamID
            )
        ) {
            const name = Game.playerNames.get(this.id);

            const text = new Text({
                text: UIManager.getRawPlayerName(this.id),
                style: {
                    fill: name?.hasColor ? name?.nameColor : TEAMMATE_COLORS[UIManager.getTeammateColorIndex(this.id) ?? 0],
                    fontSize: 36,
                    fontFamily: "Inter",
                    fontWeight: "600",
                    dropShadow: {
                        alpha: 0.8,
                        color: "black",
                        blur: 2,
                        distance: 2
                    }
                }
            });
            const badge = name?.badge ? new SuroiSprite(name.badge.idString) : undefined;
            const container = new Container();
            this.teammateName = { text, badge, container };

            text.anchor.set(0.5);

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

            container.addChild(text);
            container.zIndex = ZIndexes.TeammateName;
            this.containers.push(container);
            this.updateLayer(true);
        } else if (
            this.teammateName
            && (
                this.isActivePlayer
                || this.dead
                || this.teamID !== Game.teamID
            )
        ) {
            const { text, badge, container } = this.teammateName;
            text?.destroy();
            badge?.destroy();
            container?.destroy();
            this.teammateName = undefined;
            removeFrom(this.containers, container);
        }
    }

    updateFistsPosition(anim: boolean): void {
        this.anims.leftFist?.kill();
        this.anims.rightFist?.kill();
        this.anims.weapon?.kill();

        this.images.leftLeg?.setVisible(this.downed);
        this.images.rightLeg?.setVisible(this.downed);

        if (this.downed) {
            this.images.leftFist.setPos(38, -35);
            this.images.rightFist.setPos(38, 35);
            this.images.leftLeg?.setPos(-35, 26);
            this.images.rightLeg?.setPos(-35, -26);
            return;
        }

        type FistsRef = (SingleGunNarrowing | Exclude<WeaponDefinition, GunDefinition>)["fists"] & object;
        const fists: FistsRef = this.activeItemDefinition.fists ?? DEFAULT_HAND_RIGGING;

        const offset = this._getOffset();

        if (anim) {
            const duration: number = "animationDuration" in fists ? fists.animationDuration as number : 150;

            this.anims.leftFist = Game.addTween({
                target: this.images.leftFist,
                to: { x: fists.left.x, y: fists.left.y - offset },
                duration,
                onComplete: () => {
                    this.anims.leftFist = undefined;
                }
            });

            this.anims.rightFist = Game.addTween({
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

        const reference = this._getItemReference();

        if (reference.image) {
            const { image: { position, angle } } = reference;

            if (reference.itemType === ItemType.Throwable && !reference.noSkin) {
                this.images.weapon.setFrame(`${reference.idString}${this.halloweenThrowableSkin ? "_halloween" : ""}`);
            }

            this.images.weapon.setPos(position.x, position.y + offset);
            this.images.altWeapon.setPos(position.x, position.y - offset);
            this.images.weapon.setAngle(angle);
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

        const { image } = reference;
        const { fists } = weaponDef;

        const imagePresent = image !== undefined;
        if (imagePresent) {
            let frame = `${reference.idString}${weaponDef.itemType === ItemType.Gun || (image as NonNullable<MeleeDefinition["image"]>).separateWorldImage
                ? "_world"
                : ""
            }`;

            if (weaponDef.itemType === ItemType.Throwable && this.halloweenThrowableSkin && !weaponDef.noSkin) {
                frame += "_halloween";
            }

            const { angle, position: { x: pX, y: pY } } = image;

            this.images.weapon.setFrame(frame);
            this.images.altWeapon.setFrame(frame);
            this.images.weapon.setAngle(angle);
            this.images.altWeapon.setAngle(angle); // there's an ambiguity here as to whether the angle should be inverted or the same
            this.images.weapon.setPivot(reference.image && "pivot" in reference.image && reference.image.pivot ? reference.image.pivot : Vec.create(0, 0));

            const offset = this._getOffset();
            this.images.weapon.setPos(pX, pY + offset);
            this.images.altWeapon.setPos(pX, pY - offset);
        }

        if (this.activeItem !== this._oldItem) {
            this.anims.muzzleFlashFade?.kill();
            this.anims.muzzleFlashRecoil?.kill();
            this.images.muzzleFlash.alpha = 0;
            if (this.isActivePlayer && !isNew) {
                let soundID: string;
                if (reference.itemType === ItemType.Throwable) {
                    soundID = "throwable";
                } else if (reference.itemType === ItemType.Gun && reference.isDual) {
                    soundID = reference.idString.slice("dual_".length);
                } else if (SoundManager.has(`${reference.idString}_switch`)) {
                    soundID = reference.idString;
                } else {
                    soundID = "default";
                }
                SoundManager.play(`${soundID}_switch`);
            }
        }

        this.images.weapon.setVisible(imagePresent);
        this.images.muzzleFlash.setVisible(imagePresent);

        this.images.altWeapon.setVisible(weaponDef.itemType === ItemType.Gun && (weaponDef.isDual ?? false));

        switch (weaponDef.itemType) {
            case ItemType.Gun: {
                this.images.rightFist.setZIndex((fists as SingleGunNarrowing["fists"]).rightZIndex ?? 1);
                this.images.leftFist.setZIndex((fists as SingleGunNarrowing["fists"]).leftZIndex ?? 1);
                this.images.weapon.setZIndex(image?.zIndex ?? 2);
                this.images.altWeapon.setZIndex(2);
                this.images.body.setZIndex(3);
                break;
            }
            case ItemType.Melee: {
                this.images.leftFist.setZIndex(4);
                this.images.rightFist.setZIndex(4);
                this.images.body.setZIndex(2);
                this.images.weapon.setZIndex(reference.image?.zIndex ?? 1);
                break;
            }
            case ItemType.Throwable: {
                this.images.leftFist.setZIndex(4);
                this.images.rightFist.setZIndex(4);
                this.images.body.setZIndex(2);
                this.images.weapon.setZIndex(reference.image?.zIndex ?? 5);
                break;
            }
        }

        this.images.waterOverlay.setZIndex(this.images.body.zIndex + 1);
        this.container.sortChildren();
    }

    updateEquipment(): void {
        for (const item of ["helmet", "vest", "backpack"] as const) {
            this.updateEquipmentWorldImage(item);

            if (this.isActivePlayer) {
                this.updateEquipmentSlot(item);
            }
        }
    }

    updateEquipmentWorldImage(type: "helmet" | "vest" | "backpack"): void {
        const image = this.images[type];
        const def = this.equipment[type];

        if (
            def
            && def.level > 0
            && !this.hideEquipment
            && (type !== "backpack" || !this.downed)
        ) {
            if (type !== "vest") {
                image.setFrame(`${def.idString}_world`).setVisible(true);

                if (type === "helmet") {
                    image.setPos(
                        this.downed ? 10 : -8,
                        0
                    );
                }
            } else {
                let color: number | undefined;
                if ((color = (def as { color?: number }).color) !== undefined) {
                    image.setFrame("vest_world")
                        .setVisible(true)
                        .setTint(color);
                }
            }
        } else {
            image.setVisible(false);
        }
    }

    updateEquipmentSlot(equipmentType: "helmet" | "vest" | "backpack"): void {
        const container = $(`#${equipmentType}-slot`);
        const def = this.equipment[equipmentType];

        if (def && def.level > 0) {
            container.children(".item-name").text(`Lvl. ${def.level}`);
            container.children(".item-image").attr("src", `./img/game/shared/loot/${def.idString}.svg`);

            let itemTooltip = getTranslatedString(def.idString as TranslationKeys);
            if (def.itemType === ItemType.Armor) {
                itemTooltip = getTranslatedString("tt_reduces", {
                    item: `<b>${getTranslatedString(def.idString as TranslationKeys)}</b><br>`,
                    percent: (def.damageReduction * 100).toString()
                });
            }

            container.children(".item-tooltip").html(itemTooltip);
        }

        container.css("visibility", (def?.level ?? 0) > 0 || UI_DEBUG_MODE ? "visible" : "hidden");

        container[0].addEventListener(
            "pointerdown",
            e => {
                e.stopImmediatePropagation();
                if (e.button === 2 && def && Game.teamMode) {
                    InputManager.addAction({
                        type: InputActions.DropItem,
                        item: def
                    });
                }
            }
        );

        if (equipmentType === "backpack") {
            UIManager.updateItems();
        }
    }

    getEquipment<
        const Type extends "helmet" | "vest" | "backpack"
    >(equipmentType: Type): Type extends "backpack" ? BackpackDefinition : ArmorDefinition | undefined {
        type Ret = Type extends "backpack" ? BackpackDefinition : ArmorDefinition | undefined;

        switch (equipmentType) {
            case "helmet": return this.equipment.helmet as Ret;
            case "vest": return this.equipment.vest as Ret;
            case "backpack": return this.equipment.backpack as Ret;
        }

        // never happens
        return undefined as Ret;
    }

    canInteract(player: Player): boolean {
        return Game.teamMode
            && !player.downed
            && this.downed
            && !this.beingRevived
            && this !== player
            && this.teamID === player.teamID;
    }

    showEmote(emote: EmoteDefinition): void {
        this.anims.emote?.kill();
        this.anims.emoteHide?.kill();
        this._emoteHideTimeout?.kill();

        this.playSound("emote", {
            falloff: 0.4,
            maxRange: 128
        });

        const { container, background, image } = this.emote;

        container.visible = true;
        container.scale.set(0);
        container.alpha = 0;

        const { backgroundTexture, scale } = Loot.getBackgroundAndScale(Loots.fromStringSafe(emote.idString));
        background.setFrame(backgroundTexture ?? "emote_background");
        image.setFrame(emote.idString).setScale(scale ?? 1);

        this.anims.emote = Game.addTween({
            target: container,
            to: { alpha: 1 },
            duration: 250,
            ease: EaseFunctions.backOut,
            onUpdate: () => {
                container.scale.set(container.alpha);
            },
            onComplete: () => {
                this.anims.emote = undefined;
            }
        });

        this._emoteHideTimeout = this.addTimeout(() => {
            this.anims.emoteHide = Game.addTween({
                target: container,
                to: { alpha: 0 },
                duration: 200,
                onUpdate: () => {
                    container.scale.set(container.alpha);
                },
                onComplete: () => {
                    this._emoteHideTimeout = undefined;
                    this.anims.emoteHide = undefined;

                    container.visible = false;
                    this.anims.emote?.kill();
                    this.anims.emote = undefined;
                    this._emoteHideTimeout = undefined;
                }
            });
        }, 2000);
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

                let altFist = Math.random() < 0.5;
                if (!weaponDef.fists.randomFist) altFist = true;
                let previousDuration = 0;

                if (weaponDef.animation) {
                    for (const frame of weaponDef.animation) {
                        const duration = frame.duration;
                        const currentWeapon = this.activeItem;
                        this.addTimeout(() => {
                            if (this.activeItem === currentWeapon) {
                                if (!weaponDef.fists.randomFist || !altFist) {
                                    this.anims.leftFist = Game.addTween({
                                        target: this.images.leftFist,
                                        to: { x: frame.fists.left.x, y: frame.fists.left.y },
                                        duration,
                                        ease: EaseFunctions.sineIn
                                    });
                                }

                                if (altFist) {
                                    this.anims.rightFist = Game.addTween({
                                        target: this.images.rightFist,
                                        to: { x: frame.fists.right.x, y: frame.fists.right.y },
                                        duration,
                                        ease: EaseFunctions.sineIn
                                    });
                                }

                                if (weaponDef.image !== undefined && frame.image !== undefined) {
                                    this.anims.weapon = Game.addTween({
                                        target: this.images.weapon,
                                        to: {
                                            x: frame.image.position.x,
                                            y: frame.image.position.y,
                                            angle: frame.image.angle
                                        },
                                        duration,
                                        ease: EaseFunctions.sineIn
                                    });
                                }
                            }
                        }, previousDuration);
                        previousDuration += duration;
                    }
                }

                if (weaponDef.hitDelay) {
                    clearTimeout(this._meleeSoundTimeoutID);
                    this._meleeSoundTimeoutID = window.setTimeout(() => {
                        this.playSound(
                            weaponDef.swingSound ?? "swing",
                            {
                                falloff: 0.4,
                                maxRange: 96
                            }
                        );
                    }, weaponDef.hitDelay);
                } else {
                    this.playSound(
                        weaponDef.swingSound ?? "swing",
                        {
                            falloff: 0.4,
                            maxRange: 96
                        }
                    );
                }

                if (weaponDef.stopSound && this.meleeStopSound === undefined) {
                    this.meleeStopSound = this.playSound(
                        weaponDef.stopSound,
                        {
                            falloff: 0.4,
                            maxRange: 96
                        }
                    );
                } else {
                    this.meleeStopSound = undefined;
                }

                if (weaponDef.image?.animated) {
                    if (this.meleeAttackCounter >= 1) {
                        this.meleeAttackCounter--;
                    } else {
                        this.meleeAttackCounter++;
                    }
                    this.images.weapon.setFrame(`${weaponDef.idString}${this.meleeAttackCounter <= 0 ? "_used" : ""}`);
                }

                this.addTimeout(() => {
                    // Play hit effect on closest object
                    // TODO: share this logic with the server
                    const selfHitbox = this.hitbox;

                    const position = Vec.add(this.position, Vec.rotate(weaponDef.offset, this.rotation));
                    const hitbox = new CircleHitbox(weaponDef.radius, position);
                    const angleToPos = Angle.betweenPoints(this.position, position);

                    for (
                        const target of (
                            Array.from(Game.objects).filter(
                                object => !object.dead
                                    && object !== this
                                    && (
                                        (
                                            object.damageable
                                            && (object.isObstacle || object.isPlayer || object.isBuilding)
                                        ) || (object.isProjectile && object.definition.c4)
                                    )
                                    && object.hitbox?.collidesWith(hitbox)
                                    && adjacentOrEqualLayer(object.layer, this.layer)
                                    && (!object.isObstacle || (!object.definition.isStair))
                                    && (!object.isObstacle || (!object.definition.noMeleeCollision))
                            ) as Array<Player | Obstacle>
                        ).sort((a, b) => {
                            if (
                                (a.isObstacle && (a.definition.noMeleeCollision || a.definition.indestructible))
                                || a.isBuilding
                                || (Game.teamMode && a.isPlayer && a.teamID === this.teamID)
                            ) return Infinity;

                            if (
                                (b.isObstacle && (b.definition.noMeleeCollision || b.definition.indestructible))
                                || b.isBuilding
                                || (Game.teamMode && b.isPlayer && b.teamID === this.teamID)
                            ) return -Infinity;

                            return a.hitbox.distanceTo(selfHitbox).distance - b.hitbox.distanceTo(selfHitbox).distance;
                        }).slice(0, weaponDef.maxTargets ?? 1)
                    ) {
                        if (target.isPlayer) {
                            target.hitEffect(position, angleToPos, (this.activeItem as MeleeDefinition).hitSound);
                        } else {
                            target.hitEffect(position, angleToPos);
                        }
                    }
                }, weaponDef.hitDelay ?? 50);

                break;
            }
            case AnimationType.Downed: {
                this.updateFistsPosition(false);

                if (this.images.rightLeg && !this.destroyed) {
                    this.anims.rightLeg = Game.addTween({
                        target: this.images.rightLeg,
                        to: { x: this.images.rightLeg.x - 10, y: this.images.rightLeg.y },
                        duration: 200,
                        ease: EaseFunctions.sineIn,
                        yoyo: true,
                        onComplete: () => {
                            this.anims.rightLeg = undefined;
                        }
                    });

                    this.anims.leftFist = Game.addTween({
                        target: this.images.leftFist,
                        to: { x: this.images.leftFist.x - 10, y: this.images.leftFist.y - 5 },
                        duration: 200,
                        ease: EaseFunctions.sineIn,
                        yoyo: true,
                        onComplete: () => {
                            this.anims.leftFist = undefined;
                        }
                    });
                }

                setTimeout(() => {
                    if (this.images.leftLeg && !this.destroyed) {
                        this.anims.leftLeg = Game.addTween({
                            target: this.images.leftLeg,
                            to: { x: this.images.leftLeg.x - 10, y: this.images.leftLeg.y },
                            duration: 200,
                            ease: EaseFunctions.sineIn,
                            yoyo: true,
                            onComplete: () => {
                                this.anims.leftLeg = undefined;
                            }
                        });

                        this.anims.rightFist = Game.addTween({
                            target: this.images.rightFist,
                            to: { x: this.images.rightFist.x - 10, y: this.images.rightFist.y + 5 },
                            duration: 200,
                            ease: EaseFunctions.sineIn,
                            yoyo: true,
                            onComplete: () => {
                                this.anims.rightFist = undefined;
                            }
                        });
                    }
                }, 200);
                break;
            }
            case AnimationType.GunFire:
            case AnimationType.GunFireAlt:
            case AnimationType.LastShot: {
                if (this.activeItem.itemType !== ItemType.Gun) {
                    const name = ({
                        [AnimationType.GunFire]: "GunFire",
                        [AnimationType.GunFireAlt]: "GunFireAlt",
                        [AnimationType.LastShot]: "LastShot"
                    })[anim];
                    console.warn(`Attempted to play gun animation (${name}) with non-gun item '${this.activeItem.idString}'`);
                    return;
                }
                const weaponDef = this.activeItem;
                const {
                    idString,
                    image: { position: { x: imgX } }
                } = this._getItemReference() as SingleGunNarrowing;
                const {
                    fists: {
                        left: { x: leftFistX },
                        right: { x: rightFistX }
                    }
                } = weaponDef;

                if (anim === AnimationType.LastShot) {
                    this.playSound(
                        `${idString}_fire_last`,
                        {
                            falloff: 0.5
                        }
                    );
                } else {
                    this.playSound(
                        `${idString}_fire`,
                        {
                            falloff: 0.5
                        }
                    );
                }

                const isAltFire = weaponDef.isDual
                    ? anim === AnimationType.GunFireAlt
                    : undefined;

                this.updateFistsPosition(false);
                const recoilAmount = PIXI_SCALE * (1 - weaponDef.recoilMultiplier);

                this.anims.weapon = Game.addTween({
                    target: isAltFire ? this.images.altWeapon : this.images.weapon,
                    to: { x: imgX - recoilAmount },
                    duration: 50,
                    yoyo: true
                });

                if (weaponDef.gasParticles && GameConsole.getBuiltInCVar("cv_cooler_graphics")) {
                    const offset = weaponDef.isDual
                        ? (isAltFire ? -1 : 1) * weaponDef.leftRightOffset
                        : (weaponDef.bulletOffset ?? 0);

                    const position = Vec.add(
                        this.position,
                        Vec.scale(Vec.rotate(Vec.create(weaponDef.length, offset), this.rotation), this.sizeMod)
                    );

                    const gas = weaponDef.gasParticles;
                    const halfSpread = 0.5 * gas.spread;

                    ParticleManager.spawnParticles(gas.amount, () => ({
                        frames: "small_gas",
                        layer: this.layer,
                        lifetime: random(gas.minLife, gas.maxSize),
                        scale: {
                            start: 0, end: randomFloat(gas.minSize, gas.maxSize)
                        },
                        position,
                        speed: Vec.fromPolar(
                            this.rotation + Angle.degreesToRadians(
                                randomFloat(-halfSpread, halfSpread)
                            ),
                            randomFloat(gas.minSpeed, gas.maxSpeed)
                        ),
                        zIndex: ZIndexes.BuildingsCeiling - 2,
                        alpha: {
                            start: randomFloat(0.5, 1),
                            end: 0
                        },
                        tint: 0x555555
                    }));
                }

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
                    this.anims.muzzleFlashFade = Game.addTween({
                        target: muzzleFlash,
                        to: { alpha: 0 },
                        duration: 100,
                        onComplete: () => {
                            muzzleFlash.setVisible(false);
                            this.anims.muzzleFlashFade = undefined;
                        }
                    });

                    this.anims.muzzleFlashRecoil = Game.addTween({
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
                    this.anims.leftFist = Game.addTween({
                        target: this.images.leftFist,
                        to: { x: leftFistX - recoilAmount },
                        duration: 50,
                        yoyo: true,
                        onComplete: () => {
                            this.anims.leftFist = undefined;
                        }
                    });
                }

                if (isAltFire !== true) {
                    this.anims.rightFist = Game.addTween({
                        target: this.images.rightFist,
                        to: { x: rightFistX - recoilAmount },
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

                this.playSound(this.activeItem.c4 ? "c4_pin" : "throwable_pin");

                const def = this.activeItem;
                const projImage = this.images.weapon;
                const pinImage = this.images.altWeapon;

                projImage.visible = true;
                if (def.animation.pinImage) {
                    pinImage.setFrame(def.animation.pinImage);
                    pinImage.setPos(35, 0);
                    pinImage.setZIndex(ZIndexes.Players + 1);
                }

                let frame = def.animation.cook.cookingImage ?? def.animation.liveImage;

                if (this.halloweenThrowableSkin && !def.noSkin) {
                    frame += "_halloween";
                }

                this.updateFistsPosition(false);
                projImage.setFrame(frame);

                this.anims.leftFist = Game.addTween({
                    target: this.images.leftFist,
                    to: { x: 35, y: 0 },
                    duration: def.cookTime / 2,
                    onComplete: () => {
                        this.anims.leftFist = Game.addTween({
                            target: this.images.leftFist,
                            to: Vec.scale(def.animation.cook.leftFist, PIXI_SCALE),
                            duration: def.cookTime / 2,
                            onComplete: () => {
                                this.anims.leftFist = undefined;
                            }
                        });

                        if (def.animation.pinImage) {
                            pinImage.visible = true;
                            this.anims.pin = Game.addTween({
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
                    }
                });

                if (def.cookable && def.animation.leverImage !== undefined) {
                    ParticleManager.spawnParticle({
                        frames: def.animation.leverImage,
                        lifetime: 600,
                        position: Vec.add(
                            this.position,
                            Vec.scale(def.animation.cook.rightFist, this.sizeMod)
                        ),
                        layer: this.layer,
                        zIndex: ZIndexes.Players + 1,
                        speed: Vec.rotate(Vec.create(8, 8), this.rotation),
                        rotation: this.rotation,
                        alpha: {
                            start: 1,
                            end: 0
                        },
                        scale: {
                            start: 0.8 * this.sizeMod,
                            end: this.sizeMod
                        }
                    });
                }

                this.anims.weapon = Game.addTween({
                    target: projImage,
                    to: { x: 25, y: 10 },
                    duration: def.cookTime / 2,
                    onComplete: () => {
                        this.anims.weapon = undefined;
                    }
                });

                this.anims.rightFist = Game.addTween({
                    target: this.images.rightFist,
                    to: { x: 25, y: 10 },
                    duration: def.cookTime / 2,
                    onComplete: () => {
                        this.anims.weapon = Game.addTween({
                            target: projImage,
                            to: Vec.scale(def.animation.cook.rightFist, PIXI_SCALE),
                            duration: def.cookTime / 2,
                            onComplete: () => {
                                this.anims.weapon = undefined;
                            }
                        });

                        this.anims.rightFist = Game.addTween({
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

                projImage.setFrame(`${def.idString}${this.halloweenThrowableSkin && !def.noSkin ? "_halloween" : ""}`);

                if (!def.cookable && def.animation.leverImage !== undefined) {
                    ParticleManager.spawnParticle({
                        frames: def.animation.leverImage,
                        lifetime: 600,
                        layer: this.layer,
                        position: Vec.add(
                            this.position,
                            Vec.scale(def.animation.cook.rightFist, this.sizeMod)
                        ),
                        zIndex: ZIndexes.Players + 1,
                        speed: Vec.rotate(Vec.create(8, 8), this.rotation),
                        rotation: this.rotation,
                        alpha: {
                            start: 1,
                            end: 0
                        },
                        scale: {
                            start: 0.8 * this.sizeMod,
                            end: this.sizeMod
                        }
                    });
                }

                this.anims.rightFist?.kill();
                this.anims.leftFist?.kill();
                this.anims.weapon?.kill();

                this.anims.leftFist = Game.addTween({
                    target: this.images.leftFist,
                    to: Vec.scale(def.animation.throw.leftFist, PIXI_SCALE),
                    duration: def.throwTime,
                    onComplete: () => {
                        this.anims.leftFist = undefined;
                        projImage.setVisible(true);
                        projImage.setFrame(`${def.idString}${this.halloweenThrowableSkin && !def.noSkin ? "_halloween" : ""}`);
                        this.updateFistsPosition(true);
                    }
                });

                this.anims.rightFist = Game.addTween({
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
                this.anims.leftFist = Game.addTween({
                    target: this.images.leftFist,
                    to: Vec.create(28, -45),
                    duration: 100,
                    onComplete: () => {
                        this.anims.leftFist = undefined;
                    }
                });
                this.anims.rightFist = Game.addTween({
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

    private readonly _bloodDecals = new Set<Particle>();
    get bloodDecals(): Set<Particle> { return this._bloodDecals; }

    hitEffect(position: Vector, angle: number, sound?: string): void {
        if (!Game.gameOver) {
            SoundManager.play(
                sound ?? `${
                    this.activeDisguise
                        ? MaterialSounds[this.activeDisguise.material]?.hit ?? this.activeDisguise.material
                        : "player"
                }_hit_${randomBoolean() ? "1" : "2"}`,
                {
                    position,
                    falloff: 0.2,
                    maxRange: 96,
                    layer: this.layer
                }
            );
        }

        let particle = this.activeDisguise ? (this.activeDisguise.frames?.particle ?? `${this.activeDisguise.idString}_particle`) : "blood_particle";

        if (this.activeDisguise?.particleVariations) particle += `_${random(1, this.activeDisguise.particleVariations)}`;

        ParticleManager.spawnParticle({
            frames: particle,
            zIndex: ZIndexes.Players + 0.5,
            layer: this.layer,
            position,
            lifetime: 1000,
            scale: {
                start: 0.5 * this.sizeMod,
                end: this.sizeMod
            },
            alpha: {
                start: 1,
                end: 0
            },
            speed: Vec.fromPolar(angle, randomFloat(0.5, 1))
        });

        if (GameConsole.getBuiltInCVar("cv_cooler_graphics") && !this.downed) {
            const isOnWater = this.floorType === FloorNames.Water;
            this._bloodDecals.add(
                ParticleManager.spawnParticle({
                    frames: "blood_particle",
                    zIndex: ZIndexes.Decals,
                    layer: this.layer,
                    position: randomPointInsideCircle(position, 2.5),
                    lifetime: 60000 * (isOnWater ? 0.1 : 1),
                    scale: randomFloat(0.8, 1.6),
                    alpha: {
                        start: isOnWater ? 0.5 : 1,
                        end: 0,
                        ease: EaseFunctions.expoIn
                    },
                    speed: Vec.create(0, 0),
                    tint: isOnWater ? 0xaaffff : 0xeeeeee,
                    onDeath: self => {
                        this._bloodDecals.delete(self);
                    }
                })
            );

            if (Skins.reify(this._skin).hideBlood || Math.random() > 0.6) return;

            const bodyBlood = new SuroiSprite("blood_particle");

            bodyBlood.position = randomPointInsideCircle(Vec.create(0, 0), 45);
            bodyBlood.rotation = randomRotation();
            bodyBlood.scale = randomFloat(0.4, 0.8);

            this.images.blood.addChild(bodyBlood);

            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            setTimeout(() => { bodyBlood.destroyed || bodyBlood.destroy(); }, 30000);
        }
    }

    destroy(): void {
        super.destroy();

        const { images, emote, teammateName, anims } = this;

        images.aimTrail?.destroy();
        images.vest.destroy();
        images.body.destroy();
        images.leftFist.destroy();
        images.rightFist.destroy();
        images.leftLeg?.destroy();
        images.rightLeg?.destroy();
        images.backpack.destroy();
        images.helmet.destroy();
        images.weapon.destroy();
        images.altWeapon.destroy();
        images.muzzleFlash.destroy();
        images.waterOverlay.destroy();
        images.blood.destroy();
        images.disguiseSprite?.destroy();

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

        images.backMeleeSprite?.destroy();

        this.healingParticlesEmitter.destroy();
        this.actionSound?.stop();
        clearInterval(this.bleedEffectInterval);
        if (this.isActivePlayer) $("#action-container").hide();
    }
}
