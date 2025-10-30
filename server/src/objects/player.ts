import { AnimationType, GameConstants, InputActions, Layer, ObjectCategory, PlayerActions, SpectateActions } from "@common/constants";
import { type BadgeDefinition } from "@common/definitions/badges";
import { Emotes, type EmoteDefinition } from "@common/definitions/emotes";
import { Ammos } from "@common/definitions/items/ammos";
import { ArmorType, Armors } from "@common/definitions/items/armors";
import { Backpacks } from "@common/definitions/items/backpacks";
import { Guns, Tier, type GunDefinition } from "@common/definitions/items/guns";
import { HealingItems, HealType } from "@common/definitions/items/healingItems";
import { Melees, type MeleeDefinition } from "@common/definitions/items/melees";
import { PerkCategories, PerkData, PerkIds, Perks, type PerkDefinition } from "@common/definitions/items/perks";
import { DEFAULT_SCOPE, Scopes, type ScopeDefinition } from "@common/definitions/items/scopes";
import { Skins, type SkinDefinition } from "@common/definitions/items/skins";
import { Throwables, type ThrowableDefinition } from "@common/definitions/items/throwables";
import { Loots, type WeaponDefinition } from "@common/definitions/loots";
import { MapIndicators } from "@common/definitions/mapIndicators";
import { type PlayerPing } from "@common/definitions/mapPings";
import { Obstacles, type ObstacleDefinition } from "@common/definitions/obstacles";
import { type SyncedParticleDefinition } from "@common/definitions/syncedParticles";
import { GameOverPacket, TeammateGameOverData } from "@common/packets/gameOverPacket";
import { type InputData } from "@common/packets/inputPacket";
import { DamageSources, KillPacket } from "@common/packets/killPacket";
import { MutablePacketDataIn } from "@common/packets/packet";
import { PacketStream } from "@common/packets/packetStream";
import { ReportPacket } from "@common/packets/reportPacket";
import { type SpectateData } from "@common/packets/spectatePacket";
import { UpdatePacket, type PlayerData, type UpdateDataCommon } from "@common/packets/updatePacket";
import { PlayerModifiers } from "@common/typings";
import { CircleHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer } from "@common/utils/layer";
import { Angle, Collision, Geometry, Numeric } from "@common/utils/math";
import { removeFrom, type SDeepMutable, type Timeout } from "@common/utils/misc";
import { DefinitionType, type EventModifiers, type ExtendedWearerAttributes, type ReferenceTo, type ReifiableDef, type WearerAttributes } from "@common/utils/objectDefinitions";
import { type FullData } from "@common/utils/objectsSerializations";
import { pickRandomInArray, random, randomPointInsideCircle, weightedRandom } from "@common/utils/random";
import { SuroiByteStream } from "@common/utils/suroiByteStream";
import { FloorNames, FloorTypes } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import { randomBytes } from "crypto";
import { type Game } from "../game";
import { HealingAction, ReloadAction, ReviveAction, type Action } from "../inventory/action";
import { GunItem } from "../inventory/gunItem";
import { Inventory, type InventoryItem } from "../inventory/inventory";
import { CountableInventoryItem, InventoryItemBase } from "../inventory/inventoryItem";
import { MeleeItem } from "../inventory/meleeItem";
import { ThrowableItem } from "../inventory/throwableItem";
import { type Team } from "../team";
import { Config } from "../utils/config";
import { serverWarn } from "../utils/serverHelpers";
import { DeathMarker } from "./deathMarker";
import { Emote } from "./emote";
import { Explosion } from "./explosion";
import { BaseGameObject, type DamageParams, type GameObject } from "./gameObject";
import { type Loot } from "./loot";
import { MapIndicator } from "./mapIndicator";
import { Obstacle } from "./obstacle";
import { Projectile } from "./projectile";
import { type SyncedParticle } from "./syncedParticle";

export interface PlayerSocketData {
    player?: Player
    readonly ip?: string
    readonly teamID?: string
    readonly autoFill: boolean
    readonly role?: string
    readonly isDev: boolean
    readonly nameColor?: number
    readonly lobbyClearing: boolean
    readonly weaponPreset: string
}

export class Player extends BaseGameObject.derive(ObjectCategory.Player) {
    private static readonly baseHitbox = new CircleHitbox(GameConstants.player.radius);

    override readonly fullAllocBytes = 16;
    override readonly partialAllocBytes = 12;
    override readonly damageable = true;

    private _hitbox: CircleHitbox;
    override get hitbox(): CircleHitbox { return this._hitbox; }

    name: string;
    readonly ip?: string;

    halloweenThrowableSkin = false;
    activeBloodthirstEffect = false;
    activeDisguise?: ObstacleDefinition;

    bulletTargetHitCount = 0;
    targetHitCountExpiration?: Timeout;

    overdriveTimeout?: Timeout;
    activeOverdrive = false;
    overdriveKills = 0;
    overdriveCooldown?: Timeout;
    canUseOverdrive = true;

    teamID?: number;
    colorIndex = 0; // Assigned in the team.ts file.

    isConsumingItem = false;

    // Rate Limiting: Team Pings & Emotes.
    emoteCount = 0;
    lastRateLimitUpdate = 0;
    blockEmoting = false;

    private timeWhenLastOutsideOfGas = Date.now();
    private additionalGasDamage = 0;

    initializedSpecialSpectatingCase = false;

    readonly loadout: {
        badge?: BadgeDefinition
        skin: SkinDefinition
        emotes: ReadonlyArray<EmoteDefinition | undefined>
    };

    joined = false;
    disconnected = false;

    private _team?: Team;
    get team(): Team | undefined { return this._team; }

    set team(value: Team | undefined) {
        if (!this.game.isTeamMode) {
            console.warn("Trying to set a player's team while the game isn't in team mode");
            return;
        }

        if (this._team === this.team) return;

        this.dirty.teammates = true;
        this._team = value;
    }

    private _kills = 0;
    get kills(): number { return this._kills; }
    set kills(kills: number) {
        if (this._kills === kills) return;

        this._kills = kills;
        this.game.updateKillLeader(this);
    }

    private _maxHealth = GameConstants.player.defaultHealth;
    get maxHealth(): number { return this._maxHealth; }
    set maxHealth(maxHealth: number) {
        if (this._maxHealth === maxHealth) return;

        this._maxHealth = maxHealth;
        this.dirty.maxMinStats = true;
        this._team?.setDirty();

        if (this._health <= this._maxHealth) {
            this._normalizedHealth = Numeric.remap(this._health, 0, maxHealth, 0, 1);
            this.dirty.health = true;
        } else {
            this.health = this._health;
        }
    }

    private _health = this._maxHealth;

    private _normalizedHealth = Numeric.remap(this._health, 0, this._maxHealth, 0, 1);
    get normalizedHealth(): number { return this._normalizedHealth; }

    get health(): number { return this._health; }
    set health(health: number) {
        const clamped = Numeric.min(health, this._maxHealth);
        if (this._health === clamped) return;

        this._health = clamped;
        this._team?.setDirty();
        this.dirty.health = true;
        this._normalizedHealth = Numeric.remap(this.health, 0, this.maxHealth, 0, 1);

        if (this.hasPerk(PerkIds.SecondWind) && !(this._health / this._maxHealth < 0.5)) this._modifiers.baseSpeed = 1;

        if (this.activeDisguise?.explosion !== undefined) {
            this.emitLowHealthParticles = this._health / this._maxHealth < 0.3; // 30%
        }
    }

    private _maxAdrenaline = GameConstants.player.maxAdrenaline;

    private _normalizedAdrenaline = 0;
    get normalizedAdrenaline(): number { return this._normalizedAdrenaline; }

    get maxAdrenaline(): number { return this._maxAdrenaline; }
    set maxAdrenaline(maxAdrenaline: number) {
        if (this._maxAdrenaline === maxAdrenaline) return;
        this._maxAdrenaline = maxAdrenaline;
        this.dirty.maxMinStats = true;

        if (this._adrenaline < this._maxAdrenaline) {
            this._normalizedAdrenaline = Numeric.remap(this.adrenaline, this.minAdrenaline, this.maxAdrenaline, 0, 1);
            this.dirty.adrenaline = true;
        } else {
            this.adrenaline = this._adrenaline;
        }
    }

    private _minAdrenaline = 0;
    get minAdrenaline(): number { return this._minAdrenaline; }
    set minAdrenaline(minAdrenaline: number) {
        const min = Numeric.min(minAdrenaline, this._maxAdrenaline);
        if (this._minAdrenaline !== min) {
            this._minAdrenaline = min;
            this.dirty.maxMinStats = true;
        }

        this.adrenaline = this._adrenaline;
    }

    private _adrenaline = this._minAdrenaline;
    get adrenaline(): number { return this._adrenaline; }
    set adrenaline(adrenaline: number) {
        const clamped = Numeric.clamp(adrenaline, this._minAdrenaline, this._maxAdrenaline);
        if (this._adrenaline === clamped) return;

        this._adrenaline = clamped;
        this.dirty.adrenaline = true;
        this._normalizedAdrenaline = Numeric.remap(this.adrenaline, this.minAdrenaline, this.maxAdrenaline, 0, 1);
    }

    private _maxShield = GameConstants.player.maxShield;

    private _normalizedShield = 0;
    get normalizedShield(): number { return this._normalizedShield; }

    get maxShield(): number { return this._maxShield; }
    set maxShield(maxShield: number) {
        if (this._maxShield === maxShield) return;
        this._maxShield = maxShield;
        this.dirty.maxMinStats = true;

        if (this._shield < this._maxShield) {
            this._normalizedShield = Numeric.remap(this.shield, 0, this.maxShield, 0, 1);
            this.dirty.shield = true;
        } else {
            this.shield = this._shield;
        }
    }

    hadShield = false;

    private _shield = 0;
    get shield(): number { return this._shield; }
    set shield(shield: number) {
        const clamped = Numeric.clamp(shield, 0, this._maxShield);
        if (this._shield === clamped) return;

        this._shield = clamped;
        this.dirty.shield = true;
        this._normalizedShield = Numeric.remap(this.shield, 0, this.maxShield, 0, 1);

        const hasBubble = this.shield > 0;
        if (this.hasBubble !== hasBubble) {
            this.hasBubble = hasBubble;
            this.setDirty();
            if (!hasBubble && this.hasPerk(PerkIds.ExperimentalForcefield)) {
                this._setShieldTimeout();
            }
        }
    }

    private _setShieldTimeout(): void {
        this.shieldTimeout = this.game.addTimeout(() => {
            if (!this.dead && this.hasPerk(PerkIds.ExperimentalForcefield)) this.shield = 100;
        }, PerkData[PerkIds.ExperimentalForcefield].shieldRespawnTime);
    }

    private _sizeMod = 1;
    get sizeMod(): number { return this._sizeMod; }
    set sizeMod(size: number) {
        if (this._sizeMod === size) return;

        this._sizeMod = size;
        this._hitbox = Player.baseHitbox.transform(this._hitbox.position, size);
        this.dirty.size = true;
        this.setDirty();
    }

    private _reloadMod = 1;
    get reloadMod(): number { return this._reloadMod; }
    set reloadMod(reload: number) {
        if (this._reloadMod === reload) return;

        this._reloadMod = reload;
        this.dirty.reload = true;
        this.setDirty();
    }

    private _fireRateMod = 1;
    get fireRateMod(): number { return this._fireRateMod; }
    set fireRateMod(fireRate: number) {
        if (this._fireRateMod === fireRate) return;

        this._fireRateMod = fireRate;
    }

    private _maxInfection = GameConstants.player.maxInfection;

    private _normalizedInfection = 0;
    get normalizedInfection(): number { return this._normalizedInfection; }

    get maxInfection(): number { return this._maxInfection; }
    set maxInfection(maxInfection: number) {
        if (this._maxInfection === maxInfection) return;
        this._maxInfection = maxInfection;
        this.dirty.maxMinStats = true;

        if (this._infection < this._maxInfection) {
            this._normalizedInfection = Numeric.remap(this.infection, 0, this.maxInfection, 0, 1);
            this.dirty.infection = true;
        } else {
            this.infection = this._infection;
        }
    }

    private _infection = 0;
    get infection(): number { return this._infection; }
    set infection(infection: number) {
        const clamped = Numeric.clamp(infection, 0, this._maxInfection);
        if (this._infection === clamped || this.hasPerk(PerkIds.Immunity)) return;

        this._infection = clamped;
        this.dirty.infection = true;
        this._normalizedInfection = Numeric.remap(this.infection, 0, this.maxInfection, 0, 1);

        const infected = this.infection >= 100;
        if (infected) {
            this.addPerk(PerkIds.Infected);
            this.setDirty();
        } else if (this.infection <= 0) {
            this.removePerk(PerkIds.Infected);
        }
    }

    private _isCycling = false;
    get isCycling(): boolean { return this._isCycling; }
    set isCycling(cycling: boolean) {
        if (this._isCycling === cycling) return;
        this._isCycling = cycling;
        this.setDirty();
    }

    private _emitLowHealthParticles = false;
    get emitLowHealthParticles(): boolean { return this._emitLowHealthParticles; }
    set emitLowHealthParticles(value: boolean) {
        if (this._emitLowHealthParticles === value) return;
        this._emitLowHealthParticles = !this.dead && value;
        this.setDirty();
    }

    private _modifiers = GameConstants.player.defaultModifiers();

    killedBy?: Player;
    downedBy?: {
        readonly player: Player
        readonly item?: InventoryItem
    };

    lastSelfKillTime?: number;
    lastSelfDownTime?: number;

    lastDamagedBy?: {
        readonly player: Player
        readonly weapon?: DamageParams["weaponUsed"]
        readonly time: number
    };


    damageDone = 0;
    damageTaken = 0;
    readonly joinTime: number;

    readonly recoil = {
        active: false,
        time: 0,
        multiplier: 1
    };

    effectSpeedMultiplier = 1; // TODO find a better way to do this maybe
    effectSpeedTimeout?: Timeout;

    isMoving = false;

    movement = {
        up: false,
        down: false,
        left: false,
        right: false,
        // mobile
        moving: false,
        angle: 0
    };

    isMobile!: boolean;

    /**
     * Whether the player is attacking as of last update
     */
    attacking = false;

    /**
     * Whether the player started attacking last update
     */
    startedAttacking = false;

    /**
     * Whether the player stopped attacking last update
     */
    stoppedAttacking = false;

    /**
     * Whether the player is turning as of last update
     */
    turning = false;

    /**
     * The distance from the player position to the player mouse in game units
     */
    distanceToMouse = GameConstants.player.maxMouseDist;

    /**
     * Keeps track of various fields which are "dirty"
     * and therefore need to be sent to the client for
     * updating
     */
    readonly dirty = {
        id: true,
        teammates: true,
        highlightedPlayers: true,
        health: true,
        maxMinStats: true,
        adrenaline: true,
        shield: true,
        infection: true,
        size: true,
        reload: true,
        weapons: true,
        slotLocks: true,
        items: true,
        zoom: true,
        layer: true,
        activeC4s: true,
        perks: true,
     //   updatedPerks: true,
        teamID: true
    };

    readonly inventory = new Inventory(this);

    get activeItemIndex(): number {
        return this.inventory.activeWeaponIndex;
    }

    get activeItem(): InventoryItem {
        return this.inventory.activeWeapon;
    }

    get activeItemDefinition(): WeaponDefinition {
        return this.activeItem.definition;
    }

    bufferedAttack?: Timeout;

    private readonly _animation = {
        type: AnimationType.None,
        dirty: true
    };

    get animation(): AnimationType { return this._animation.type; }
    set animation(animType: AnimationType) {
        const animation = this._animation;
        animation.type = animType;
        animation.dirty = true;
    }

    /**
     * Objects the player can see
     */
    readonly visibleObjects = new Set<GameObject>();

    updateObjects = true;

    /**
     * Objects near the player hitbox
     */
    nearObjects = new Set<GameObject>();

    /**
     * Ticks since last visible objects update
     */
    ticksSinceLastUpdate = 0;

    private _scope!: ScopeDefinition;
    private _tempScope: ScopeDefinition | undefined;
    private _scopeTimeout?: Timeout;
    get effectiveScope(): ScopeDefinition { return this._tempScope ?? this._scope; }
    set effectiveScope(target: ReifiableDef<ScopeDefinition>) {
        const scope = Scopes.reify(target);
        if (this._scope === scope) return;

        // This timeout prevents objects from visibly disappearing when switching from a higher to a lower scope
        this._scopeTimeout?.kill();
        if ((this._scope?.zoomLevel ?? 0) > scope.zoomLevel) {
            this._tempScope = this._scope;
            this._scope = scope;
            this._scopeTimeout = this.game.addTimeout(() => {
                this._tempScope = undefined;
                this.updateObjects = true;
            }, 2000);
        } else {
            this._tempScope = undefined;
            this.updateObjects = true;
        }

        this._scope = scope;
        this.dirty.zoom = true;
    }

    readonly socket: Bun.ServerWebSocket<PlayerSocketData> | undefined;

    private readonly _action: { type?: Action, dirty: boolean } = {
        type: undefined,
        dirty: true
    };

    get action(): Action | undefined { return this._action.type; }
    set action(value: Action | undefined) {
        const action = this._action;
        const wasReload = action.type?.type === PlayerActions.Reload;

        action.type = value;
        action.dirty = true;

        if (
            !wasReload
            && value === undefined
            && this.activeItem.isGun
            && this.activeItem.ammo <= 0
            && this.inventory.items.hasItem((this.activeItemDefinition as GunDefinition).ammoType)
            && !this.isConsumingItem // we do not want a forced reload action when we are using a healing item otherwise we will "reload" fists
        ) {
            // The action slot is now free, meaning our player isn't doing anything
            // Let's try reloading our empty gun then, unless we just cancelled a reload
            action.type = new ReloadAction(this, this.activeItem);
            action.dirty = true;
        }
    }

    spectating?: Player;
    startedSpectating = false;
    spectators = new Set<Player>();
    lastSpectateActionTime = 0;
    reportedPlayerIDs = new Map<number, boolean>();
    lastPingTime = 0;

    readonly role?: string;
    readonly isDev: boolean;
    readonly hasColor: boolean;
    readonly nameColor: number;

    /**
     * Used to make players invulnerable for 5 seconds after spawning or until they move
     */
    invulnerable = true;

    /**
     * Determines if the player can despawn
     * Set to false once the player picks up loot
     */
    canDespawn = true;

    lastFreeSwitch = 0;
    effectiveSwitchDelay = 0;

    isInsideBuilding = false;

    floor = FloorNames.Water;

    screenHitbox = RectangleHitbox.fromRect(1, 1);

    downed = false;
    beingRevivedBy?: Player;

    activeStair?: Obstacle;

    get position(): Vector {
        return this._hitbox.position;
    }

    set position(position: Vector) {
        if (Vec.equals(position, this.position)) return;

        this._hitbox.position = position;
        this._team?.setDirty();
    }

    baseSpeed = GameConstants.player.baseSpeed;

    private _movementVector = Vec(0, 0);
    get movementVector(): Vector { return Vec.clone(this._movementVector); }

    spawnPosition: Vector = Vec(this.game.map.width / 2, this.game.map.height / 2);

    private readonly _mapPings: Game["mapPings"] = [];

    c4s = new Set<Projectile>();

    backEquippedMelee?: MeleeDefinition;

    hasBubble = false;

    infected = false;

    hasMagneticField = false;

    reversedMovement = false;

    readonly perks: PerkDefinition[] = [];

   // updatedPerks: PerkDefinition[] = [];

    perkUpdateMap?: Map<PerkDefinition, number>; // key = perk, value = last updated

    private readonly _perkData: Record<string, unknown> = {};

    private _pingSeq = 0;

    // key = proj, value = angle
    stuckProjectiles: Map<Projectile, number> | undefined;

    immunityTimeout: Timeout | undefined;

    shieldTimeout: Timeout | undefined;

    mapIndicator?: MapIndicator;

    highlightedPlayers?: Player[];
    highlightedIndicators?: Map<Player, MapIndicator>;

    recentlyHitPlayers?: Map<Player, number>;

    constructor(game: Game, socket: Bun.ServerWebSocket<PlayerSocketData> | undefined, position: Vector, layer?: Layer, team?: Team) {
        super(game, position);

        if (layer !== undefined) {
            this.layer = layer;
        }

        if (team) {
            this._team = team;
            this.teamID = team.id;

            team.reassignColorIndexes();
            team.addPlayer(this);
            team.setDirty();
        }

        this.socket = socket;
        const data = socket?.data ?? {} as Partial<PlayerSocketData>;
        this.name = GameConstants.player.defaultName;
        this.ip = data.ip;
        this.role = data.role;
        this.isDev = data.isDev ?? false;
        this.nameColor = data.nameColor ?? 0;
        this.hasColor = data.nameColor !== undefined;

        game.addTimeout(() => {
            if (!this.joined) {
                this.disconnect("JoinPacket not received after 5 seconds");
            }
        }, 5000);

        this.loadout = {
            skin: Loots.fromString("hazel_jumpsuit"),
            emotes: [
                Emotes.fromStringSafe("happy_face"),
                Emotes.fromStringSafe("thumbs_up"),
                Emotes.fromStringSafe("suroi_logo"),
                Emotes.fromStringSafe("sad_face"),
                undefined,
                undefined,
                undefined,
                undefined
            ]
        };

        this.rotation = 0;
        this.joinTime = game.now;
        this._hitbox = Player.baseHitbox.transform(position);

        this.inventory.addOrReplaceWeapon(2, "fists");

        // TODO make a constant for this or something
        this.inventory.scope = "2x_scope";
        this.effectiveScope = "2x_scope";

        // Weapon preset
        if (
            this.isDev
            && data.lobbyClearing
            && data.weaponPreset
            && Config.allowLobbyClearing
        ) {
            const [
                weaponA, weaponB, melee,
                killsA, killB, killsM
            ] = data.weaponPreset.split(" ");

            const backpack = this.inventory.backpack;
            const determinePreset = (
                slot: 0 | 1 | 2,
                weaponName: ReferenceTo<GunDefinition | MeleeDefinition>,
                kills?: string
            ): void => {
                const weaponDef = Loots.fromStringSafe<GunDefinition | MeleeDefinition>(weaponName);
                let defType: DefinitionType;

                if (
                    weaponDef === undefined // no such item
                    || ![DefinitionType.Gun, DefinitionType.Melee].includes(defType = weaponDef.defType) // neither gun nor melee
                    || GameConstants.player.inventorySlotTypings[slot] !== defType // invalid type
                ) return;

                this.inventory.addOrReplaceWeapon(slot, weaponDef);
                const weapon = this.inventory.getWeapon(slot) as GunItem | MeleeItem;

                let killCount: number;
                if (!Number.isNaN(killCount = parseInt(kills ?? "", 10))) {
                    weapon.stats.kills = killCount;
                    weapon.refreshModifiers();
                }

                if (!weapon.isGun) return;

                weapon.ammo = (weaponDef as GunDefinition).capacity;
                const ammoPtr = (weaponDef as GunDefinition).ammoType;
                const ammoType = Ammos.fromString(ammoPtr);

                if (ammoType.ephemeral) return;
                this.inventory.items.setItem(ammoPtr, backpack.maxCapacity[ammoPtr]);
            };

            this.inventory.backpack = Loots.fromString("tactical_pack");
            this.inventory.vest = Loots.fromString("developr_vest");
            this.inventory.helmet = Loots.fromString("tactical_helmet");

            for (const { idString: item } of [...HealingItems, ...Scopes]) {
                this.inventory.items.setItem(item, backpack.maxCapacity[item]);
            }

            this.inventory.scope = "8x_scope";

            for (const scopeDef of Scopes.definitions) {
                this.inventory.items.setItem(scopeDef.idString, 1);
            }

            determinePreset(0, weaponA, killsA);
            determinePreset(1, weaponB, killB);
            determinePreset(2, melee, killsM);
        }

        // good chance that if these were changed, they're meant to be applied
        if (this.maxHealth !== GameConstants.player.defaultHealth) {
            this.health = this.maxHealth;
        }

        if (this.maxAdrenaline !== GameConstants.player.maxAdrenaline) {
            this.adrenaline = this.maxAdrenaline;
        }

        this.dirty.weapons = true;

        this.updateAndApplyModifiers();
    }

    giveGun(idString: ReferenceTo<GunDefinition>): void {
        const primaryItem = this.inventory.getWeapon(this.inventory.appendWeapon(idString)) as GunItem;
        const primaryDefinition = primaryItem.definition;

        primaryItem.ammo = primaryDefinition.capacity;

        if (!Ammos.fromString(primaryDefinition.ammoType).ephemeral) {
            this.inventory.items.setItem(
                primaryDefinition.ammoType,
                this.inventory.backpack.maxCapacity[primaryDefinition.ammoType]
            );
        }
    }

    giveThrowable(idString: ReferenceTo<ThrowableDefinition>, count?: number): void {
        const { inventory } = this;

        inventory.items.incrementItem(idString, count ?? inventory.backpack.maxCapacity[idString]);
        inventory.useItem(idString);

        // biome-ignore lint/style/noNonNullAssertion: we hope `throwableItemMap` is correctly sync'd
        inventory.throwableItemMap.get(idString)!.count = inventory.items.getItem(idString);
    }

    private static readonly _weaponSwapWeights: Partial<Record<DefinitionType, Partial<Record<Tier, number>>>> = {
        [DefinitionType.Gun]: {
            [Tier.S]: 0.15,
            [Tier.A]: 0.2,
            [Tier.B]: 0.5,
            [Tier.C]: 0.818,
            [Tier.D]: 0.182
        },
        [DefinitionType.Melee]: {
            [Tier.S]: 0.125,
            [Tier.A]: 0.5,
            [Tier.B]: 0.4,
            [Tier.C]: 0.4,
            [Tier.D]: 0.2
        },
        [DefinitionType.Throwable]: {
            [Tier.S]: 0.4,
            [Tier.C]: 1,
            [Tier.D]: 0.5
        }
    };

    private static readonly _qualityWeaponSwapWeights: Partial<Record<DefinitionType, Partial<Record<Tier, number>>>> = {
        [DefinitionType.Gun]: {
            [Tier.S]: 0.25,
            [Tier.A]: 0.75
        },
        [DefinitionType.Melee]: {
            [Tier.S]: 0.25,
            [Tier.A]: 0.75
        },
        [DefinitionType.Throwable]: {
            [Tier.S]: 0.8,
            [Tier.C]: 1.5,
            [Tier.D]: 0.25
        }
    };

    private static readonly _weaponTiersCache: Partial<Record<DefinitionType, Partial<Record<Tier, WeaponDefinition[]>>>> = {};

    tryRefund(item: InventoryItem = this.activeItem): void {
        const bulletCount = item.category === DefinitionType.Gun && item.definition.bulletCount ? item.definition.bulletCount : 1;

        if (
            item.category !== DefinitionType.Gun
            || item.owner !== this
            || bulletCount !== 1
            || !this.inventory.weapons.includes(item)
        ) return;

        const { hitReq: hitsNeeded, refund, margin } = PerkData[PerkIds.PrecisionRecycling];

        this.targetHitCountExpiration?.kill();
        this.targetHitCountExpiration = this.game.addTimeout(() => {
            this.bulletTargetHitCount = 0;
        }, margin * item.definition.fireDelay * this.fireRateMod);

        if (this.bulletTargetHitCount < hitsNeeded) {
            ++this.bulletTargetHitCount;
        }

        if (this.bulletTargetHitCount >= hitsNeeded) {
            const cap = this.mapPerk(PerkIds.ExtendedMags, () => item.definition.extendedCapacity) ?? item.definition.capacity;

            const target = Numeric.min(item.ammo + refund, cap);
            if (item.ammo !== target) {
                item.ammo = target;
                this.dirty.weapons = true;
            }

            this.bulletTargetHitCount = 0;
        }
    }

    swapWeaponRandomly(item: InventoryItem = this.activeItem, force = false, modeRestricted?: boolean, weighted?: boolean): void {
        if (item.definition.noSwap || this.hasPerk(PerkIds.Lycanthropy)) return; // womp womp

        let slot = item === this.activeItem
            ? this.activeItemIndex
            : this.inventory.weapons.findIndex(i => i === item);

        // this happens if the item to be swapped isn't currently in the inventory
        // in that case, we just take the first slot matching that item's type
        if (slot === -1) {
            slot = GameConstants.player.inventorySlotTypings.findIndex(slot => slot === item.definition.defType);
        }

        if (slot === -1) {
            serverWarn(`Attempted to swap an item of invalid type ${DefinitionType[item.definition.defType]}`);
            return;
        }

        const allWeapons = this.game.allLoots;

        const spawnable = modeRestricted ? this.game.spawnableLoots : allWeapons;

        const { inventory } = this;
        const { items, backpack: { maxCapacity }, throwableItemMap } = inventory;
        const type = GameConstants.player.inventorySlotTypings[slot];

        // only used if weapon swap is weighted
        const weights = this.hasPerk(PerkIds.PlumpkinBlessing) ? Player._qualityWeaponSwapWeights[type] ?? {} : Player._weaponSwapWeights[type] ?? {};
        const chosenTier = weightedRandom<Tier>(Object.keys(weights).map(s => parseInt(s)), Object.values(weights));
        const cache = Player._weaponTiersCache[type] ??= {};

        const potentials = weighted
            ? cache[chosenTier] ??= spawnable.forType(type).filter(({ tier }) => tier === chosenTier).filter(item => !item.noSwap)
            : spawnable.forType(type).filter(item => !item.noSwap);

        const chosenItem = pickRandomInArray<WeaponDefinition>(
            type === DefinitionType.Throwable
                ? potentials.filter(
                    ({ idString: thr }) => (items.hasItem(thr) ? items.getItem(thr) : 0) < maxCapacity[thr]
                )
                : potentials
        );
        if (chosenItem === undefined) return;

        switch (chosenItem.defType) { // chosenItem.defType === type, but the former helps ts narrow chosenItem's type
            case DefinitionType.Gun: {
                this.action?.cancel();

                const { capacity, ammoType, ammoSpawnAmount, summonAirdrop } = chosenItem;

                // Give the player ammo for the new gun if they do not have any ammo for it.
                if (!items.hasItem(ammoType) && !summonAirdrop) {
                    items.setItem(ammoType, Numeric.min(ammoSpawnAmount, maxCapacity[ammoType]));
                    this.dirty.items = true;
                }

                inventory.replaceWeapon(slot, chosenItem, force);
                const item = this.inventory.getWeapon(slot) as GunItem;
                item.ammo = capacity;
                item.lastUse = item.switchDate = this.lastFreeSwitch = this.game.now;
                this.effectiveSwitchDelay = 500;
                break;
            }

            case DefinitionType.Melee: {
                inventory.replaceWeapon(slot, chosenItem, force);
                break;
            }

            case DefinitionType.Throwable: {
                const { idString } = chosenItem;

                const count = items.hasItem(idString) ? items.getItem(idString) : 0;
                const max = chosenItem.maxSwapCount ?? maxCapacity[idString];

                const toAdd = Numeric.min(max - count, 3);
                // toAdd is greater than 0

                const newCount = Numeric.clamp(
                    count + toAdd,
                    0, max
                );

                items.setItem(
                    idString,
                    newCount
                );

                const item = throwableItemMap.getAndGetDefaultIfAbsent(
                    idString,
                    () => new ThrowableItem(chosenItem, this, undefined, newCount)
                );

                item.count = newCount;

                const slot = inventory.slotsByDefType[DefinitionType.Throwable]?.[0];

                if (slot !== undefined && !inventory.hasWeapon(slot)) {
                    inventory.replaceWeapon(slot, item, force);
                }

                this.dirty.weapons = true;
                this.dirty.items = true;
                break;
            }
        }

        this.sendEmote(Emotes.fromStringSafe(chosenItem.idString), true);
    }

    fillInventory(max = false): void {
        const { inventory } = this;

        inventory.scope = "4x_scope";
        inventory.backpack = max
            ? Array.from(Backpacks).sort(({ level: lvlA }, { level: lvlB }) => lvlB - lvlA)[0]
            : pickRandomInArray(Backpacks.definitions);

        this.inventory.vest = max
            ? Array.from(Armors).filter(({ armorType }) => armorType === ArmorType.Vest).sort(({ level: lvlA }, { level: lvlB }) => lvlB - lvlA)[0]
            : Math.random() > 0.9
                ? undefined
                : pickRandomInArray(Armors.definitions.filter(({ armorType }) => armorType === ArmorType.Vest));

        this.inventory.helmet = max
            ? Array.from(Armors).filter(({ armorType }) => armorType === ArmorType.Helmet).sort(({ level: lvlA }, { level: lvlB }) => lvlB - lvlA)[0]
            : Math.random() > 0.9
                ? undefined
                : pickRandomInArray(Armors.definitions.filter(({ armorType }) => armorType === ArmorType.Helmet));

        const { items } = inventory;

        items.setItem("2x_scope", 1);
        items.setItem("4x_scope", 1);
        items.setItem("8x_scope", 1);
        items.setItem("16x_scope", 1);

        Throwables.definitions.forEach(({ idString }) => this.giveThrowable(idString));

        for (const [item, maxCapacity] of Object.entries(inventory.backpack.maxCapacity)) {
            items.setItem(item, maxCapacity);

            if (inventory.throwableItemMap.has(item)) {
                // biome-ignore lint/style/noNonNullAssertion: we hope `throwableItemMap` is correctly sync'd
                inventory.throwableItemMap.get(item)!.count = maxCapacity;
            }
        }

        this.giveGun(pickRandomInArray(Guns.definitions).idString);
        this.giveGun(pickRandomInArray(Guns.definitions).idString);
        this.inventory.addOrReplaceWeapon(2, pickRandomInArray(Melees.definitions));
    }

    spawnPos(position: Vector): void {
        this.spawnPosition = position;
    }

    emoteRateLimit(): boolean {
        if (this.blockEmoting) return true;

        this.emoteCount++;

        // After constantly spamming more than 5 emotes, block for 5 seconds.
        if (this.emoteCount > GameConstants.player.rateLimitPunishmentTrigger) {
            this.blockEmoting = true;
            this.setDirty();
            this.game.addTimeout(() => {
                this.blockEmoting = false;
                this.setDirty();
                this.emoteCount = 0;
            }, GameConstants.player.emotePunishmentTime);
            return true;
        }

        return false;
    }

    /**
     * @param isFromServer If the emoji should skip checking if the player has that emoji in their emoji wheel
     */
    sendEmote(source?: EmoteDefinition, isFromServer = false): void {
        if (this.emoteRateLimit() || !source) return;

        const indexOf = this.loadout.emotes.indexOf(source);
        if (!isFromServer && (indexOf < 0 || indexOf > 5)) return;

        if (this.game.pluginManager.emit("player_will_emote", { player: this, emote: source })) return;

        this.game.emotes.push(new Emote(source, this));

        this.game.pluginManager.emit("player_did_emote", {
            player: this,
            emote: source
        });
    }

    sendMapPing(ping: PlayerPing, position: Vector): void {
        if (this.emoteRateLimit() || !ping.isPlayerPing) return;

        if (
            this.game.pluginManager.emit("player_will_map_ping", {
                player: this,
                ping,
                position
            })
        ) return;

        if (this._team) {
            for (const player of this._team.players) {
                /*
                    FIXME i have no idea why this is here but i'm leaving it alone
                          someone please check if this is redundant
                */
                if (!player) continue;

                player._mapPings.push({
                    definition: ping,
                    position,
                    playerId: this.id
                });
            }

            return;
        }

        this._mapPings.push({
            definition: ping,
            position,
            playerId: this.id
        });

        this.game.pluginManager.emit("player_did_map_ping", {
            player: this,
            ping,
            position
        });
    }

    update(): void {
        const dt = this.game.dt;

        // Building & smoke checks
        let isInsideBuilding = false;
        let scopeTarget: ReifiableDef<ScopeDefinition> | undefined;
        const syncedParticles = new Set<SyncedParticle>();
        for (const object of this.nearObjects) {
            if (
                !isInsideBuilding
                && object?.isBuilding
                && (!object.dead || (object.dead && object.definition.hasDamagedCeiling))
                && object.scopeHitbox?.collidesWith(this._hitbox)
                && !Config.disableBuildingCheck
            ) {
                isInsideBuilding = true;
                scopeTarget ??= object.definition.ceilingScope;

                if (object.definition.ceilingInfectionUnits) this.infection += object.definition.ceilingInfectionUnits;
            } else if (
                object.isSyncedParticle
                && object.hitbox?.collidesWith(this._hitbox)
                && adjacentOrEqualLayer(object.layer, this.layer)
            ) {
                syncedParticles.add(object);
            }
        }
        this.isInsideBuilding = isInsideBuilding;

        // Recoil
        const recoilMultiplier = this.recoil.active && (this.recoil.active = (this.recoil.time >= this.game.now))
            ? this.recoil.multiplier
            : 1;

        // Speed multiplier for perks
        const perkSpeedMod
            = this.mapPerkOrDefault(
                PerkIds.AdvancedAthletics,
                ({ waterSpeedMod, smokeSpeedMod }) => {
                    let inSmoke = false;
                    for (const particle of syncedParticles) {
                        if (!particle.creatorID) {
                            inSmoke = true;
                            break;
                        }
                    }

                    return (
                        (FloorTypes[this.floor].overlay ? waterSpeedMod : 1) // man do we need a better way of detecting water lol
                        * (syncedParticles.size !== 0 && inSmoke ? smokeSpeedMod : 1)
                    );
                },
                1
            )
            * this.mapPerkOrDefault(
                PerkIds.Claustrophobic,
                ({ speedMod }) => isInsideBuilding ? speedMod : 1,
                1
            );

        const adrenSpeedMod = (() => {
            /*
                The relation between speed and adrenaline is modelled around these three points:

                adren. | speed multiplier
                -------|---------------
                   0   |       1
                  30   |     1.10
                  100  |     1.15

                Using a logarithmic regression model, we obtain:

                a = 0.944297822457
                b = -0.0158132859327
                c = 0.699999999995
                d = 3.51269916486

                y = b•log[c](x + d) + a

                or, using the change of base law,
                y = b•log(x + d) / log(c) + a

                https://www.desmos.com/calculator/sgimzzda0b
            */
            const a = 0.944297822457;
            const b = -0.0158132859327;
            const c = 0.699999999995;
            const d = 3.51269916486;

            return b * Math.log(this._adrenaline + d) / Math.log(c) + a;
        })();

        // Calculate speed
        const speed = this.baseSpeed                                                 // Base speed
            * (FloorTypes[this.floor].speedMultiplier ?? 1)                          // Speed multiplier from floor player is standing in
            * recoilMultiplier                                                       // Recoil from items
            * perkSpeedMod                                                           // See above
            * (this.action?.speedMultiplier ?? 1)                                    // Speed modifier from performing actions
            * adrenSpeedMod                                                          // Speed boost from adrenaline
            * (this.downed ? 0.5 : (this.activeItemDefinition.speedMultiplier ?? 1)) // Active item/knocked out speed modifier
            * (this.beingRevivedBy ? 0.5 : 1)                                        // Being revived speed multiplier
            * this.effectSpeedMultiplier                                             // Effect speed multiplier (currently only used for vaccinator slowdown)
            * this._modifiers.baseSpeed;                                             // Current on-wearer modifier

        // Calculate movement
        let movement: Vector;

        const playerMovement = this.movement;
        if (this.isMobile && playerMovement.moving) {
            movement = Vec.fromPolar(playerMovement.angle);
        } else {
            let x = +playerMovement.right - +playerMovement.left;
            let y = +playerMovement.down - +playerMovement.up;

            if (x * y !== 0) {
                // If the product is non-zero, then both of the components must be non-zero
                x *= Math.SQRT1_2;
                y *= Math.SQRT1_2;
            }

            movement = Vec(x, y);
        }

        // el reversio
        if (this.hasPerk(PerkIds.AchingKnees) && this.reversedMovement) {
            movement.x = -movement.x;
            movement.y = -movement.y;
        }

        // Update position
        const oldPosition = Vec.clone(this.position);
        this._movementVector = Vec.scale(movement, speed);

        this.position = Vec.add(
            this.position,
            Vec.scale(this.movementVector, dt)
        );

        // Find and resolve collisions
        this.nearObjects = this.game.grid.intersectsHitbox(this._hitbox, this.layer);

        for (let step = 0; step < 10; step++) {
            let collided = false;

            for (const potential of this.nearObjects) {
                const { isObstacle, isBuilding } = potential;

                if (
                    (isObstacle || isBuilding)
                    && this.mapPerkOrDefault(
                        PerkIds.AdvancedAthletics,
                        () => {
                            return potential.definition.material !== "tree"
                                && (
                                    !isObstacle
                                    || !potential.definition.isWindow
                                    || !potential.dead
                                );
                        },
                        true
                    )
                    && potential.collidable
                    && potential.hitbox?.collidesWith(this._hitbox)
                ) {
                    if (isObstacle && potential.definition.isStair) {
                        const oldLayer = this.layer;
                        potential.handleStairInteraction(this);
                        if (this.layer !== oldLayer) this.setDirty();
                        this.activeStair = potential;
                    } else {
                        collided = true;
                        this._hitbox.resolveCollision(potential.hitbox);

                        if (isObstacle && potential.activated && potential.definition.damage) {
                            this.damage({
                                amount: potential.definition.damage,
                                source: DamageSources.Obstacle,
                                weaponUsed: potential
                            });
                        }
                    }
                }
            }

            if (!collided) break;
        }

        // Clamp position to world boundaries
        this.position.x = Numeric.clamp(this.position.x, this._hitbox.radius, this.game.map.width - this._hitbox.radius);
        this.position.y = Numeric.clamp(this.position.y, this._hitbox.radius, this.game.map.height - this._hitbox.radius);

        this.isMoving = !Vec.equals(oldPosition, this.position);
        if (this.isMoving) {
            this.game.grid.updateObject(this);
            this.floor = this.game.map.terrain.getFloor(this.position, this.layer);
            this.mapIndicator?.updatePosition(this.position);
        }

        if (this.isMoving || this.turning) {
            this.disableInvulnerability();
            this.setPartialDirty();
        }

        this.turning = false;

        // Health regen
        let toRegen = this._modifiers.hpRegen;
        if (this._adrenaline >= 0) {
            /*
                The relation between healing and adrenaline is modelled around these three points:

                adren. | healing (hp/s)
                -------|---------------
                   0   |       1
                  30   |     1.875
                  100  |      2.75

                Using a logarithmic regression model, we obtain:

                a = -2.2153107223876285
                b = -1.9660534157593246
                c = 0.14899999980029943
                d = 22.5

                y = b•log[c](x + d) + a

                or, using the change of base law,
                y = b•log(x + d) / log(c) + a

                https://www.desmos.com/calculator/idwbtpnzbv
            */

            const a = -2.2153107223876285;
            const b = -1.9660534157593246;
            const c = 0.14899999980029943;
            const d = 22.5;
            const adrenRegen = b * Math.log(this._adrenaline + d) / Math.log(c) + a;

            // Regenerate health
            toRegen += adrenRegen * this.mapPerkOrDefault(
                PerkIds.LacedStimulants,
                ({ healDmgRate, lowerHpLimit }) => (this.adrenaline <= 0 ? 0 : this.health <= lowerHpLimit ? 1 : -healDmgRate),
                this.adrenaline > 0 && !this.downed ? 1 : 0
            );

            // Drain adrenaline
            this.adrenaline -= 0.0005 * this._modifiers.adrenDrain * dt;
        }
        this.health += dt / 1000 * toRegen;

        // Shield regen
        if (this.hasBubble) {
            const _toRegen = this._modifiers.shieldRegen;
            this.shield += dt / 1000 * _toRegen;
        }

        // Infection regen
        if (this.hasPerk(PerkIds.Infected)) {
            this.infection += dt / 1000;
        }

        // Shoot gun/use item
        if (this.startedAttacking && this.game.pluginManager.emit("player_start_attacking", this) === undefined) {
            this.startedAttacking = false;
            this.disableInvulnerability();
            this.activeItem.useItem();
        }
        if (this.stoppedAttacking && this.game.pluginManager.emit("player_stop_attacking", this) === undefined) {
            this.stoppedAttacking = false;
            this.activeItem.stopUse();
        }

        // Gas damage
        const gas = this.game.gas;
        const now = Date.now();
        const applyScaleDamageFactor = (now - this.timeWhenLastOutsideOfGas) >= 10000;
        if (gas.doDamage && gas.isInGas(this.position)) {
            this.piercingDamage({
                amount: gas.scaledDamage(this.position) + (applyScaleDamageFactor ? (gas.getDef().scaleDamageFactor ?? 0) + this.additionalGasDamage : 0),
                source: DamageSources.Gas
            });
            if (applyScaleDamageFactor) {
                this.additionalGasDamage = this.additionalGasDamage + (gas.getDef().scaleDamageFactor ?? 0);
            }
        } else if (!gas.isInGas(this.position)) {
            this.timeWhenLastOutsideOfGas = now;
            this.additionalGasDamage = 0;
        }

        // Knocked out damage
        if (this.downed && !this.beingRevivedBy) {
            this.piercingDamage({
                amount: GameConstants.player.bleedOutDPMs * dt,
                source: DamageSources.BleedOut
            });
        }

        // Cancel reviving when out of range
        if (this.action instanceof ReviveAction) {
            if (
                Vec.squaredLen(
                    Vec.sub(
                        this.position,
                        this.action.target.position
                    )
                ) >= 7 ** 2
            ) {
                this.action.cancel();
            }
        }

        // Smoke effects
        for (const syncedParticle of syncedParticles) {
            const def = syncedParticle.definition;
            const depletion = def.depletePerMs;

            const { snapScopeTo, scopeOutPreMs = 0 } = def as SyncedParticleDefinition & { readonly hitbox: Hitbox };
            // If lifetime - age > scope out time, we have the potential to zoom in the scope
            if (
                snapScopeTo
                && syncedParticle._lifetime - (this.game.now - syncedParticle._creationDate) >= scopeOutPreMs
            ) {
                scopeTarget ??= snapScopeTo;
            }

            // TODO if this is ever used, make a new damage type; gas is misleading
            if (depletion?.health) {
                this.piercingDamage({
                    amount: depletion.health * dt,
                    source: DamageSources.Gas
                });
            }

            if (depletion?.adrenaline) {
                this.adrenaline -= depletion.adrenaline * dt;
            }
        }

        // Set scope
        if (this.downed || (isInsideBuilding && !scopeTarget)) {
            scopeTarget = DEFAULT_SCOPE;
        }
        this.effectiveScope = scopeTarget ?? this.inventory.scope;

        // Rate limit team pings & emotes
        if (this.emoteCount > 0 && !this.blockEmoting && (this.game.now - this.lastRateLimitUpdate > GameConstants.player.rateLimitInterval)) {
            this.emoteCount--;
            this.lastRateLimitUpdate = this.game.now;
        }

        // Update perks
        if (this.perkUpdateMap !== undefined) {
            for (const [perk, lastUpdated] of this.perkUpdateMap.entries()) {

                // this.updatePerk(perk);

                if (this.game.now - lastUpdated <= (perk.updateInterval ?? 1000)) continue;

                this.perkUpdateMap.set(perk, this.game.now);

                // if (this.updatedPerks.includes(perk)) {
                //     removeFrom(this.updatedPerks, perk);
                //     this.dirty.updatedPerks = true;
                // }

                // ! evil starts here
                switch (perk.idString) {
                    case PerkIds.Bloodthirst: {
                        this.piercingDamage({
                            amount: perk.healthLoss,
                            source: DamageSources.BleedOut
                        });
                        break;
                    }
                    case PerkIds.BabyPlumpkinPie: {
                        this.swapWeaponRandomly(undefined, true);
                        break;
                    }
                    case PerkIds.TornPockets: {
                        const items = this.inventory.items;
                        const candidates = new Set(Ammos.definitions.filter(({ ephemeral }) => !ephemeral).map(({ idString }) => idString));

                        const counts = Object.entries(items.asRecord()).filter(
                            ([str, count]) => Ammos.hasString(str) && candidates.has(str) && count !== 0
                        );

                        // no ammo at all
                        if (counts.length === 0) break;

                        const chosenAmmo = Ammos.fromString(
                            weightedRandom(
                                counts.map(([str]) => str),
                                counts.map(([, cnt]) => cnt)
                            )
                        );

                        const amountToDrop = Numeric.min(
                            this.inventory.items.getItem(chosenAmmo.idString),
                            perk.dropCount
                        );

                        this.game.addLoot(chosenAmmo, this.position, this.layer, { count: amountToDrop })
                            ?.push(this.rotation + Math.PI, 0.025);
                        items.decrementItem(chosenAmmo.idString, amountToDrop);
                        this.dirty.items = true;
                        break;
                    }
                    case PerkIds.RottenPlumpkin: {
                        this.sendEmote(Emotes.fromStringSafe(perk.emote), true);
                        this.piercingDamage({
                            amount: perk.healthLoss,
                            source: DamageSources.BleedOut
                        });
                        this.adrenaline -= this.adrenaline * (perk.adrenLoss / 100);
                        const decal = this.game.addDecal(
                            this.floor === FloorNames.Water ? perk.decals.water : perk.decals.ground, // todo: add a `isWater` boolean on decals instead of using a seperate def, I couldn't figure it out without breaking the decals
                            this.position,
                            this.rotation,
                            this.layer
                        );
                        this.game.addTimeout(() => this.game.grid.removeObject(decal), perk.decalFadeTime);
                        break;
                    }
                    case PerkIds.Shrouded: {
                        this.game.addSyncedParticle(
                            "shrouded_particle",
                            this.position,
                            randomPointInsideCircle(this.position, 5),
                            this.layer,
                            this.id
                        );
                        break;
                    }
                    case PerkIds.Necrosis: {
                        // 1) Bleed health slowly*
                        if (this.health > perk.minHealth) {
                            this.health = Numeric.max(this.health - perk.dps, perk.minHealth);
                        }

                        // 2) Infect nearby players
                        const detectionHitbox = new CircleHitbox(perk.infectionRadius, this.position);
                        for (const player of this.game.grid.intersectsHitbox(detectionHitbox)) {
                            if (
                                !player.isPlayer
                                || !player.hitbox.collidesWith(detectionHitbox)
                                || player.hasPerk(PerkIds.Immunity)
                                || !adjacentOrEqualLayer(this.layer, player.layer)
                                || player.dead
                            ) continue;
                            player.infection += perk.infectionUnits;
                        }
                        break;
                    }
                    case PerkIds.Infected: {
                        // 1) Bleed health slowly* ^
                        // 2) Infect nearby players
                        // Used by Necrosis, a perk that does not display in HUD.

                        // 3) Random perk swap, without removing the perk itself
                        const allowedPerks = Perks.definitions.filter(perk => perk.category !== PerkCategories.Infection && !perk.infectedEffectIgnore),
                            perkToRemove = this.perks.find(perk => perk.category !== PerkCategories.Infection && !perk.infectedEffectIgnore),
                            randomPerk = pickRandomInArray(allowedPerks);

                        if (perkToRemove !== undefined) this.removePerk(perkToRemove);
                        this.addPerk(randomPerk);
                        break;
                    }
                    case PerkIds.AchingKnees: {
                        this.reversedMovement = !this.reversedMovement;
                        break;
                    }
                }
                // ! evil ends here
            }

        }

        // Update Thermal Goggles & Hollow Points perks
        // TODO this is dogshit there's gotta be a cleaner way to do this
        const hasThermalGoggles = this.hasPerk(PerkIds.ThermalGoggles);
        const hasHollowPoints = this.hasPerk(PerkIds.HollowPoints);
        if (hasThermalGoggles || hasHollowPoints) {
            let indicatedPlayers;

            if (hasThermalGoggles) {
                const detectionHitbox = new CircleHitbox(PerkData[PerkIds.ThermalGoggles].detectionRadius, this.position);
                indicatedPlayers = [];
                this.highlightedPlayers = [];
                const alreadyHighlighted: PerkDefinition[] = [
                    PerkData[PerkIds.ThermalGoggles],
                    PerkData[PerkIds.ExperimentalForcefield],
                    PerkData[PerkIds.HollowPoints]
                ];

                for (const player of this.game.grid.intersectsHitbox(detectionHitbox)) {
                    if (
                        !player.isPlayer
                        || player === this
                        || player.dead
                        || this.isSameTeam(player)
                        || !player.hitbox.collidesWith(detectionHitbox)
                    ) continue;

                    if (this.visibleObjects.has(player)) {
                        this.highlightedPlayers.push(player);
                    }

                    if (player.perks.some(perk => alreadyHighlighted.includes(perk))) continue;

                    indicatedPlayers.push(player);

                    const indicator = this.highlightedIndicators?.get(player);
                    if (indicator) {
                        indicator.updatePosition(player.position);
                    } else {
                        (this.highlightedIndicators ??= new Map<Player, MapIndicator>())
                            .set(player, new MapIndicator(this.game, "player_indicator", player.position));
                    }
                }

                this.dirty.highlightedPlayers = true; // TODO determine if the list of highlighted players actually changed
            }

            for (const [player, indicator] of this.highlightedIndicators ?? []) {
                const lastHitTime = this.recentlyHitPlayers?.get(player);
                if (lastHitTime !== undefined) {
                    if (this.game.now - lastHitTime < PerkData[PerkIds.HollowPoints].highlightDuration) {
                        indicator.updatePosition(player.position);
                        continue;
                    }
                    this.recentlyHitPlayers?.delete(player);
                }

                if (indicatedPlayers?.includes(player)) continue;

                if (indicator.dead) {
                    this.game.mapIndicatorIDAllocator.give(indicator.id);
                    this.highlightedIndicators?.delete(player);
                }
                indicator.dead = true;
            }
        }

        if (this.hasPerk(PerkIds.EternalMagnetism)) {
            const perk = PerkData[PerkIds.EternalMagnetism];
            const detectionHitbox = new CircleHitbox(perk.radius, this.position);

            let hasMagneticField = false; // flag
            for (const object of this.game.grid.intersectsHitbox(detectionHitbox)) {
                if (
                    (!object.isPlayer && !object.isLoot)
                    || !adjacentOrEqualLayer(this.layer, object.layer)
                    || (object.isPlayer && (object.id === this.id || this.isSameTeam(object)))
                ) continue;

                // Player
                if (object.isPlayer) {
                    const canDamage = object.health > perk.minHealth && this.health < this.maxHealth;
                    const collision = object.hitbox.collidesWith(detectionHitbox) && canDamage;

                    // Fake infected effect for aura on the player object, indicating it's affected by the field.
                    if (object.infected !== collision) {
                        object.infected = collision;
                        object.setDirty();
                    }

                    if (object.health > perk.minHealth && collision) {
                        const depl = perk.depletion;
                        object.health = Numeric.max(object.health - depl, perk.minHealth);
                        this.health = Numeric.max(this.health + depl, perk.minHealth);
                        hasMagneticField = true;
                    }
                }

                // Loot
                if (object.isLoot && object.hitbox.collidesWith(detectionHitbox)) {
                    const direction = Vec.sub(this.position, object.position),
                          normalizedDir = Vec.normalize(direction);

                    object.push(Math.atan2(normalizedDir.y, normalizedDir.x), perk.lootPush);
                    hasMagneticField = true;
                }
            }

            // Field/Aura
            if (hasMagneticField !== this.hasMagneticField) {
                this.hasMagneticField = hasMagneticField;
                this.setDirty();
            }
        }

        // Update stuck projectiles (currently only seedshot seeds)
        if (this.stuckProjectiles) {
            for (const [proj, angle] of this.stuckProjectiles) {
                if (proj.detonated || proj.dead) {
                    this.stuckProjectiles.delete(proj);
                    continue;
                }
                const finalAngle = Angle.normalize(this.rotation + angle);
                proj.position = Vec.add(this.position, Vec.fromPolar(finalAngle, this.sizeMod * GameConstants.player.radius * 1.2));
                proj.rotation = finalAngle;
                proj.setPartialDirty();
            }
        }

        // Update automatic doors
        const openedDoors: Obstacle[] = [];
        const unopenedDoors: Obstacle[] = [];

        for (const door of this.game.grid.intersectsHitbox(new CircleHitbox(10, this.position), this.layer)) {
            if (
                door.dead
                || !door?.isObstacle
                || !door.definition.isDoor
                || !door.definition.automatic
                || door.door?.isOpen
                || !isInsideBuilding // womp womp
            ) continue;

            if (Geometry.distanceSquared(door.position, this.position) > 100) {
                unopenedDoors.push(door);
                continue;
            }

            door.interact();
            openedDoors.push(door);
        }

        for (const door of unopenedDoors) {
            if (openedDoors.every(d => Geometry.distanceSquared(door.position, d.position) > 300)) continue; // Don't open the door if there are no other open doors in range

            door.interact();
            openedDoors.push(door);
        }

        const closeDoors = (): void => {
            if (openedDoors.every(obj => Geometry.distanceSquared(obj.position, this.position) >= 100)) {
                for (const door of openedDoors) {
                    if (!door.dead) door.interact();
                }
            } else {
                this.game.addTimeout(closeDoors, 1000);
            }
        };
        this.game.addTimeout(closeDoors, 1000);

        this.game.pluginManager.emit("player_update", this);
    }

    private _firstPacket = true;

    private readonly _packetStream = new PacketStream(new SuroiByteStream(new ArrayBuffer(1 << 16)));

    /**
     * Calculate visible objects, check team, and send packets
     */
    secondUpdate(): void {
        const packet = UpdatePacket.create();

        const player = this.spectating ?? this;
        const game = this.game;

        const fullObjects = new Set<BaseGameObject>();

        // Calculate visible objects
        this.ticksSinceLastUpdate++;
        if (this.ticksSinceLastUpdate > 8 || game.updateObjects || this.updateObjects) {
            this.ticksSinceLastUpdate = 0;
            this.updateObjects = false;

            const dim = player.effectiveScope.zoomLevel * 2 + 8;
            this.screenHitbox = RectangleHitbox.fromRect(dim, dim, player.position);

            const newVisibleObjects = game.grid.intersectsHitbox(this.screenHitbox);

            packet.deletedObjects = [];
            for (const object of this.visibleObjects) {
                if (newVisibleObjects.has(object)) continue;

                this.visibleObjects.delete(object);
                packet.deletedObjects.push(object.id);
            }

            for (const object of newVisibleObjects) {
                if (this.visibleObjects.has(object)) continue;

                this.visibleObjects.add(object);
                fullObjects.add(object);
            }
        }

        for (const object of game.fullDirtyObjects) {
            if (!this.visibleObjects.has(object as GameObject)) continue;
            fullObjects.add(object);
        }

        packet.fullObjectsCache = fullObjects;

        packet.partialObjectsCache = [];
        for (const object of game.partialDirtyObjects) {
            if (!this.visibleObjects.has(object as GameObject) || fullObjects.has(object)) continue;
            packet.partialObjectsCache.push(object);
        }

        const inventory = player.inventory;
        let forceInclude = false;

        if (this.startedSpectating && this.spectating) {
            forceInclude = true;
            this.startedSpectating = false;
        }

        const playerData: PlayerData = packet.playerData = {
            pingSeq: this._pingSeq,
            blockEmoting: player.blockEmoting
        };

        if (player.dirty.maxMinStats || forceInclude) {
            playerData.minMax = {
                maxHealth: player._maxHealth,
                minAdrenaline: player._minAdrenaline,
                maxAdrenaline: player._maxAdrenaline
            };
        }

        if (player.dirty.health || forceInclude) {
            playerData.health = player._normalizedHealth;
        }

        if (player.dirty.adrenaline || forceInclude) {
            playerData.adrenaline = player._normalizedAdrenaline;
        }

        if (player.dirty.shield || forceInclude) {
            playerData.shield = player._normalizedShield;
        }

        if (player.dirty.infection || forceInclude) {
            playerData.infection = player._normalizedInfection;
        }

        if (player.dirty.zoom || forceInclude) {
            playerData.zoom = player._scope.zoomLevel;
        }

        if (player.dirty.id || forceInclude) {
            playerData.id = {
                id: player.id,
                spectating: this.spectating !== undefined
            };
        }

        if ((player.dirty.teammates || forceInclude) && player._team) {
            playerData.teammates = player._team.players as Player[];
        }

        if (player.dirty.highlightedPlayers || forceInclude) {
            playerData.highlightedPlayers = this.highlightedPlayers;
        }

        if (player.dirty.weapons || forceInclude) {
            playerData.inventory = {
                activeWeaponIndex: inventory.activeWeaponIndex,
                weapons: inventory.weapons.map(slot => {
                    const item = slot;

                    return (item && {
                        definition: item.definition,
                        count: item.isGun
                            ? item.ammo
                            : item instanceof CountableInventoryItem
                                ? item.count
                                : undefined,
                        stats: item.stats
                    }) satisfies ((PlayerData["inventory"] & object)["weapons"] & object)[number];
                })
            };
        }

        if (player.dirty.slotLocks || forceInclude) {
            playerData.lockedSlots = player.inventory.lockedSlots;
        }

        if (player.dirty.items || forceInclude) {
            playerData.items = {
                items: inventory.items.asRecord(),
                scope: inventory.scope
            };
        }

        if (player.dirty.layer || forceInclude) {
            playerData.layer = player.layer;
        }

        if (player.dirty.activeC4s || forceInclude) {
            playerData.activeC4s = this.c4s.size > 0;
        }

        if (player.dirty.perks || forceInclude) {
            playerData.perks = player.perks;
        }

        // if (player.dirty.updatedPerks || forceInclude) {
        //     playerData.updatedPerks = player.updatedPerks;
        // }

        if (player.dirty.teamID || forceInclude) {
            playerData.teamID = player.teamID;
        }

        // Cull bullets
        /*
            oversight: this works by checking if the bullet's trajectory overlaps the player's
                       viewing port; if it does, the player will eventually see the bullet,
                       and we should thus send it. however, it overlooks the fact that the
                       viewing port can move as the bullet travels. this causes a potential
                       for ghost bullets, but since most projectiles travel their range within
                       well under a second (usually between 0.3–0.8 seconds), the chance of this
                       happening is quite low (except with slow-projectile weapons like the radio
                       and firework launcher).

                       fixing this is therefore not worth the performance penalty
        */
        packet.bullets = [];
        for (const bullet of game.newBullets) {
            if (!Collision.lineIntersectsRectTest(
                bullet.initialPosition,
                bullet.finalPosition,
                this.screenHitbox.min,
                this.screenHitbox.max
            )) continue;
            packet.bullets.push(bullet);
        }

        // Cull explosions
        packet.explosions = [];
        for (const explosion of game.explosions) {
            if (
                !this.screenHitbox.isPointInside(explosion.position)
                || Geometry.distanceSquared(explosion.position, this.position) > GameConstants.explosionMaxDistSquared
            ) continue;
            packet.explosions.push(explosion);
        }

        // Emotes
        packet.emotes = [];
        for (const emote of game.emotes) {
            if (!this.visibleObjects.has(emote.player)) continue;
            packet.emotes.push(emote);
        }

        // Gas
        const gas = game.gas;
        if (gas.dirty || this._firstPacket) {
            packet.gas = gas;
        }
        if (gas.completionRatioDirty || this._firstPacket) {
            packet.gasProgress = gas.completionRatio;
        }

        const newPlayers = this._firstPacket
            ? game.grid.pool.getCategory(ObjectCategory.Player)
            : game.newPlayers;

        // New/deleted players
        packet.newPlayers = [];
        for (const newPlayer of newPlayers) {
            const { id, teamID, name, hasColor, nameColor, loadout: { badge } } = newPlayer;

            packet.newPlayers.push({
                id,
                name,
                hasColor,
                nameColor: hasColor ? nameColor : undefined,
                badge
            } as (UpdateDataCommon["newPlayers"] & object)[number]);

            // Add new teammates to full objects
            if (!this.game.isTeamMode || teamID !== player.teamID) continue;
            fullObjects.add(newPlayer);
        }
        packet.deletedPlayers = game.deletedPlayers;

        if (game.aliveCountDirty || this._firstPacket) {
            packet.aliveCount = game.aliveCount;
        }

        packet.planes = game.planes;

        packet.mapPings = [...game.mapPings, ...this._mapPings];
        this._mapPings.length = 0;

        const indicators = [...game.mapIndicators, ...(this.highlightedIndicators?.values() ?? [])];
        packet.mapIndicators = this._firstPacket
            ? indicators.map(indicator => ({ ...indicator, positionDirty: true, definitionDirty: true }))
            : indicators.filter(indicator => indicator.positionDirty || indicator.definitionDirty || indicator.dead);

        if (game.killLeaderDirty || this._firstPacket) {
            packet.killLeader = {
                id: game.killLeader?.id ?? -1,
                kills: game.killLeader?.kills ?? 0
            };
        }

        // serialize and send update packet
        this.sendPacket(packet as unknown as MutablePacketDataIn);

        this._firstPacket = false;

        this._packetStream.stream.index = 0;
        for (const packet of this._packets) {
            this._packetStream.serialize(packet);
        }

        for (const packet of this.game.packets) {
            this._packetStream.serialize(packet);
        }

        this._packets.length = 0;
        this.sendData(this._packetStream.getBuffer());
    }

    /**
     * Clean up internal state after all packets have been sent
     * to all recipients. The only code that should be present here
     * is clean up code that cannot be in `secondUpdate` because packets
     * depend on it
     */
    postPacket(): void {
        for (const key in this.dirty) {
            this.dirty[key as keyof Player["dirty"]] = false;
        }
        this._animation.dirty = false;
        this._action.dirty = false;
    }

    /**
     * @param player
     * @returns true if the player is on the same team with the given player.
     */
    isSameTeam(player: Player): boolean {
        return this.game.isTeamMode && player.teamID === this.teamID;
    }

    // updatePerk(perk: ReifiableDef<PerkDefinition>): void {
    //     const perkDef = Perks.reify(perk);

    //     if (!this.updatedPerks.includes(perkDef)) {
    //         this.updatedPerks.push(perkDef);
    //         this.dirty.updatedPerks = true;
    //     }
    // }

    addPerk(perk: ReifiableDef<PerkDefinition>): void {
        const perkDef = Perks.reify(perk);
        if (this.perks.includes(perkDef)) return;

        this.perks.push(perkDef);

        if ("updateInterval" in perkDef) {
            (this.perkUpdateMap ??= new Map<PerkDefinition, number>())
                .set(perkDef, this.game.now);

           // this.updatePerk(perkDef);
        }

        if (this.hasPerk(PerkIds.HollowPoints) && this.hasPerk(PerkIds.ExperimentalForcefield) && this.hasPerk(PerkIds.ThermalGoggles)) {
            this.addPerk(PerkIds.Overdrive);
        }

        // easter egg
        if (this.hasPerk(PerkIds.CombatExpert) && this.hasPerk(PerkIds.Butterfingers)) {
            this.removePerk(PerkIds.CombatExpert);
            this.removePerk(PerkIds.Butterfingers);
            this.game.addExplosion("corrupted_explosion", this.position, this, this.layer);
        }

        // ! evil starts here
        // some perks need to perform setup when added
        switch (perkDef.idString) {
            case PerkIds.PlumpkinGamble: { // AW DANG IT
                this.removePerk(perk);

                const halloweenPerks = Perks.definitions.filter(perkDef =>
                    !perkDef.plumpkinGambleIgnore && perkDef.category === PerkCategories.Halloween
                );

                this.addPerk(pickRandomInArray(halloweenPerks));
                break;
            }
            case PerkIds.PlumpkinShuffle: { // LMAo rip ur items blud
                this.removePerk(perk);
                this.action?.cancel();

                const vests = Armors.definitions.filter(armor => armor.armorType === ArmorType.Vest && !armor.noDrop && !armor.perk),
                      helmets = Armors.definitions.filter(armor => armor.armorType === ArmorType.Helmet && !armor.noDrop && !armor.perk),
                      backpacks = Backpacks.definitions.filter(backpack => !backpack.perk),
                      guns = Guns.definitions.filter(gun => !gun.devItem && !gun.noSwap),
                      melees = Melees.definitions.filter(melee => !melee.noDrop && !melee.devItem),
                      skins = Skins.definitions.filter(skin => !skin.rolesRequired && !skin.noDrop && !skin.grassTint);

                this.inventory.helmet = pickRandomInArray(helmets);
                this.inventory.vest = pickRandomInArray(vests);
                this.inventory.backpack = pickRandomInArray(backpacks);
                this.loadout.skin = pickRandomInArray(skins);

                for (const item of [...HealingItems.definitions, ...Ammos.definitions]) {
                    if ((item.defType === DefinitionType.Ammo && item.ephemeral) || (item.defType === DefinitionType.HealingItem && item.healType === HealType.Special)) continue;
                    this.inventory.items.setItem(item.idString, random(0, this.inventory.backpack.maxCapacity[item.idString]));
                }

                for (let i = 0; i <= 2; i++) {
                    if (this.inventory.getWeapon(i)?.definition.noSwap) continue;
                    this.inventory.replaceWeapon(i, i === 2 ? pickRandomInArray(melees) : pickRandomInArray(guns), true);

                    if (i < 2) (this.inventory.getWeapon(i) as GunItem).ammo = (this.inventory.getWeapon(i) as GunItem).definition.capacity;
                }

                this.setDirty();
                break;
            }
            case PerkIds.Costumed: {
                const { choices } = PerkData[PerkIds.Costumed];

                this.activeDisguise = Obstacles.fromString(
                    weightedRandom(
                        Object.keys(choices),
                        Object.values(choices)
                    )
                );

                this.emitLowHealthParticles = this.activeDisguise.explosion !== undefined && this._health / this._maxHealth < 0.3; // 30%
                this.setDirty();
                break;
            }
            case PerkIds.PlumpkinBomb: {
                this.halloweenThrowableSkin = true;
                this.setDirty();
                break;
            }
            case PerkIds.Lycanthropy: {
                [this._perkData["Lycanthropy::old_skin"], this.loadout.skin] = [this.loadout.skin, Skins.fromString("werewolf")];
                this.setDirty();
                this.action?.cancel();
                const inventory = this.inventory;
                inventory.dropWeapon(0, true)?.destroy();
                inventory.dropWeapon(1, true)?.destroy();
                inventory.dropWeapon(2, true)?.destroy();

                if (inventory.helmet) inventory.dropItem(inventory.helmet);
                if (inventory.vest) inventory.dropItem(inventory.vest);

                inventory.vest = Armors.fromString("werewolf_fur");

                // Drop all throwables
                while (inventory.getWeapon(3)) {
                    inventory.dropWeapon(3, true)?.destroy();
                }

                inventory.lockAllSlots();

                /* TODO: continue crying */
                break;
            }
            case PerkIds.ExtendedMags: {
                const weapons = this.inventory.weapons;
                const maxWeapons = GameConstants.player.maxWeapons;
                for (let i = 0; i < maxWeapons; i++) {
                    const weapon = weapons[i];

                    if (!weapon?.isGun) continue;

                    const def = weapon.definition;

                    if (def.extendedCapacity === undefined) continue;

                    const extra = weapon.ammo - def.extendedCapacity;
                    if (extra > 0) {
                        // firepower is anti-boosting this weapon, we need to shave the extra rounds off
                        weapon.ammo = def.extendedCapacity;
                        this.inventory.giveItem(def.ammoType, extra);
                    }
                }
                break;
            }
            case PerkIds.Butterfingers:
            case PerkIds.CombatExpert: {
                if (this.action?.type === PlayerActions.Reload) this.action?.cancel();
                break;
            }
            case PerkIds.PrecisionRecycling: {
                this.bulletTargetHitCount = 0;
                break;
            }
            case PerkIds.ExperimentalForcefield: {
                if (!this.hadShield) {
                    this.shield = 100;
                } else {
                    this._setShieldTimeout();
                }
                break;
            }
            case PerkIds.Overdrive: {
                this.overdriveTimeout?.kill();
                this.overdriveKills = 0;
                break;
            }
            case PerkIds.Infected: {
                this.infection = 100;
                this.addPerk(PerkIds.Necrosis);
                break;
            }
            case PerkIds.PriorityTarget: {
                this.updateMapIndicator();
                break;
            }
            case PerkIds.AchingKnees: {
                this.reversedMovement = false;
                break;
            }
        }
        // ! evil ends here

        this.updateAndApplyModifiers();
        this.dirty.perks = true;
    }

    hasPerk(perk: ReifiableDef<PerkDefinition>): boolean {
        return this.perks.includes(Perks.reify(perk));
    }

    removePerk(perk: ReifiableDef<PerkDefinition>): void {
        const perkDef = Perks.reify(perk);
        if (!this.perks.includes(perkDef)) return;

        removeFrom(this.perks, perkDef);

        if (this.hasPerk(PerkIds.Overdrive)) {
            this.removePerk(PerkIds.Overdrive);
        }

        const perkUpdateMap = this.perkUpdateMap;
        if ("updateInterval" in perkDef && perkUpdateMap !== undefined) {
            perkUpdateMap?.delete(perkDef);

            if (perkUpdateMap?.size === 0) {
                this.perkUpdateMap = undefined;
            }

           // removeFrom(this.updatedPerks, perkDef);
        }

        // ! evil starts here
        // some perks need to perform cleanup on removal
        switch (perkDef.idString) {
            case PerkIds.Lycanthropy: {
                this.inventory.vest = undefined;
                this.loadout.skin = Skins.fromStringSafe(this._perkData["Lycanthropy::old_skin"] as string) ?? Skins.fromString("hazel_jumpsuit");
                this.inventory.unlockAllSlots();
                this.setDirty();
                break;
            }
            case PerkIds.ExtendedMags: {
                const weapons = this.inventory.weapons;
                const maxWeapons = GameConstants.player.maxWeapons;
                for (let i = 0; i < maxWeapons; i++) {
                    const weapon = weapons[i];

                    if (!weapon?.isGun) continue;

                    const def = weapon.definition;
                    const extra = weapon.ammo - def.capacity;
                    if (extra > 0) {
                        // firepower boosted this weapon, we need to shave the extra rounds off
                        weapon.ammo = def.capacity;
                        this.inventory.giveItem(def.ammoType, extra);
                    }
                }
                break;
            }
            case PerkIds.PlumpkinBomb: {
                this.halloweenThrowableSkin = false;
                this.setDirty();
                break;
            }
            case PerkIds.Costumed: {
                this.activeDisguise = undefined;
                this.emitLowHealthParticles = false;
                this.setDirty();
                break;
            }
            case PerkIds.Butterfingers:
            case PerkIds.CombatExpert: {
                if (this.action?.type === PlayerActions.Reload) this.action?.cancel();
                break;
            }
            case PerkIds.PrecisionRecycling: {
                this.bulletTargetHitCount = 0;
                this.targetHitCountExpiration?.kill();
                this.targetHitCountExpiration = undefined;
                break;
            }
            case PerkIds.Infected: { // evil
                this.removePerk(PerkIds.Necrosis);
                const perkToRemove = this.perks.find(perk => perk.category !== PerkCategories.Infection && !perk.infectedEffectIgnore);
                if (perkToRemove !== undefined) this.removePerk(perkToRemove);

                const immunity = PerkData[PerkIds.Immunity];
                this.infection = 0;
                this.addPerk(immunity);
                this.immunityTimeout?.kill();
                this.immunityTimeout = this.game.addTimeout(() => this.removePerk(immunity), immunity.duration);
                this.setDirty();
                break;
            }
            case PerkIds.ExperimentalForcefield: {
                this.hadShield = true;
                this.shield = 0;
                break;
            }
            case PerkIds.Overdrive: {
                this.overdriveTimeout?.kill();
                this.overdriveKills = 0;
                break;
            }
            case PerkIds.PriorityTarget: {
                this.updateMapIndicator();
                break;
            }
            case PerkIds.EternalMagnetism: {
                this.hasMagneticField = false;
                this.setDirty();
                break;
            }
            case PerkIds.AchingKnees: {
                this.reversedMovement = false;
                break;
            }
        }
        // ! evil ends here

        this.updateAndApplyModifiers();
        this.dirty.perks = true;
    }

    mapPerk<Name extends ReferenceTo<PerkDefinition>, U>(
        perk: Name | (PerkDefinition & { readonly idString: Name }),
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U
    ): U | undefined {
        const def = Perks.reify(perk);
        if (this.perks.includes(def)) {
            return mapper(def as PerkDefinition & { readonly idString: Name });
        }
    }

    mapPerkOrDefault<Name extends ReferenceTo<PerkDefinition>, U>(
        perk: Name | (PerkDefinition & { readonly idString: Name }),
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U,
        defaultValue: U
    ): U {
        const def = Perks.reify(perk);
        if (this.perks.includes(def)) {
            return mapper(def as PerkDefinition & { readonly idString: Name });
        }

        return defaultValue;
    }

    updateMapIndicator(): void {
        const { helmet, vest, backpack } = this.inventory;
        const helmetIndicator = helmet?.mapIndicator;
        const vestIndicator = vest?.mapIndicator;
        const backpackIndicator = backpack.mapIndicator;
        const specialEquipmentCount = [helmetIndicator, vestIndicator, backpackIndicator].filter(i => i !== undefined).length;
        let indicator: string | undefined;
        switch (specialEquipmentCount) {
            case 0:
                break;
            case 1:
                if (helmetIndicator) indicator = helmetIndicator;
                else if (vestIndicator) indicator = vestIndicator;
                else if (backpackIndicator) indicator = backpackIndicator;
                break;
            case 2:
            case 3:
            default:
                indicator = "juggernaut_indicator";
                break;
        }

        if (this.hasPerk(PerkIds.PriorityTarget)) indicator = "priority_target";

        if (indicator) {
            if (this.mapIndicator) {
                this.mapIndicator.definition = MapIndicators.fromString(indicator);
                this.mapIndicator.definitionDirty = true;
            } else {
                this.mapIndicator = new MapIndicator(this.game, indicator, this.position);
                this.game.mapIndicators.push(this.mapIndicator);
            }
        } else if (this.mapIndicator) {
            this.mapIndicator.dead = true;
            this.mapIndicator = undefined;
        }
    }

    spectate(packet: SpectateData): void {
        if (!this.dead) return;
        const game = this.game;
        if (game.now - this.lastSpectateActionTime < 200) return;
        this.lastSpectateActionTime = game.now;

        let toSpectate: Player | undefined;

        const { spectatablePlayers } = game;
        switch (packet.spectateAction) {
            case SpectateActions.BeginSpectating: {
                if (this.game.isTeamMode && this._team?.hasLivingPlayers()) {
                    // Find closest teammate
                    toSpectate = this._team.getLivingPlayers()
                        .reduce((a, b) => Geometry.distanceSquared(a.position, this.position) < Geometry.distanceSquared(b.position, this.position) ? a : b);
                } else if (this.killedBy !== undefined && !this.killedBy.dead) {
                    toSpectate = this.killedBy;
                } else if (spectatablePlayers.length > 1) {
                    toSpectate = pickRandomInArray(spectatablePlayers);
                }
                break;
            }
            case SpectateActions.SpectatePrevious:
                if (this.spectating !== undefined) {
                    toSpectate = spectatablePlayers[
                        Numeric.absMod(spectatablePlayers.indexOf(this.spectating) - 1, spectatablePlayers.length)
                    ];
                }
                break;
            case SpectateActions.SpectateNext:
                if (this.spectating !== undefined) {
                    toSpectate = spectatablePlayers[
                        Numeric.absMod(spectatablePlayers.indexOf(this.spectating) + 1, spectatablePlayers.length)
                    ];
                }
                break;
            case SpectateActions.SpectateSpecific: {
                toSpectate = spectatablePlayers.find(player => player.id === packet.playerID);
                break;
            }
            case SpectateActions.SpectateKillLeader: {
                toSpectate = game.killLeader;
                break;
            }
            case SpectateActions.Report: {
                if (!this.spectating) return;
                if (this.reportedPlayerIDs.get(this.spectating.id)) return;
                this.reportedPlayerIDs.set(this.spectating.id, true);

                const reportID = randomBytes(4).toString("hex");

                this.sendPacket(ReportPacket.create({
                    playerID: this.spectating.id,
                    reportID: reportID
                }));

                // Send the report to the API server
                if (Config.apiServer) {
                    // SERVER HOSTERS assign your custom server an ID somewhere then pass it into the report body region: region
                    const reportJson = {
                        id: reportID,
                        reporterName: this.name,
                        suspectName: this.spectating.name,
                        suspectIP: this.spectating.ip,
                        reporterIP: this.ip
                    };

                    fetch(`${Config.apiServer.url}/reports`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "api-key": Config.apiServer.apiKey },
                        body: JSON.stringify(reportJson)
                    }).then(response => response.json())
                        .then(console.log)
                        .catch((e: unknown) => console.error(e));
                }

                // Send the report to Discord
                if (Config.apiServer?.reportWebhookUrl) {
                    const reportData = {
                        embeds: [
                            {
                                title: "Report Received",
                                description: `Report ID: \`${reportID}\``,
                                color: 16711680,
                                fields: [
                                    {
                                        name: "Username",
                                        value: `\`${this.spectating.name}\``
                                    },
                                    {
                                        name: "Time reported",
                                        value: this.game.now
                                    },
                                    {
                                        name: "Reporter",
                                        value: this.name
                                    }
                                ]
                            }
                        ]
                    };

                    fetch(Config.apiServer.reportWebhookUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(reportData)
                    }).catch(error => {
                        console.error("Error: ", error);
                    });
                }
            }
        }

        if (toSpectate === undefined) return;
        if (this.spectating !== undefined && !this.initializedSpecialSpectatingCase) {
            toSpectate = this.spectating;
            this.initializedSpecialSpectatingCase = true;
        }

        if (this.game.isTeamMode) {
            this.teamID = toSpectate.teamID;
            this.setDirty();
        }

        this.spectating?.spectators.delete(this);
        this.updateObjects = true;
        this.startedSpectating = true;
        this.spectating = toSpectate;
        toSpectate.spectators.add(this);
    }

    disableInvulnerability(): void {
        if (this.invulnerable) {
            this.invulnerable = false;
            this.setDirty();
        }
    }

    private readonly _packets: MutablePacketDataIn[] = [];

    sendPacket(packet: MutablePacketDataIn): void {
        this._packets.push(packet);
    }

    disconnect(reason?: string): void {
        this.game.removePlayer(this, reason);
    }

    sendData(buffer: ArrayBuffer): void {
        try {
            this.socket?.send(buffer);
        } catch (e) {
            console.warn("Error sending packet. Details:", e);
        }
    }

    private _clampDamageAmount(amount: number): number {
        if (this.health - amount > this.maxHealth) {
            amount = -(this.maxHealth - this.health);
        }

        if (this.health - amount <= 0) {
            amount = this.health;
        }

        if (this.dead) amount = 0;

        return amount;
    }

    heal(amount: number): void {
        this.health += amount;
    }

    override damage(params: DamageParams): void {
        if (this.invulnerable) return;

        const { source, weaponUsed } = params;
        let { amount } = params;

        if (amount < 0) {
            return this.heal(-amount);
        }

        this.game.pluginManager.emit("player_damage", {
            amount,
            player: this,
            source,
            weaponUsed
        });

        if (this.shield <= 0) {
            // Reductions are merged additively
            amount *= (1 - (
                (this.inventory.helmet?.damageReduction ?? 0) + (this.inventory.vest?.damageReduction ?? 0)
            )) * this.mapPerkOrDefault(PerkIds.LastStand, ({ damageReceivedMod }) => damageReceivedMod, 1);

            amount = this._clampDamageAmount(amount);
        }

        this.piercingDamage({
            amount,
            source,
            weaponUsed
        });
    }

    /**
     * Deals damage whilst ignoring protective modifiers but not invulnerability
     */
    piercingDamage(params: DamageParams): void {
        const { source, weaponUsed } = params;
        let { amount } = params;
        if (
            this.invulnerable
            || (
                this.game.isTeamMode
                && source instanceof Player
                && source.teamID === this.teamID
                && source.id !== this.id
                && !this.disconnected
                && amount > 0
            )
        ) return;

        if (amount < 0) {
            return this.heal(-amount);
        }

        if (this.shield <= 0) {
            amount = this._clampDamageAmount(amount);
        }

        if (
            this.game.pluginManager.emit("player_will_piercing_damaged", {
                player: this,
                amount,
                source,
                weaponUsed
            })
        ) return;

        this.canDespawn = false;

        const canTrackStats = weaponUsed instanceof InventoryItemBase;
        const attributes = canTrackStats ? weaponUsed.definition.wearerAttributes?.on : undefined;
        const sourceIsPlayer = source instanceof Player;
        const applyPlayerFX = sourceIsPlayer
            ? (modifiers: ExtendedWearerAttributes): void => {
                source.health += modifiers.healthRestored ?? 0;
                source.adrenaline += modifiers.adrenalineRestored ?? 0;
            }
            : () => { /* nothing to apply */ };

        let statsChanged = false;
        const oldStats = canTrackStats ? { ...weaponUsed.stats } : undefined;

        // Decrease health; update damage done and damage taken
        if (this.shield <= 0) {
            this.health -= amount;
        } else {
            const initialShield = this.shield;
            this.shield -= amount;

            // If the shield broke, account for remaining damage
            const remainingDamage = amount - initialShield;
            if (remainingDamage > 0) {
                this.damage({ ...params, amount: remainingDamage });
            }
        }
        if (amount > 0) {
            this.damageTaken += amount;

            if (canTrackStats && !this.dead) {
                const damageDealt = weaponUsed.stats.damage += amount;
                statsChanged = true;

                if (sourceIsPlayer) {
                    for (const entry of attributes?.damageDealt ?? []) {
                        if (damageDealt >= (entry.limit ?? Infinity)) continue;

                        applyPlayerFX(entry);
                    }
                }
            }

            if (sourceIsPlayer) {
                if (source !== this) {
                    source.damageDone += amount;
                    this.lastDamagedBy = {
                        player: source,
                        weapon: weaponUsed,
                        time: this.game.now
                    }
                }
            }
        }

        this.game.pluginManager.emit("player_did_piercing_damaged", {
            player: this,
            amount,
            source,
            weaponUsed
        });

        if (this.health <= 0 && !this.dead) {
            if (
                this.game.isTeamMode
                && this._team?.players.some(p => !p.dead && !p.downed && !p.disconnected && p !== this)
                && !this.downed
                && source !== DamageSources.Disconnect
            ) {
                this.down(source, weaponUsed);
            } else {
                if (canTrackStats) {
                    const kills = ++weaponUsed.stats.kills;
                    statsChanged = true;

                    if (sourceIsPlayer) {
                        for (const entry of attributes?.kill ?? []) {
                            if (kills >= (entry.limit ?? Infinity)) continue;

                            applyPlayerFX(entry);
                        }
                    }
                }

                this.die(params);
            }
        }

        if (statsChanged && canTrackStats) {
            this.game.pluginManager.emit(
                "inv_item_stats_changed",
                {
                    item: weaponUsed,

                    // biome-ignore lint/style/noNonNullAssertion: canTrackStats ensures this object's existence
                    oldStats: oldStats!,
                    newStats: { ...weaponUsed.stats },
                    diff: {
                        kills: oldStats?.kills !== weaponUsed.stats.kills,
                        damage: oldStats?.damage !== weaponUsed.stats.damage
                    }
                }
            );
        }

        this.updateAndApplyModifiers();
        if (sourceIsPlayer) source.updateAndApplyModifiers();
    }

    private _calculateModifiers(): PlayerModifiers {
        const newModifiers = GameConstants.player.defaultModifiers();
        const eventMods: EventModifiers = {
            kill: [],
            damageDealt: []
        };

        const maxWeapons = GameConstants.player.maxWeapons;
        for (let i = 0; i < maxWeapons; i++) {
            const weapon = this.inventory.getWeapon(i);

            if (weapon === undefined) continue;

            const modifiers = weapon.modifiers;

            newModifiers.maxAdrenaline *= modifiers.maxAdrenaline;
            newModifiers.maxHealth *= modifiers.maxHealth;
            newModifiers.baseSpeed *= modifiers.baseSpeed;
            newModifiers.size *= modifiers.size;
            newModifiers.reload *= modifiers.reload;
            newModifiers.adrenDrain *= modifiers.adrenDrain;

            newModifiers.minAdrenaline += modifiers.minAdrenaline;
            newModifiers.hpRegen += modifiers.hpRegen;
        }

        // ! evil starts here
        for (const perk of this.perks) {
            switch (perk.idString) {
                case PerkIds.Lycanthropy: {
                    newModifiers.baseSpeed *= perk.speedMod;
                    newModifiers.maxHealth *= perk.healthMod;
                    newModifiers.hpRegen += perk.regenRate;
                    break;
                }
                case PerkIds.SecondWind: {
                    newModifiers.baseSpeed *= this._health / this._maxHealth < 0.5 ? perk.speedMod : 1;
                    break;
                }
                case PerkIds.ExperimentalTreatment: {
                    newModifiers.adrenDrain *= perk.adrenDecay;
                    newModifiers.minAdrenaline += perk.adrenSet * newModifiers.maxAdrenaline * GameConstants.player.maxAdrenaline;
                    newModifiers.maxHealth *= perk.healthMod;
                    break;
                }
                case PerkIds.Engorged: {
                    const base = newModifiers.maxHealth * GameConstants.player.defaultHealth;
                    (eventMods.kill as ExtendedWearerAttributes[]).push({
                        maxHealth: (base + perk.healthMod) / base,
                        sizeMod: perk.sizeMod
                    });
                    break;
                }
                case PerkIds.Berserker: {
                    if (this.activeItem.isMelee && !this.hasPerk(PerkIds.Lycanthropy)) {
                        newModifiers.baseSpeed *= perk.speedMod;
                    }
                    break;
                }
                case PerkIds.Overweight:
                case PerkIds.LowProfile: {
                    newModifiers.size *= perk.sizeMod;
                    break;
                }
                case PerkIds.ExperimentalForcefield: {
                    newModifiers.shieldRegen += perk.shieldRegenRate;
                    break;
                }
                case PerkIds.Overdrive: {
                    newModifiers.size *= perk.sizeMod;
                    /* if (this.overdriveTimeout !== undefined) break;
                    this.overdriveTimeout = this.game.addTimeout(() => {
                        this.overdriveKills = 0;
                    }, perk.achieveTime); */
                    break;
                }
                case PerkIds.Butterfingers: {
                    newModifiers.reload *= perk.reloadMod;
                    break;
                }
                case PerkIds.CombatExpert: {
                    const isEmpty = this.activeItem.isGun && this.activeItem.ammo <= 0;
                    newModifiers.reload *= isEmpty ? perk.reloadMod : 1;
                    break;
                }
                case PerkIds.Overclocked: {
                    newModifiers.fireRate *= perk.fireRateMod;
                    break;
                }
            }
        }
        // ! evil ends here
        const applyModifiers = (modifiers: WearerAttributes): void => {
            newModifiers.maxHealth *= modifiers.maxHealth ?? 1;
            newModifiers.maxAdrenaline *= modifiers.maxAdrenaline ?? 1;
            newModifiers.baseSpeed *= modifiers.speedBoost ?? 1;
            newModifiers.size *= modifiers.sizeMod ?? 1;
            newModifiers.adrenDrain *= modifiers.adrenDrain ?? 1;

            newModifiers.minAdrenaline += modifiers.minAdrenaline ?? 0;
            newModifiers.hpRegen += modifiers.hpRegen ?? 0;
        };

        for (
            const [modifiers, count] of [
                [eventMods.kill, this._kills],
                [eventMods.damageDealt, this.damageDone]
            ] as const
        ) {
            for (const entry of modifiers) {
                const limit = Numeric.min(entry.limit ?? Infinity, count);

                // don't honor healthRestored and adrenalineRestored here (handled in Player#die method)
                for (let i = 0; i < limit; i++) {
                    applyModifiers(entry);
                }
            }
        }

        return newModifiers;
    }

    updateAndApplyModifiers(): void {
        const {
            maxHealth,
            maxAdrenaline,
            minAdrenaline,
            maxShield,
            size,
            reload,
            fireRate
        } = this._modifiers = this._calculateModifiers();

        this.maxHealth = GameConstants.player.defaultHealth * maxHealth;
        this.maxAdrenaline = GameConstants.player.maxAdrenaline * maxAdrenaline;
        this.maxShield = GameConstants.player.maxShield * maxShield;
        this.minAdrenaline = minAdrenaline;
        this.sizeMod = size;
        this.reloadMod = reload;
        this.fireRateMod = fireRate;
    }

    updateBackEquippedMelee(): void {
        const old = this.backEquippedMelee?.idString;
        this.backEquippedMelee = this.inventory.weapons.find(w => {
            return w
                && w.definition.defType === DefinitionType.Melee
                && w.definition.onBack
                && w !== this.activeItem;
        })?.definition as MeleeDefinition | undefined;

        if (old !== this.backEquippedMelee?.idString) {
            this.setDirty();
        }
    }

    private static _itemToDamageSource(item: NonNullable<DamageParams["weaponUsed"]>): DamageSources {
        if (item instanceof Explosion) return DamageSources.Explosion;
        else if (item instanceof Obstacle) return DamageSources.Obstacle;
        else if (item.isGun) return DamageSources.Gun;
        else if (item.isMelee) return DamageSources.Melee;
        else /* if (item.isThrowable) */ return DamageSources.Throwable;
    }

    // dies of death
    die(params: Omit<DamageParams, "amount">): void {
        if (this.health > 0 || this.dead) return;

        this.game.pluginManager.emit("player_will_die", {
            player: this,
            ...params
        });

        const { source, weaponUsed } = params;

        this.health = 0;
        this.dead = true;
        const wasDowned = this.downed;
        this.downed = false;
        this.lastDamagedBy = undefined;
        this.canDespawn = false;
        this._team?.setDirty();

        if (this.mapIndicator) this.mapIndicator.dead = true;

        const action = this.beingRevivedBy?.action;
        if (action instanceof ReviveAction) {
            action.cancel();
        }

        const packet = KillPacket.create();
        packet.victimId = this.id;
        packet.downed = wasDowned;
        packet.killed = true;

        if (weaponUsed) {
            packet.weaponUsed = weaponUsed.definition;
            packet.damageSource = Player._itemToDamageSource(weaponUsed);
        }

        const downedBy = this.downedBy?.player;
        if (
            source === DamageSources.Gas
            || source === DamageSources.Obstacle
            || source === DamageSources.BleedOut
            || source === DamageSources.FinallyKilled
            || source === DamageSources.Disconnect
        ) {
            packet.damageSource = source;

            if (downedBy !== undefined) {
                packet.creditedId = downedBy.id;
                if (downedBy !== this) packet.kills = ++downedBy.kills;
            }

            if (this.game.mode.weaponSwap && downedBy !== undefined) {
                if (weaponUsed instanceof Explosion) {
                    downedBy.swapWeaponRandomly(weaponUsed.weapon, true);
                } else if (!(weaponUsed instanceof Obstacle)) {
                    downedBy.swapWeaponRandomly(weaponUsed, true);
                }
            }
        } else if (source instanceof Player && source !== this) {
            this.killedBy = source;

            packet.attackerId = source.id;

            // Give kill credit to the player who downed if they're on the same team as the killer.
            // Otherwise, the killer always gets credit.
            if (downedBy && downedBy.teamID === source.teamID) {
                packet.creditedId = downedBy.id;
                packet.kills = ++downedBy.kills;
            } else {
                packet.kills = ++source.kills;
            }

            // Killstreak credit always goes to the killer regardless of the above.
            if (
                weaponUsed !== undefined
                && weaponUsed.definition.defType !== DefinitionType.Explosion
                && weaponUsed instanceof InventoryItemBase
            ) {
                packet.killstreak = weaponUsed.stats.kills;
            }

            // Apply perk effects. Perk effects are also always applied to the killer.
            for (const perk of source.perks) {
                switch (perk.idString) {
                    case PerkIds.BabyPlumpkinPie: {
                        source.swapWeaponRandomly(undefined, true);
                        break;
                    }

                    case PerkIds.Engorged: {
                        if (source.kills <= perk.killsLimit) {
                            source.sizeMod *= perk.sizeMod;
                            source.maxHealth *= perk.healthMod;
                            source.updateAndApplyModifiers();
                        }
                        break;
                    }

                    case PerkIds.Bloodthirst: {
                        if (source.activeBloodthirstEffect) break;

                        source.activeBloodthirstEffect = true;
                        source.health += perk.healBonus;
                        source.adrenaline += perk.adrenalineBonus;
                        source.baseSpeed *= perk.speedMod;

                        this.game.addTimeout(() => {
                            source.baseSpeed /= perk.speedMod;
                            source.activeBloodthirstEffect = false;
                        }, perk.speedBoostDuration);
                        break;
                    }

                    case PerkIds.Overdrive: {
                        if (source.activeOverdrive || !source.canUseOverdrive) break;

                        if (source.overdriveKills++ >= perk.requiredKills) {
                            source.overdriveKills = 0;
                            source.health += perk.healBonus;
                            source.adrenaline += perk.adrenalineBonus;
                            source.baseSpeed *= perk.speedMod;
                            source.canUseOverdrive = false;
                            source.activeOverdrive = true;
                            source.setDirty();

                            this.game.addTimeout(() => {
                                source.baseSpeed /= perk.speedMod;
                                source.activeOverdrive = false;
                                source.setDirty();

                                this.overdriveCooldown?.kill();
                                this.overdriveCooldown = this.game.addTimeout(() => {
                                    source.canUseOverdrive = true;
                                }, perk.cooldown);
                            }, perk.speedBoostDuration);
                        }
                        break;
                    }
                }
            }

            // Weapon swap
            if (this.game.mode.weaponSwap) {
                if (weaponUsed instanceof Explosion) {
                    source.swapWeaponRandomly(weaponUsed.weapon, true);
                } else if (!(weaponUsed instanceof Obstacle)) {
                    source.swapWeaponRandomly(weaponUsed, true);
                }
            }

            source.updateAndApplyModifiers();
        } else if (source === this) {
            this.lastSelfKillTime = this.game.now;
        }

        this.game.packets.push(packet);

        // Reset movement and attacking variables
        this.movement.up = this.movement.down = this.movement.left = this.movement.right = false;
        this.startedAttacking = false;
        this.attacking = false;
        this.stoppedAttacking = false;
        this.game.aliveCountDirty = true;
        this.adrenaline = 0;
        this.dirty.items = true;
        this.action?.cancel();
        this.sendEmote(this.loadout.emotes[7], true);

        this.game.livingPlayers.delete(this);
        this.game.updateGameData({ aliveCount: this.game.aliveCount });
        this.game.fullDirtyObjects.add(this);
        removeFrom(this.game.spectatablePlayers, this);

        if (this.activeItem.isThrowable) {
            this.activeItem.stopUse();
        }

        this.teamWipe();

        //
        // Drop loot
        //

        const { position, layer } = this;

        // Drop weapons
        this.inventory.unlockAllSlots();
        this.inventory.dropWeapons();

        // Drop inventory items
        for (const item in this.inventory.items.asRecord()) {
            const count = this.inventory.items.getItem(item);
            const def = Loots.fromString(item);

            if (count > 0) {
                if (def.noDrop || ("ephemeral" in def && def.ephemeral)) continue;

                if (def.defType === DefinitionType.Ammo && count !== Infinity) {
                    let left = count;
                    let subtractAmount = 0;

                    do {
                        left -= subtractAmount = Numeric.min(left, def.maxStackSize);
                        this.game.addLoot(item, position, layer, { count: subtractAmount });
                    } while (left > 0);

                    continue;
                }

                this.game.addLoot(item, position, layer, { count });
                this.inventory.items.setItem(item, 0);
            }
        }

        // Drop equipment
        for (const itemType of ["helmet", "vest", "backpack"] as const) {
            const item = this.inventory[itemType];
            if (item && !item.noDrop) {
                this.game.addLoot(item, position, layer);
            }
        }
        this.inventory.helmet = this.inventory.vest = undefined;

        // Drop skin
        const { skin } = this.loadout;
        if (skin.hideFromLoadout && !skin.noDrop) {
            this.game.addLoot(skin, position, layer);
        }

        // Drop perks
        for (const perk of this.perks) {
            if (!this.hasPerk(PerkIds.Infected)) {
                if (!perk.noDrop) {
                    this.game.addLoot(perk, position, layer);
                } else if (perk.noDrop && perk.category === PerkCategories.Halloween) {
                    this.game.addLoot(PerkIds.PlumpkinGamble, position, layer);
                }
            }
        }

        // Disguise funnies
        if (this.activeDisguise !== undefined && !this.activeDisguise.indestructible) {
            const disguiseObstacle = this.game.map.generateObstacle(this.activeDisguise?.idString, this.position, { layer: this.layer });
            const disguiseDef = Obstacles.reify(this.activeDisguise);

            if (disguiseObstacle?.collidable) disguiseObstacle.collidable = false;

            if (disguiseObstacle !== undefined) {
                this.game.addTimeout(() => {
                    disguiseObstacle.damage({
                        amount: disguiseObstacle.health,
                    });
                }, 10); // small delay so sound plays
            }

            if (disguiseDef.explosion) {
                this.game.addExplosion(disguiseDef.explosion, this.position, this, this.layer);
            }
        }

        // Create death marker
        this.game.grid.addObject(new DeathMarker(this, layer));

        // remove all c4s
        for (const c4 of this.c4s) {
            c4.damage({ amount: Infinity });
        }

        if (this.mapIndicator) {
            this.mapIndicator.dead = true;
        }

        if (!this.disconnected) {
            this.sendGameOverPacket();
        }

        // Remove player from kill leader
        if (this === this.game.killLeader) {
            this.game.findNewKillLeader();
        }

        this.game.pluginManager.emit("player_did_die", {
            player: this,
            ...params
        });
    }

    teamWipe(): void {
        let team: Team | undefined;
        let players: readonly Player[] | undefined;
        if ((players = (team = this._team)?.players)?.every(p => p.dead || p.disconnected || p.downed)) {
            for (const player of players) {
                if (player === this) continue;

                player.health = 0;
                player.die({
                    source: DamageSources.FinallyKilled
                });
            }

            // biome-ignore lint/style/noNonNullAssertion: team can't be nullish here because if it were, it would fail the conditional this code is wrapped in
            this.game.teams.delete(team!);
        }
    }

    down(
        source?: GameObject | (typeof DamageSources)["Gas" | "Obstacle" | "BleedOut" | "FinallyKilled"],
        weaponUsed?: DamageParams["weaponUsed"]
    ): void {
        const packet = KillPacket.create();
        packet.victimId = this.id;
        packet.downed = true;
        packet.killed = false;

        if (source instanceof Player) {
            this.downedBy = {
                player: source,
                item: weaponUsed instanceof InventoryItemBase ? weaponUsed : undefined
            };

            if (weaponUsed) {
                packet.weaponUsed = weaponUsed.definition;
                packet.damageSource = Player._itemToDamageSource(weaponUsed);
            }

            if (source !== this) {
                packet.attackerId = source.id;
            } else {
                this.lastSelfKillTime = this.game.now;
            }
        } else if (source === DamageSources.Obstacle) {
            packet.weaponUsed = weaponUsed?.definition;
            packet.damageSource = source;
        } else if (source === DamageSources.Gas) {
            packet.damageSource = source;
        }

        this.game.packets.push(packet);

        this.canDespawn = false;
        this.downed = true;
        this.action?.cancel();
        this.activeItem.stopUse();
        this.health = 100;
        this.adrenaline = this.minAdrenaline;
        this.setDirty();
        this._team?.setDirty();
    }

    revive(): void {
        this.downed = false;
        this.beingRevivedBy = undefined;
        this.downedBy = undefined;
        this.health = 30;
        this.lastSelfDownTime = undefined;
        this.setDirty();
        this._team?.setDirty();
    }

    canInteract(player: Player): boolean {
        return !player.downed
            && this.downed
            && !this.beingRevivedBy
            && this !== player
            && this.teamID === player.teamID
            && adjacentOrEqualLayer(this.layer, player.layer);
    }

    interact(reviver: Player): void {
        this.beingRevivedBy = reviver;
        this.setDirty();
        reviver.animation = AnimationType.Revive;
        reviver.executeAction(new ReviveAction(reviver, this));
    }

    sendGameOverPacket(won = false): void {
        const teammates: TeammateGameOverData[] = (
            this.team && this.spectating === undefined
                ? this.team.players
                : [this]
        ).map(player => ({
            playerID: player.id,
            kills: player.kills,
            damageDone: player.damageDone,
            damageTaken: player.damageTaken,
            alive: !player.dead,
            timeAlive: (player.game.now - player.joinTime) / 1000
        }));

        const packet = GameOverPacket.create({
            rank: won ? 1 as const : this.game.aliveCount + 1,
            teammates
        });

        this.sendPacket(packet);

        for (const spectator of this.spectators) {
            spectator.sendPacket(packet);
        }
    }

    processInputs(packet: InputData): void {
        this.movement = {
            ...packet.movement,
            ...(packet.isMobile ? packet.mobile : { moving: false, angle: 0 })
        };

        this._pingSeq = packet.pingSeq;

        const wasAttacking = this.attacking;
        const isAttacking = packet.attacking;

        this.attacking = isAttacking;
        this.startedAttacking ||= !wasAttacking && isAttacking;
        this.stoppedAttacking ||= wasAttacking && !isAttacking;

        if (this.turning = packet.turning) {
            this.rotation = packet.rotation;
            this.distanceToMouse = packet.distanceToMouse;
        }

        const inventory = this.inventory;
        for (const action of packet.actions) {
            const type = action.type;

            switch (type) {
                case InputActions.UseItem: {
                    inventory.useItem(action.item);
                    break;
                }
                case InputActions.EquipLastItem:
                case InputActions.EquipItem: {
                    const target = type === InputActions.EquipItem
                        ? action.slot
                        : inventory.lastWeaponIndex;

                    // If a user is reloading the gun in slot 2, then we don't cancel the reload if they "switch" to slot 2
                    if (this.action?.type !== PlayerActions.Reload || (target !== this.activeItemIndex && inventory.hasWeapon(target))) {
                        this.action?.cancel();
                    }

                    inventory.setActiveWeaponIndex(target);
                    break;
                }
                case InputActions.DropWeapon: {
                    this.action?.cancel();
                    inventory.dropWeapon(action.slot)?.destroy();
                    break;
                }
                case InputActions.DropItem: {
                    if (!this.game.isTeamMode && action.item.defType !== DefinitionType.Perk) break;
                    this.action?.cancel();
                    inventory.dropItem(action.item);
                    break;
                }
                case InputActions.SwapGunSlots: {
                    inventory.swapGunSlots();
                    break;
                }
                case InputActions.LockSlot: {
                    inventory.lock(action.slot);
                    break;
                }
                case InputActions.UnlockSlot: {
                    if (this.hasPerk(PerkIds.Lycanthropy)) break;
                    inventory.unlock(action.slot);
                    break;
                }
                case InputActions.ToggleSlotLock: {
                    const slot = action.slot;

                    inventory.isLocked(slot)
                        ? (this.hasPerk(PerkIds.Lycanthropy) || inventory.unlock(slot))
                        : inventory.lock(slot);
                    break;
                }
                case InputActions.Loot:
                case InputActions.Interact: {
                    interface CloseObject {
                        object: Obstacle | Player | Loot | undefined
                        dist: number
                    }

                    const interactable: CloseObject = {
                        object: undefined,
                        dist: Number.MAX_VALUE
                    };
                    const uninteractable: CloseObject = {
                        object: undefined,
                        dist: Number.MAX_VALUE
                    };
                    const detectionHitbox = new CircleHitbox(3 * this._sizeMod, this.position);
                    const nearObjects = this.game.grid.intersectsHitbox(detectionHitbox, this.layer);

                    for (const object of nearObjects) {
                        const { isLoot, isObstacle, isPlayer } = object;
                        const isInteractable = (isLoot || isObstacle || isPlayer) && object.canInteract(this) === true;

                        if (
                            (isLoot || (type === InputActions.Interact && isInteractable))
                            && object.hitbox?.collidesWith(detectionHitbox)
                            && !(isLoot && [DefinitionType.Throwable, DefinitionType.Gun, DefinitionType.Armor].includes(object.definition.defType) && this.hasPerk(PerkIds.Lycanthropy))
                        ) {
                            const dist = Geometry.distanceSquared(object.position, this.position);
                            if (isInteractable) {
                                if (dist < interactable.dist) {
                                    interactable.dist = dist;
                                    interactable.object = object as CloseObject["object"];
                                }
                            } else if (isLoot && dist < uninteractable.dist) {
                                uninteractable.dist = dist;
                                uninteractable.object = object;
                            }
                        }
                    }

                    if (interactable.object) {
                        interactable.object.interact(this);

                        if (interactable.object.isObstacle && interactable.object.isDoor) {
                            // If the closest object is a door, interact with other doors within range
                            for (const object of nearObjects) {
                                if (
                                    object.isObstacle
                                    && object.isDoor
                                    && !object.door?.locked
                                    && object !== interactable.object
                                    && object.hitbox.collidesWith(detectionHitbox)
                                ) {
                                    object.interact(this);
                                }
                            }
                        }
                    } else {
                        uninteractable.object?.interact(this, uninteractable.object.canInteract(this));
                    }

                    this.canDespawn = false;
                    this.disableInvulnerability();
                    break;
                }
                case InputActions.Reload:
                    if (this.activeItem.isGun) {
                        this.activeItem.reload();
                    }
                    break;
                case InputActions.Cancel:
                    this.action?.cancel();
                    break;
                case InputActions.Emote: {
                    let isValid = false;
                    for (const definitionList of [Emotes, Ammos, HealingItems, Guns, Melees, Throwables]) {
                        if (this.game.isTeamMode && definitionList.hasString(action.emote.idString)) {
                            isValid = true;
                            break;
                        }
                    }

                    this.sendEmote(action.emote, isValid);
                }
                    break;
                case InputActions.MapPing:
                    this.sendMapPing(action.ping, action.position);
                    break;
                case InputActions.ExplodeC4:
                    for (const c4 of this.c4s) {
                        if (c4.activateC4()) this.c4s.delete(c4);
                    }
                    this.dirty.activeC4s = true;
                    break;
            }
        }

        this.game.pluginManager.emit("player_input", {
            player: this,
            packet
        });
    }

    executeAction(action: Action): void {
        if (this.downed) return;
        this.action?.cancel();
        this.action = action;
    }

    override get data(): FullData<ObjectCategory.Player> {
        const data: SDeepMutable<FullData<ObjectCategory.Player>> = {
            position: this.position,
            rotation: this.rotation,
            full: {
                layer: this.layer,
                dead: this.dead,
                downed: this.downed,
                beingRevived: !!this.beingRevivedBy,
                teamID: this.teamID ?? 0,
                invulnerable: this.invulnerable,
                activeItem: this.activeItem.definition,
                sizeMod: this.sizeMod,
                skin: this.loadout.skin,
                helmet: this.inventory.helmet,
                vest: this.inventory.vest,
                backpack: this.inventory.backpack,
                halloweenThrowableSkin: this.halloweenThrowableSkin,
                activeDisguise: this.activeDisguise,
                infected: this.infected || this.hasPerk(PerkIds.Infected),
                backEquippedMelee: this.backEquippedMelee,
                hasBubble: this.hasBubble,
                activeOverdrive: this.activeOverdrive,
                hasMagneticField: this.hasMagneticField,
                isCycling: this.isCycling,
                emitLowHealthParticles: this.emitLowHealthParticles
            }
        };

        if (this.dirty.size) {
            data.full.sizeMod = this._sizeMod;
        }

        if (this.dirty.reload) {
            data.full.reloadMod = this._reloadMod;
        }

        if (this._animation.dirty) {
            data.animation = this.animation;
        }

        if (this._action.dirty) {
            data.action = this.action instanceof HealingAction
                ? { type: PlayerActions.UseItem, item: this.action.item }
                : { type: (this.action?.type ?? PlayerActions.None) as Exclude<PlayerActions, PlayerActions.UseItem> };
        }

        return data;
    }
}
