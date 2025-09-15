import { AnimationType, GameConstants, InputActions, Layer, ObjectCategory, PlayerActions, SpectateActions, ZIndexes } from "@common/constants";
import { getBadgeIdString, type EmoteDefinition } from "@common/definitions/emotes";
import { Ammos } from "@common/definitions/items/ammos";
import { ArmorType, type ArmorDefinition } from "@common/definitions/items/armors";
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
import { adjacentOrEqualLayer, adjacentOrEquivLayer } from "@common/utils/layer";
import { Angle, EaseFunctions, Geometry, Numeric } from "@common/utils/math";
import { removeFrom, type Timeout } from "@common/utils/misc";
import { DefinitionType, type ReferenceTo } from "@common/utils/objectDefinitions";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { pickRandomInArray, random, randomBoolean, randomFloat, randomPointInsideCircle, randomRotation, randomSign, randomVector } from "@common/utils/random";
import { FloorNames, FloorTypes } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import $ from "jquery";
import { Container, Graphics, GraphicsContext, ObservablePoint, Text, type ColorSource } from "pixi.js";
import { GameConsole } from "../console/gameConsole";
import { Game } from "../game";
import { CameraManager } from "../managers/cameraManager";
import { InputManager } from "../managers/inputManager";
import { MapManager } from "../managers/mapManager";
import { ParticleManager, type Particle, type ParticleEmitter, type ParticleOptions } from "../managers/particleManager";
import { PerkManager } from "../managers/perkManager";
import { SoundManager, type GameSound } from "../managers/soundManager";
import { UIManager } from "../managers/uiManager";
import { BULLET_WHIZ_SCALE, DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS, PIXI_SCALE, PLAYER_PARTICLE_ZINDEX, TEAMMATE_COLORS, UI_DEBUG_MODE } from "../utils/constants";
import { DebugRenderer } from "../utils/debugRenderer";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { getTranslatedString } from "../utils/translations/translations";
import { type TranslationKeys } from "../utils/translations/typings";
import { type Tween } from "../utils/tween";
import type { Building } from "./building";
import { GameObject } from "./gameObject";
import { Loot } from "./loot";
import { Obstacle } from "./obstacle";
import type { Projectile } from "./projectile";

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

    hasBubble = false;

    activeOverdrive = false;
    overdriveCooldown?: Timeout;

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

    private _lastParticleTrail = Date.now();

    readonly images: {
        aimTrail?: Graphics
        altAimTrail?: Graphics
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
        bubbleSprite?: SuroiSprite
        disguiseSprite?: SuroiSprite
        disguiseSpriteTrunk?: SuroiSprite
        healthBar?: Graphics
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
        emote?: Tween<ObservablePoint>
        emoteHide?: Tween<ObservablePoint>

        leftFist?: Tween<SuroiSprite>
        rightFist?: Tween<SuroiSprite>
        leftLeg?: Tween<SuroiSprite>
        rightLeg?: Tween<SuroiSprite>
        weapon?: Tween<SuroiSprite>
        pin?: Tween<SuroiSprite>
        muzzleFlashFade?: Tween<SuroiSprite>
        muzzleFlashRecoil?: Tween<SuroiSprite>
        waterOverlay?: Tween<SuroiSprite>
        sizeMod?: Tween<ObservablePoint>
        shieldScale?: Tween<ObservablePoint>
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

    reloadMod = 1;

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
            muzzleFlash: new SuroiSprite("muzzle_flash").setVisible(false).setZIndex(7).setAnchor(Vec(0, 0.5)),
            waterOverlay: new SuroiSprite("water_overlay").setVisible(false).setTint(Game.colors.water),
            blood: new Container(),
            backMeleeSprite: new SuroiSprite()
        };

        if (Game.isTeamMode) {
            const createLegImage = (): SuroiSprite => new SuroiSprite().setPos(-35, 26).setZIndex(-1).setScale(1.5, 0.8);
            this.images.leftLeg = createLegImage();
            this.images.rightLeg = createLegImage();
        }

        if (InputManager.isMobile && this.isActivePlayer && !Game.spectating) {
            const ctx = new GraphicsContext();
            for (let i = 0; i < 100; i++) {
                ctx.circle((i * 50) + 20, 0, 8).fill({ color: 0xffffff, alpha: 0.35 });
            }

            const aimTrail = this.images.aimTrail = new Graphics(ctx);
            const altAimTrail = this.images.altAimTrail = new Graphics(ctx);

            aimTrail.visible = false;
            altAimTrail.visible = false;

            this.container.addChild(aimTrail, altAimTrail);
        }

        this.container.addChild(
            this.images.vest,
            this.images.body,
            this.images.leftFist,
            this.images.rightFist,
            ...(Game.isTeamMode ? [this.images.leftLeg, this.images.rightLeg] as readonly SuroiSprite[] : []),
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
                if (this.action.item?.defType === DefinitionType.HealingItem) {
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
                    speed: Vec(randomFloat(-1, 1), -3)
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

        this.emote.container.position.copyFrom(Vec.addComponent(this.container.position, 0, -175));
        this.teammateName?.container.position.copyFrom(Vec.addComponent(this.container.position, 0, 95));
        this.images.healthBar?.position.copyFrom(Vec.addComponent(this.container.position, 0, -90));

        if (this.disguiseContainer) this.disguiseContainer.position.copyFrom(this.container.position);
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

        if (
            (
                noMovementSmoothing
                && !(this.isActivePlayer && GameConsole.getBuiltInCVar("cv_responsive_rotation"))
            ) || isNew
        ) {
            this.container.rotation = this.rotation;
        }

        if (this.isActivePlayer) {
            SoundManager.position = this.position;
            MapManager.setPosition(this.position);

            if (noMovementSmoothing) CameraManager.position = toPixiCoords(this.position);

            if (GameConsole.getBuiltInCVar("pf_show_pos")) {
                UIManager.ui.debugPos.html(
                    `X: ${this.position.x.toFixed(2)}<br>Y: ${this.position.y.toFixed(2)}<br>Z: ${this.layer ?? 0}`
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

                if (FloorTypes[floorType].particles) {
                    const options = {
                        frames: "ripple_particle",
                        zIndex: ZIndexes.BuildingsFloor + 0.9,
                        position: this._hitbox.randomPoint(),
                        lifetime: 1000,
                        layer: this.layer,
                        speed: Vec(0, 0)
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
            this.images.healthBar?.position.copyFrom(Vec.addComponent(toPixiCoords(this.position), 0, -90));
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
                    reloadMod,
                    skin,
                    helmet,
                    vest,
                    backpack,
                    halloweenThrowableSkin,
                    activeDisguise,
                    infected,
                    backEquippedMelee,
                    hasBubble,
                    activeOverdrive
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
                Game.updateLayer(layer, isNew, oldLayer);
            }

            this.backEquippedMelee = backEquippedMelee;

            this.container.visible = !dead;

            const hadSkin = this.halloweenThrowableSkin;
            if (
                hadSkin !== (this.halloweenThrowableSkin = halloweenThrowableSkin)
                && this.activeItem.defType === DefinitionType.Throwable
                && !this.activeItem.noSkin
            ) {
                this.images.weapon.setFrame(`${this.activeItem.idString}${this.halloweenThrowableSkin ? "_halloween" : ""}`);
                UIManager.updateWeaponSlots(true);
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
                    speed: randomPointInsideCircle(Vec(0, 0), 4),
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
                if (this.teammateName) this.teammateName.container.visible = false;
                if (this.images.healthBar) {
                    this.healthBarFadeTimeout?.kill();
                    this.healthBarTween?.kill();
                    this.images.healthBar.destroy();
                    this.images.healthBar = undefined;
                }

                if (this.disguiseContainer) this.disguiseContainer.visible = false;
            }

            this._oldItem = this.activeItem;
            const itemDirty = this.activeItem !== activeItem;
            this.activeItem = activeItem;

            const skinID = skin.idString;
            if (this.isActivePlayer) {
                const oldSkinID = UIManager.skinID;
                UIManager.skinID = skinID;
                if (oldSkinID !== undefined && oldSkinID !== skinID) {
                    UIManager.weaponCache[2] = undefined; // invalidate melee cache so fists in inventory update
                    UIManager.updateWeapons();
                }
            }
            this._skin = skinID;
            const skinDef = Loots.fromString<SkinDefinition>(skinID);

            let baseTint: ColorSource;
            let fistTint: ColorSource;
            if (skinDef.grassTint) {
                baseTint = fistTint = Game.colors.ghillie;
            } else {
                baseTint = skinDef.baseTint ?? 0xffffff;
                fistTint = skinDef.fistTint ?? 0xffffff;
            }

            const { body, leftFist, rightFist, leftLeg, rightLeg } = this.images;
            const baseFrame = skinDef.baseImage ?? `${skinID}_base`;
            const fistFrame = skinDef.fistImage ?? `${skinID}_fist`;

            body
                .setFrame(baseFrame)
                .setTint(baseTint);
            leftFist
                .setFrame(fistFrame)
                .setTint(fistTint);
            rightFist
                .setFrame(fistFrame)
                .setTint(fistTint);
            leftLeg
                ?.setFrame(fistFrame)
                .setTint(fistTint);
            rightLeg
                ?.setFrame(fistFrame)
                .setTint(fistTint);

            if (this.sizeMod !== sizeMod) {
                // reset the size modifier before tweening
                this.sizeMod = GameConstants.player.defaultModifiers().size;
                this._hitbox = new CircleHitbox(GameConstants.player.radius * this.sizeMod, this._hitbox.position);

                this.anims.sizeMod?.kill();
                this.anims.sizeMod = Game.addTween({
                    target: this.container.scale,
                    to: { x: sizeMod, y: sizeMod },
                    duration: 300,
                    ease: EaseFunctions.backOut,
                    onComplete: () => {
                        this.anims.sizeMod = undefined;
                        this.sizeMod = sizeMod;
                        this._hitbox = new CircleHitbox(GameConstants.player.radius * sizeMod, this._hitbox.position);
                    }
                });
            }

            if (reloadMod !== undefined && this.reloadMod !== reloadMod) this.reloadMod = reloadMod;

            const { hideEquipment, helmetLevel, vestLevel, backpackLevel } = this;

            this.hideEquipment = skinDef.hideEquipment ?? false;

            this.helmetLevel = (this.equipment.helmet = helmet)?.level ?? 0;
            this.vestLevel = (this.equipment.vest = vest)?.level ?? 0;
            this.backpackLevel = (this.equipment.backpack = backpack).level;

            const backpackTint = skinDef.backpackTint
                ?? this.equipment.backpack?.defaultTint
                ?? 0xffffff;

            this.images.backpack.setTint(!this.equipment.backpack.noTint ? backpackTint : 0xffffff);

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
                const disguiseContainer = this.disguiseContainer;

                const def = this.activeDisguise = activeDisguise;
                let disguiseSprite = this.images.disguiseSprite,
                    trunkSprite = this.images.disguiseSpriteTrunk;

                if (def !== undefined && disguiseContainer) {
                    if (!disguiseSprite) {
                        disguiseSprite = this.images.disguiseSprite = new SuroiSprite();
                        disguiseSprite.zIndex = 999; // this only applies within the player container, not globally
                        disguiseContainer.zIndex = PLAYER_PARTICLE_ZINDEX;
                        disguiseContainer.addChild(disguiseSprite);
                    }

                    let frame = `${def.frames?.base ?? def.idString}${def.variations !== undefined ? `_${random(1, def.variations)}` : ""}`;

                    if (def.isTree) {
                        const trunkFrame = `${def.frames?.base ?? def.idString}${def.trunkVariations !== undefined && def.trunkVariations !== 1 ? `_${random(1, def.trunkVariations)}` : ""}`;
                        const leavesFrame = `${def.frames?.leaves}${def.leavesVariations !== undefined && def.leavesVariations !== 1 ? `_${random(1, def.leavesVariations)}` : ""}`;

                        if (!trunkSprite) {
                            trunkSprite = this.images.disguiseSpriteTrunk = new SuroiSprite();
                            trunkSprite.zIndex = 998; // meow
                            disguiseContainer.addChild(trunkSprite);
                        }

                        trunkSprite.setFrame(trunkFrame);
                        frame = leavesFrame;
                    }

                    disguiseSprite.setFrame(frame);
                    if (!this.dead) disguiseContainer.visible = true;
                    trunkSprite?.setVisible(def.isTree ?? false);
                } else if (disguiseContainer) {
                    disguiseContainer.visible = false;
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

            // Shield
            if (hasBubble !== this.hasBubble) {
                this.hasBubble = hasBubble;
                
                let bubbleSprite = this.images.bubbleSprite;

                // Initialize sprite
                if (bubbleSprite === undefined) {
                    bubbleSprite = this.images.bubbleSprite = new SuroiSprite()
                        .setFrame("shield")
                        .setZIndex(7);

                    this.container.addChild(bubbleSprite);
                }
                
                bubbleSprite.setVisible(this.hasBubble);

                if (!isNew) {
                    if (!hasBubble) {
                        const perkDef = PerkData[PerkIds.ExperimentalForcefield];
                        this.playSound(perkDef.shieldDestroySound);
                        ParticleManager.spawnParticles(10, () => ({
                            frames: perkDef.shieldParticle,
                            position: this.hitbox.randomPoint(),
                            layer: this.layer,
                            zIndex: PLAYER_PARTICLE_ZINDEX,
                            lifetime: 1500,
                            rotation: {
                                start: randomRotation(),
                                end: randomRotation()
                            },
                            scale: {
                                start: randomFloat(0.85, 0.95),
                                end: 0,
                                ease: EaseFunctions.quarticIn
                            },
                            alpha: {
                                start: 1,
                                end: 0,
                                ease: EaseFunctions.sexticIn
                            },
                            speed: Vec.fromPolar(randomRotation(), randomFloat(4, 9))
                        }));
                    } else {
                        this.anims.shieldScale?.kill();
                        this.playSound(PerkData[PerkIds.ExperimentalForcefield].shieldObtainSound);

                        if (this.images.bubbleSprite !== undefined) {
                            this.images.bubbleSprite.setScale(0.25);
                            this.anims.shieldScale = Game.addTween({
                                target: this.images.bubbleSprite.scale,
                                to: { x: 1, y: 1 },
                                duration: 800,
                                ease: EaseFunctions.backOut,
                                onComplete: () => {
                                    this.anims.shieldScale = undefined;
                                }
                            });
                        }
                    }
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

            // Overdrive
            if (activeOverdrive !== this.activeOverdrive) {
                this.activeOverdrive = activeOverdrive;

                this.container.tint = activeOverdrive ? 0xff0000 : 0xffffff;

                if (!isNew) {
                    const perkDef = PerkData[PerkIds.Overdrive];

                    const perkSlot = UIManager._perkSlots.find(element => {
                        return element?.attr("data-idString") === perkDef.idString;
                    });

                    const spawnParticles = (): void => {
                        if (perkSlot) perkSlot.toggleClass("deactivated");
                        ParticleManager.spawnParticles(10, () => ({
                            frames: perkDef.particle,
                            position: this.hitbox.randomPoint(),
                            layer: this.layer,
                            zIndex: PLAYER_PARTICLE_ZINDEX,
                            lifetime: 5000,
                            rotation: {
                                start: randomRotation(),
                                end: randomRotation()
                            },
                            scale: {
                                start: randomFloat(0.85, 0.95),
                                end: 0,
                                ease: EaseFunctions.quarticIn
                            },
                            alpha: {
                                start: 1,
                                end: 0,
                                ease: EaseFunctions.sexticIn
                            },
                            speed: Vec.fromPolar(randomRotation(), 5)
                        }));
                        this.playSound(perkDef.activatedSound);
                    };

                    if (activeOverdrive) {
                        spawnParticles();
                    } else {
                        this.overdriveCooldown?.kill();
                        this.overdriveCooldown = Game.addTimeout(() => {
                            spawnParticles();
                        }, perkDef.cooldown);
                    }
                }
            }
        }

        if (data.action !== undefined) {
            const action = data.action;

            let actionSoundName = "";
            this.healingParticlesEmitter.active = false;

            this.actionSound?.stop();

            switch (action.type) {
                case PlayerActions.None: {
                    this.updateFistsPosition(false);
                    this.updateWeapon(true);

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
                            (reloadFullClip ? weaponDef.fullReloadTime : weaponDef.reloadTime) / (this.reloadMod === 0 ? 1 : this.reloadMod)
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
                            itemDef.useTime / PerkManager.mapOrDefault(PerkIds.FieldMedic, ({ usageMod }) => usageMod, 1)
                        );
                    }
                    break;
                }
                case PlayerActions.Revive: {
                    if (this.isActivePlayer) {
                        UIManager.animateAction(
                            getTranslatedString("action_reviving"),
                            GameConstants.player.reviveTime / PerkManager.mapOrDefault(PerkIds.FieldMedic, ({ usageMod }) => usageMod, 1)
                        );
                    }
                    break;
                }
            }

            if (actionSoundName) {
                let speed = action.type === PlayerActions.Reload ? this.reloadMod : 1;
                if (PerkManager.has(PerkIds.FieldMedic) && actionSoundName === action.item?.idString) {
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

        switch (this.activeItem.defType) {
            case DefinitionType.Gun: {
                const offset = this.activeItem.bulletOffset ?? 0;

                const start = Vec.add(this.position,
                    Vec.scale(
                        Vec.rotate(Vec(0, offset), this.rotation),
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
            case DefinitionType.Melee: {
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

        return weaponDef.defType === DefinitionType.Gun && weaponDef.isDual
            ? Loots.fromString<SingleGunNarrowing>(weaponDef.singleVariant)
            : weaponDef as SingleGunNarrowing | Exclude<WeaponDefinition, GunDefinition>;
    }

    private _getOffset(): number {
        const weaponDef = this.activeItem;

        return weaponDef.defType === DefinitionType.Gun && weaponDef.isDual
            ? weaponDef.leftRightOffset * PIXI_SCALE
            : 0;
    }

    updateTeammateName(): void {
        if (
            Game.isTeamMode
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
            const badge = name?.badge ? new SuroiSprite(getBadgeIdString(name.badge)) : undefined;
            const container = new Container();
            this.teammateName = { text, badge, container };

            text.anchor.set(0.5);

            if (badge) {
                const oldWidth = badge.width;
                badge.width = text.height / 1.25;
                badge.height *= badge.width / oldWidth;
                badge.position = Vec(
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

    healthBarTween?: Tween<Graphics>;
    healthBarFadeTimeout?: Timeout;

    updateHealthBar(normalizedHealth: number): void {
        this.healthBarFadeTimeout?.kill();

        let healthBar = this.images.healthBar;
        if (!healthBar) {
            healthBar = this.images.healthBar = new Graphics();
            healthBar.position = Vec.addComponent(this.container.position, 0, -90);
            healthBar.zIndex = 999;
            healthBar.alpha = 0;
            this.containers.push(healthBar);
            this.updateLayer(true);
        }

        healthBar.visible = true;
        this.healthBarTween = Game.addTween({
            target: healthBar,
            to: { alpha: 1 },
            duration: 100
        });

        this.healthBarFadeTimeout = Game.addTimeout(() => {
            if (!healthBar) return;
            this.healthBarTween = Game.addTween({
                target: healthBar,
                to: { alpha: 0 },
                duration: 100,
                onComplete: () => healthBar.visible = false
            });
        }, 100);

        healthBar
            .clear()
            .roundRect(-82.5, -17.5, 165, 35, 3)
            .fill({ color: 0x000000, alpha: 0.45 })
            .roundRect(-75, -10, 150 * normalizedHealth, 20, 2)
            .fill(UIManager.getHealthColor(normalizedHealth, this.downed));
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

            if (reference.defType === DefinitionType.Throwable && !reference.noSkin) {
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
        const isDualGun = imagePresent && weaponDef.defType === DefinitionType.Gun && weaponDef.isDual;
        if (imagePresent) {
            let frame = `${reference.idString}${weaponDef.defType === DefinitionType.Gun || (image as NonNullable<MeleeDefinition["image"]>).separateWorldImage
                ? "_world"
                : ""
            }`;

            if (weaponDef.defType === DefinitionType.Throwable && this.halloweenThrowableSkin && !weaponDef.noSkin) {
                frame += "_halloween";
            }

            const { angle, position: { x: pX, y: pY } } = image;
            const offset = this._getOffset();

            this.images.weapon
                .setFrame(frame)
                .setPos(pX, pY + offset)
                .setAngle(angle)
                .setPivot(reference.image && "pivot" in reference.image && reference.image.pivot ? reference.image.pivot : Vec(0, 0));

            if (isDualGun) {
                this.images.altWeapon
                    .setFrame(frame)
                    .setPos(pX, pY - offset)
                    .setAngle(angle) // there's an ambiguity here as to whether the angle should be inverted or the same
                    .setVisible(true);

                this.images.aimTrail?.position.set(pX, pY + offset);
                this.images.altAimTrail?.position.set(pX, pY - offset);
            }
        }

        if (!isDualGun) {
            this.images.altWeapon.setVisible(false);
            this.images.aimTrail?.position.set(0, 0);
        }

        if (this.activeItem !== this._oldItem) {
            this.anims.muzzleFlashFade?.kill();
            this.anims.muzzleFlashRecoil?.kill();
            this.images.muzzleFlash.alpha = 0;
            if (this.isActivePlayer && !isNew) {
                let soundID: string;
                if (reference.defType === DefinitionType.Throwable) {
                    soundID = "throwable";
                } else if (reference.defType === DefinitionType.Gun && reference.isDual) {
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

        switch (weaponDef.defType) {
            case DefinitionType.Gun: {
                this.images.rightFist.setZIndex((fists as SingleGunNarrowing["fists"]).rightZIndex ?? 1);
                this.images.leftFist.setZIndex((fists as SingleGunNarrowing["fists"]).leftZIndex ?? 1);
                this.images.weapon.setZIndex(image?.zIndex ?? 2);
                this.images.altWeapon.setZIndex(2);
                this.images.body.setZIndex(3);
                break;
            }
            case DefinitionType.Melee: {
                this.images.leftFist.setZIndex(4);
                this.images.rightFist.setZIndex(4);
                this.images.body.setZIndex(2);
                this.images.weapon.setZIndex(reference.image?.zIndex ?? 1);
                break;
            }
            case DefinitionType.Throwable: {
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
                    const posOverride = (def as ArmorDefinition).positionOverride;
                    const posOverrideDowned = (def as ArmorDefinition).positionOverrideDowned;

                    image.setPos(
                        this.downed ? (posOverrideDowned ?? 10) : (posOverride ?? -8),
                        0
                    );
                }
            } else {
                const vestDef = def as ArmorDefinition & { armorType: ArmorType.Vest };
                let color: number | undefined;
                if ((color = vestDef.color) !== undefined) {
                    image.setFrame(vestDef.worldImage ?? "vest_world")
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
            container.children(".item-name").attr("style", `color: ${def.level > 3 ? "#ff9900" : "#ffffff"};`);

            let itemTooltip = getTranslatedString(def.idString as TranslationKeys);
            if (def.defType === DefinitionType.Armor) {
                itemTooltip = getTranslatedString("tt_reduces", {
                    item: `<b>${getTranslatedString(def.idString as TranslationKeys)}</b><br>`,
                    percent: (def.damageReduction * 100).toString()
                });
            }

            container.children(".item-tooltip").html(itemTooltip);
            container.css("outline", def.noDrop || Game.spectating ? "none" : "");
        }

        container.css("visibility", (def?.level ?? 0) > 0 || UI_DEBUG_MODE ? "visible" : "hidden");

        container[0].addEventListener(
            "pointerdown",
            e => {
                e.stopImmediatePropagation();
                if (e.button === 2 && def && Game.isTeamMode) {
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

    canInteract(player: Player): boolean {
        return Game.isTeamMode
            && !player.downed
            && this.downed
            && !this.beingRevived
            && this !== player
            && this.teamID === player.teamID
            && adjacentOrEqualLayer(this.layer, player.layer);
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

        const { backgroundTexture, scale } = Loot.getBackgroundAndScale(Loots.fromStringSafe(emote.idString));
        background.setFrame(backgroundTexture ?? "emote_background");
        image.setFrame(emote.idString).setScale(scale ?? 1);

        this.anims.emote = Game.addTween({
            target: container.scale,
            to: { x: 1, y: 1 },
            duration: 250,
            ease: EaseFunctions.backOut,
            onComplete: () => {
                this.anims.emote = undefined;
            }
        });

        this._emoteHideTimeout = this.addTimeout(() => {
            this.anims.emoteHide = Game.addTween({
                target: container.scale,
                to: { x: 0, y: 0 },
                duration: 200,
                ease: EaseFunctions.backIn,
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
            case AnimationType.None: {
                this.updateFistsPosition(true);
                this.updateWeapon();
                break;
            }
            case AnimationType.Melee: {
                if (this.activeItem.defType !== DefinitionType.Melee) {
                    console.warn(`Attempted to play melee animation with non-melee item '${this.activeItem.idString}'`);
                    return;
                }
                this.updateFistsPosition(false);
                this.updateWeapon(true);
                const weaponDef = this.activeItem;

                let altFist = Math.random() < 0.5;
                if (!weaponDef.fists.randomFist) altFist = true;
                let previousDuration = 0;

                if (weaponDef.animation) {
                    for (const frame of weaponDef.animation) {
                        const duration = frame.duration;
                        const currentWeapon = this.activeItem;
                        this.addTimeout(() => {
                            if (this.activeItem.idString === currentWeapon.idString) {
                                if (!weaponDef.fists.randomFist || !altFist) {
                                    this.anims.leftFist = Game.addTween({
                                        target: this.images.leftFist,
                                        to: { x: frame.fists.left.x, y: frame.fists.left.y },
                                        duration,
                                        ease: EaseFunctions.cubicOut
                                    });
                                }

                                if (altFist) {
                                    this.anims.rightFist = Game.addTween({
                                        target: this.images.rightFist,
                                        to: { x: frame.fists.right.x, y: frame.fists.right.y },
                                        duration,
                                        ease: EaseFunctions.cubicOut
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
                                        ease: EaseFunctions.cubicOut
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

                const hitDelay = weaponDef.hitDelay ?? 50;
                this.addTimeout(() => {
                    // Play hit effect on closest object
                    // TODO: share this logic with the server

                    let hitCount = 0;
                    for (let i = 0; i < (weaponDef.numberOfHits ?? 1); i++) {
                        this.addTimeout((): void => {
                            if (this.activeItem.defType !== DefinitionType.Melee) return;

                            if (hitCount > 0) {
                                this.playSound(
                                    weaponDef.swingSound ?? "swing",
                                    {
                                        falloff: 0.4,
                                        maxRange: 96
                                    }
                                );
                            }

                            type MeleeObject = Player | Obstacle | Building | Projectile;

                            const position = Vec.add(
                                this.position,
                                Vec.scale(Vec.rotate(weaponDef.offset, this.rotation), this.sizeMod)
                            );
                            const hitbox = new CircleHitbox(weaponDef.radius * this.sizeMod, position);
                            const targets: MeleeObject[] = [];

                            hitCount++;
                            for (const object of Game.objects) {
                                if (
                                    (object.dead && !(object.isBuilding && object.definition.hasDamagedCeiling))
                                    || object === this
                                    || !(object.isPlayer || object.isObstacle || object.isBuilding || object.isProjectile)
                                    || !object.damageable
                                    || (object.isObstacle && (object.definition.isStair || object.definition.noMeleeCollision))
                                    || !adjacentOrEquivLayer(object, this.layer)
                                    || !object.hitbox?.collidesWith(hitbox)
                                ) continue;

                                targets.push(object);
                            }

                            targets.sort((a, b) => {
                                if (Game.isTeamMode && a.isPlayer && a.teamID === this.teamID) return Infinity;
                                if (Game.isTeamMode && b.isPlayer && b.teamID === this.teamID) return -Infinity;

                                return (a.hitbox?.distanceTo(this.hitbox).distance ?? 0) - (b.hitbox?.distanceTo(this.hitbox).distance ?? 0);
                            });

                            const angleToPos = Angle.betweenPoints(this.position, position);
                            const numTargets = Numeric.min(targets.length, weaponDef.maxTargets ?? 1);
                            for (let i = 0; i < numTargets; i++) {
                                const target = targets[i];

                                if (target.isPlayer) {
                                    let sound = this.activeItem.hitSound;
                                    if (sound && weaponDef.numberOfHits !== undefined && weaponDef.numberOfHits > 1) {
                                        sound += `_${hitCount}`;
                                    }
                                    target.hitEffect(position, angleToPos, sound);
                                } else {
                                    target.hitEffect(position, angleToPos);
                                }
                            }
                        }, (i === 0 ? 0 : (weaponDef.delayBetweenHits ?? 0)));
                    }
                }, hitDelay);
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
            case AnimationType.GunFireAlt: {
                if (this.activeItem.defType !== DefinitionType.Gun) {
                    const name = ({
                        [AnimationType.GunFire]: "GunFire",
                        [AnimationType.GunFireAlt]: "GunFireAlt"
                    })[anim];
                    console.warn(`Attempted to play gun animation (${name}) with non-gun item '${this.activeItem.idString}'`);
                    return;
                }
                const weaponDef = this.activeItem;
                const {
                    image: { position: { x: imgX } }
                } = this._getItemReference() as SingleGunNarrowing;
                const {
                    fists: {
                        left: { x: leftFistX },
                        right: { x: rightFistX }
                    }
                } = weaponDef;

                const isAltFire = weaponDef.isDual
                    ? anim === AnimationType.GunFireAlt
                    : undefined;

                this.updateFistsPosition(false);
                this.updateWeapon(true);
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
                        Vec.scale(Vec.rotate(Vec(weaponDef.length, offset), this.rotation), this.sizeMod)
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
                    muzzleFlash.scale = Vec(
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

                if (weaponDef.cameraShake !== undefined) {
                    CameraManager.shake(weaponDef.cameraShake.duration, weaponDef.cameraShake.intensity);
                }

                if (weaponDef.backblast !== undefined) {
                    const trail = weaponDef.ballistics.trail,
                        backblast = weaponDef.backblast;

                    if (trail && Date.now() - this._lastParticleTrail >= trail.interval) {
                        const offset = weaponDef.isDual
                            ? (isAltFire ? -1 : 1) * weaponDef.leftRightOffset
                            : (weaponDef.bulletOffset ?? 0);

                        const position = Vec.add(
                            this.position,
                            Vec.scale(Vec.rotate(Vec(-backblast.length, offset), this.rotation), this.sizeMod)
                        );

                        ParticleManager.spawnParticles(
                            backblast.particlesAmount,
                            () => ({
                                frames: trail.frame,
                                speed: Vec.fromPolar(
                                    randomRotation(),
                                    randomFloat(backblast.min, backblast.max)
                                ),
                                position,
                                lifetime: backblast.duration,
                                zIndex: ZIndexes.Bullets - 1,
                                scale: randomFloat(backblast.scale.min, backblast.scale.max),
                                alpha: {
                                    start: randomFloat(trail.alpha.min, trail.alpha.max),
                                    end: 0
                                },
                                layer: this.layer,
                                tint: pickRandomInArray([0x8a8a8a, 0x3d3d3d, 0x858585])
                            })
                        );

                        this._lastParticleTrail = Date.now();
                    }
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
                if (this.activeItem.defType !== DefinitionType.Throwable) {
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
                                    ...Vec.add(Vec.scale(def.animation.cook.leftFist, PIXI_SCALE), Vec(15, 0))
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
                        speed: Vec.rotate(Vec(8, 8), this.rotation),
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
                if (this.activeItem.defType !== DefinitionType.Throwable) {
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
                        speed: Vec.rotate(Vec(8, 8), this.rotation),
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
                    to: Vec(28, -45),
                    duration: 100,
                    onComplete: () => {
                        this.anims.leftFist = undefined;
                    }
                });
                this.anims.rightFist = Game.addTween({
                    target: this.images.rightFist,
                    to: Vec(58, 48),
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
                        : this.hasBubble ? PerkData[PerkIds.ExperimentalForcefield].shieldHitSound : "player"
                }_hit_${randomBoolean() ? "1" : "2"}`,
                {
                    position,
                    falloff: 0.2,
                    maxRange: 96,
                    layer: this.layer
                }
            );
        }

        let particle = this.activeDisguise ? (this.activeDisguise.frames?.particle ?? `${this.activeDisguise.idString}_particle`) : this.hasBubble ? PerkData[PerkIds.ExperimentalForcefield].shieldParticle : "blood_particle";

        if (this.activeDisguise?.particleVariations) particle += `_${random(1, this.activeDisguise.particleVariations)}`;

        ParticleManager.spawnParticle({
            frames: particle,
            zIndex: PLAYER_PARTICLE_ZINDEX,
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
                    speed: Vec(0, 0),
                    tint: isOnWater ? 0xaaffff : 0xeeeeee,
                    onDeath: self => {
                        this._bloodDecals.delete(self);
                    }
                })
            );

            if (Skins.reify(this._skin).hideBlood || Math.random() > 0.6) return;

            const bodyBlood = new SuroiSprite("blood_particle");

            bodyBlood.position = randomPointInsideCircle(Vec(0, 0), 45);
            bodyBlood.rotation = randomRotation();
            bodyBlood.scale = randomFloat(0.4, 0.8);

            this.images.blood.addChild(bodyBlood);

            setTimeout(() => { bodyBlood.destroyed || bodyBlood.destroy(); }, 30000);
        }
    }

    destroy(): void {
        super.destroy();

        const { images, emote, teammateName, anims } = this;

        images.aimTrail?.destroy();
        images.altAimTrail?.destroy();
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
        this.disguiseContainer?.destroy();
        this.healthBarFadeTimeout?.kill();
        this.healthBarTween?.kill();
        images.healthBar?.destroy();

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
        anims.sizeMod?.kill();

        images.backMeleeSprite?.destroy();

        this.healingParticlesEmitter.destroy();
        this.actionSound?.stop();
        clearInterval(this.bleedEffectInterval);
        if (this.isActivePlayer) $("#action-container").hide();
    }
}
