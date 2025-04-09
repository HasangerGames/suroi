import { AnimationType, GameConstants, InputActions, Layer, ObjectCategory, PlayerActions, SpectateActions } from "@common/constants";
import { type BadgeDefinition } from "@common/definitions/badges";
import { Emotes, type EmoteDefinition } from "@common/definitions/emotes";
import { Ammos } from "@common/definitions/items/ammos";
import { ArmorType, Armors } from "@common/definitions/items/armors";
import { Backpacks } from "@common/definitions/items/backpacks";
import { Guns, Tier, type GunDefinition } from "@common/definitions/items/guns";
import { HealingItems } from "@common/definitions/items/healingItems";
import { Melees, type MeleeDefinition } from "@common/definitions/items/melees";
import { PerkCategories, PerkIds, Perks, type PerkDefinition } from "@common/definitions/items/perks";
import { DEFAULT_SCOPE, Scopes, type ScopeDefinition } from "@common/definitions/items/scopes";
import { type SkinDefinition } from "@common/definitions/items/skins";
import { Throwables, type ThrowableDefinition } from "@common/definitions/items/throwables";
import { Loots, type WeaponDefinition } from "@common/definitions/loots";
import { type PlayerPing } from "@common/definitions/mapPings";
import { Obstacles, type ObstacleDefinition } from "@common/definitions/obstacles";
import { type SyncedParticleDefinition } from "@common/definitions/syncedParticles";
import { GameOverPacket, TeammateGameOverData } from "@common/packets/gameOverPacket";
import { type InputData, type NoMobile } from "@common/packets/inputPacket";
import { DamageSources, KillPacket } from "@common/packets/killPacket";
import { MutablePacketDataIn } from "@common/packets/packet";
import { PacketStream } from "@common/packets/packetStream";
import { ReportPacket } from "@common/packets/reportPacket";
import { type SpectateData } from "@common/packets/spectatePacket";
import { UpdatePacket, type PlayerData, type UpdateDataCommon } from "@common/packets/updatePacket";
import { PlayerModifiers } from "@common/typings";
import { CircleHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer, isVisibleFromLayer } from "@common/utils/layer";
import { Angle, Collision, Geometry, Numeric } from "@common/utils/math";
import { type SDeepMutable, type Timeout } from "@common/utils/misc";
import { ItemType, type EventModifiers, type ExtendedWearerAttributes, type ReferenceTo, type ReifiableDef, type WearerAttributes } from "@common/utils/objectDefinitions";
import { type FullData } from "@common/utils/objectsSerializations";
import { pickRandomInArray, randomPointInsideCircle, weightedRandom } from "@common/utils/random";
import { SuroiByteStream } from "@common/utils/suroiByteStream";
import { FloorNames, FloorTypes } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import { randomBytes } from "crypto";
import { WebSocket } from "uWebSockets.js";
import { Config } from "../config";
import { type Game } from "../game";
import { HealingAction, ReloadAction, ReviveAction, type Action } from "../inventory/action";
import { GunItem } from "../inventory/gunItem";
import { Inventory, type InventoryItem } from "../inventory/inventory";
import { CountableInventoryItem, InventoryItemBase } from "../inventory/inventoryItem";
import { MeleeItem } from "../inventory/meleeItem";
import { ServerPerkManager, UpdatablePerkDefinition } from "../inventory/perkManager";
import { ThrowableItem } from "../inventory/throwableItem";
import { type Team } from "../team";
import { removeFrom } from "../utils/misc";
import { DeathMarker } from "./deathMarker";
import { Emote } from "./emote";
import { Explosion } from "./explosion";
import { BaseGameObject, type DamageParams, type GameObject } from "./gameObject";
import { type Loot } from "./loot";
import { type Obstacle } from "./obstacle";
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

    teamID?: number;
    colorIndex = 0; // Assigned in the team.ts file.

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
        if (!this.game.teamMode) {
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
        if (this._maxHealth !== maxHealth) {
            this._maxHealth = maxHealth;
            this.dirty.maxMinStats = true;
            this._team?.setDirty();
        }

        this.health = this._health;
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
    }

    private _maxAdrenaline = GameConstants.player.maxAdrenaline;

    private _normalizedAdrenaline = 0;
    get normalizedAdrenaline(): number { return this._normalizedAdrenaline; }

    get maxAdrenaline(): number { return this._maxAdrenaline; }
    set maxAdrenaline(maxAdrenaline: number) {
        if (this._maxAdrenaline !== maxAdrenaline) {
            this._maxAdrenaline = maxAdrenaline;
            this.dirty.maxMinStats = true;
        }

        this.adrenaline = this._adrenaline;
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

    private _sizeMod = 1;
    get sizeMod(): number { return this._sizeMod; }
    set sizeMod(size: number) {
        if (this._sizeMod === size) return;

        this._sizeMod = size;
        this._hitbox = Player.baseHitbox.transform(this._hitbox.position, size);
        this.dirty.size = true;
        this.setDirty();
    }

    private _modifiers = GameConstants.player.defaultModifiers();

    killedBy?: Player;
    downedBy?: {
        readonly player: Player
        readonly item?: InventoryItem
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
        health: true,
        maxMinStats: true,
        adrenaline: true,
        size: true,
        weapons: true,
        slotLocks: true,
        items: true,
        zoom: true,
        layer: true,
        activeC4s: true,
        perks: true,
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

    readonly socket: WebSocket<PlayerSocketData> | undefined;

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

    private _movementVector = Vec.create(0, 0);
    get movementVector(): Vector { return Vec.clone(this._movementVector); }

    spawnPosition: Vector = Vec.create(this.game.map.width / 2, this.game.map.height / 2);

    private readonly _mapPings: Game["mapPings"] = [];

    c4s = new Set<Projectile>();

    backEquippedMelee?: MeleeDefinition;

    readonly perks = new ServerPerkManager(this, []);
    perkUpdateMap?: Map<UpdatablePerkDefinition, number>; // key = perk, value = last updated

    private _pingSeq = 0;

    // key = proj, value = angle
    stuckProjectiles: Map<Projectile, number> | undefined;

    immunityTimeout: Timeout | undefined;

    constructor(game: Game, socket: WebSocket<PlayerSocketData> | undefined, position: Vector, layer?: Layer, team?: Team) {
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
        const data = socket?.getUserData() ?? {} as Partial<PlayerSocketData>;
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
            && !Config.disableLobbyClearing
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
                let itemType: ItemType;

                if (
                    weaponDef === undefined // no such item
                    || ![ItemType.Gun, ItemType.Melee].includes(itemType = weaponDef.itemType) // neither gun nor melee
                    || GameConstants.player.inventorySlotTypings[slot] !== itemType // invalid type
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

        // we hope `throwableItemMap` is correctly sync'd
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        inventory.throwableItemMap.get(idString)!.count = inventory.items.getItem(idString);
    }

    private static readonly _weaponSwapWeights: Partial<Record<ItemType, Partial<Record<Tier, number>>>> = {
        [ItemType.Gun]: {
            [Tier.S]: 0.15,
            [Tier.A]: 0.2,
            [Tier.B]: 0.5,
            [Tier.C]: 0.818,
            [Tier.D]: 0.182
        },
        [ItemType.Melee]: {
            [Tier.S]: 0.125,
            [Tier.A]: 0.5,
            [Tier.B]: 0.4,
            [Tier.C]: 0.4,
            [Tier.D]: 0.2
        },
        [ItemType.Throwable]: {
            [Tier.S]: 0.4,
            [Tier.C]: 1,
            [Tier.D]: 0.5
        }
    };

    private static readonly _weaponTiersCache: Partial<Record<ItemType, Partial<Record<Tier, WeaponDefinition[]>>>> = {};

    swapWeaponRandomly(item: InventoryItem = this.activeItem, force = false): void {
        if (item.definition.noSwap || this.perks.hasItem(PerkIds.Lycanthropy)) return; // womp womp

        let slot = item === this.activeItem
            ? this.activeItemIndex
            : this.inventory.weapons.findIndex(i => i === item);

        if (slot === -1) {
            // this happens if the item to be swapped isn't currently in the inventory
            // in that case, we just take the first slot matching that item's type
            slot = GameConstants.player.inventorySlotTypings.filter(slot => slot === item.definition.itemType)?.[0] ?? 0;
            // and if we somehow don't have any matching slots, then someone's probably messing with us… fallback to slot 0 lol
        }

        const spawnable = this.game.spawnableLoots;

        const { inventory } = this;
        const { items, backpack: { maxCapacity }, throwableItemMap } = inventory;
        const type = GameConstants.player.inventorySlotTypings[slot];

        const weights = Player._weaponSwapWeights[type] ?? {};
        const chosenTier = weightedRandom<Tier>(Object.keys(weights).map(s => parseInt(s)), Object.values(weights));
        const cache = Player._weaponTiersCache[type] ??= {};
        const potentials = cache[chosenTier] ??= spawnable.forType(type).filter(({ tier }) => tier === chosenTier);

        const chosenItem = pickRandomInArray<WeaponDefinition>(
            type === ItemType.Throwable
                ? potentials.filter(
                    ({ idString: thr }) => (items.hasItem(thr) ? items.getItem(thr) : 0) < maxCapacity[thr]
                )
                : potentials
        );
        if (chosenItem === undefined) return;

        switch (chosenItem.itemType) { // chosenItem.itemType === type, but the former helps ts narrow chosenItem's type
            case ItemType.Gun: {
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

            case ItemType.Melee: {
                inventory.replaceWeapon(slot, chosenItem, force);
                break;
            }

            case ItemType.Throwable: {
                const { idString } = chosenItem;

                const count = items.hasItem(idString) ? items.getItem(idString) : 0;
                const max = maxCapacity[idString];

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

                const slot = inventory.slotsByItemType[ItemType.Throwable]?.[0];

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
                // we hope `throwableItemMap` is correctly sync'd
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

    // --------------------------------------------------------------------------------
    // Rate Limiting: Team Pings & Emotes.
    // --------------------------------------------------------------------------------
    rateLimitCheck(): boolean {
        if (this.blockEmoting) return false;

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
            return false;
        }

        return true;
    }
    // --------------------------------------------------------------------------------

    /**
     * @param isFromServer If the emoji should skip checking if the player has that emoji in their emoji wheel
     */
    sendEmote(source?: EmoteDefinition, isFromServer = false): void {
        // -------------------------------------
        // Rate Limiting: Team Pings & Emotes.
        // -------------------------------------
        if (!this.rateLimitCheck()) return;
        // -------------------------------------
        if (!source) return;

        let isValid = false;
        for (const definitionList of [Emotes, Ammos, HealingItems, Guns, Melees, Throwables]) {
            if (definitionList.hasString(source.idString)) {
                isValid = true;
                break;
            }
        }

        if (!isValid) return;

        if (("itemType" in source)
            && (source.itemType === ItemType.Ammo || source.itemType === ItemType.Healing)
            && !this.game.teamMode) return;

        const indexOf = this.loadout.emotes.indexOf(source);
        if (!isFromServer && (indexOf < 0 || indexOf > 3)) return;

        if (this.game.pluginManager.emit("player_will_emote", { player: this, emote: source })) return;

        this.game.emotes.push(new Emote(source, this));

        this.game.pluginManager.emit("player_did_emote", {
            player: this,
            emote: source
        });
    }

    sendMapPing(ping: PlayerPing, position: Vector): void {
        // -------------------------------------
        // Rate Limiting: Team Pings & Emotes.
        // -------------------------------------
        if (!this.rateLimitCheck()) return;
        // -------------------------------------

        if (!ping.isPlayerPing) return;

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

            movement = Vec.create(x, y);
        }

        // Rate Limiting: Team Pings & Emotes
        if (this.emoteCount > 0 && !this.blockEmoting && (this.game.now - this.lastRateLimitUpdate > GameConstants.player.rateLimitInterval)) {
            this.emoteCount--;
            this.lastRateLimitUpdate = this.game.now;
        }

        // Perks
        if (this.perkUpdateMap !== undefined) {
            for (const [perk, lastUpdated] of this.perkUpdateMap.entries()) {
                if (this.game.now - lastUpdated <= perk.updateInterval) continue;

                this.perkUpdateMap.set(perk, this.game.now);
                // ! evil starts here
                switch (perk.idString) {
                    case PerkIds.Bloodthirst: {
                        this.piercingDamage({
                            amount: perk.healthLoss
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
                            amount: perk.healthLoss
                        });
                        this.adrenaline -= this.adrenaline * (perk.adrenLoss / 100);
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
                    case PerkIds.Infected: {
                        if (this.health > perk.minHealth) {
                            this.health = Numeric.max(this.health - perk.dps, perk.minHealth);
                        }
                        const detectionHitbox = new CircleHitbox(perk.infectionRadius, this.position);
                        for (const player of this.game.grid.intersectsHitbox(detectionHitbox)) {
                            if (
                                !player.isPlayer
                                || !player.hitbox.collidesWith(detectionHitbox)
                                || Math.random() > perk.infectionChance
                                || player.perks.hasItem(PerkIds.Immunity)
                            ) continue;
                            player.perks.addItem(Perks.fromString(PerkIds.Infected));
                            player.setDirty();
                        }
                        break;
                    }
                }
                // ! evil ends here
            }
        }

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

        // Recoil
        const recoilMultiplier = this.recoil.active && (this.recoil.active = (this.recoil.time >= this.game.now))
            ? this.recoil.multiplier
            : 1;

        // building & smoke checks
        let isInsideBuilding = false;
        const depleters = new Set<SyncedParticle>();
        for (const object of this.nearObjects) {
            if (
                !isInsideBuilding
                && object?.isBuilding
                && !object.dead
                && object.scopeHitbox?.collidesWith(this._hitbox)
                && !Config.disableBuildingCheck
            ) {
                isInsideBuilding = true;
            } else if (
                object.isSyncedParticle
                && object.hitbox?.collidesWith(this._hitbox)
                && adjacentOrEqualLayer(object.layer, this.layer)
            ) {
                depleters.add(object);
            }
        }

        // Speed multiplier for perks
        const perkSpeedMod
            = this.mapPerkOrDefault(
                PerkIds.AdvancedAthletics,
                ({ waterSpeedMod, smokeSpeedMod }) => {
                    return (
                        (FloorTypes[this.floor].overlay ? waterSpeedMod : 1) // man do we need a better way of detecting water lol
                        * (depleters.size !== 0 ? smokeSpeedMod : 1)
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

        // Update position
        const oldPosition = Vec.clone(this.position);
        const movementVector = Vec.scale(movement, speed);
        this._movementVector = movementVector;

        this.position = Vec.add(
            this.position,
            Vec.scale(this.movementVector, dt)
        );

        // Cancel reviving when out of range
        if (this.action instanceof ReviveAction) {
            if (
                Vec.squaredLength(
                    Vec.sub(
                        this.position,
                        this.action.target.position
                    )
                ) >= 7 ** 2
            ) {
                this.action.cancel();
            }
        }

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
                    }
                }
            }

            if (!collided) break;
        }

        // World boundaries
        this.position.x = Numeric.clamp(this.position.x, this._hitbox.radius, this.game.map.width - this._hitbox.radius);
        this.position.y = Numeric.clamp(this.position.y, this._hitbox.radius, this.game.map.height - this._hitbox.radius);

        this.isMoving = !Vec.equals(oldPosition, this.position);
        if (this.isMoving) {
            this.game.grid.updateObject(this);
        }

        // Disable invulnerability if the player moves or turns
        if (this.isMoving || this.turning) {
            this.disableInvulnerability();
            this.setPartialDirty();

            if (this.isMoving) {
                this.floor = this.game.map.terrain.getFloor(this.position, this.layer);
            }
        }

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
                ({ healDmgRate, lowerHpLimit }) => (this.health <= lowerHpLimit ? 1 : -healDmgRate),
                (this.adrenaline > 0 || (this.normalizedHealth < 0.3 && !this.perks.hasItem(PerkIds.Infected))) && !this.downed ? 1 : 0
            );

            // Drain adrenaline
            this.adrenaline -= 0.0005 * this._modifiers.adrenDrain * dt;
        }
        this.health += dt / 1000 * toRegen;

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

        // Determine if player is inside building + reduce scope in buildings
        if (!this.isInsideBuilding) {
            this.effectiveScope = isInsideBuilding
                ? DEFAULT_SCOPE
                : this.inventory.scope;
        }
        this.isInsideBuilding = isInsideBuilding;

        if (this.downed) {
            this.effectiveScope = DEFAULT_SCOPE;
        }

        let scopeTarget: ReferenceTo<ScopeDefinition> | undefined;
        depleters.forEach(depleter => {
            const def = depleter.definition;
            const depletion = def.depletePerMs;

            const { snapScopeTo, scopeOutPreMs = 0 } = def as SyncedParticleDefinition & { readonly hitbox: Hitbox };
            // If lifetime - age > scope out time, we have the potential to zoom in the scope
            if (
                snapScopeTo
                && depleter._lifetime - (this.game.now - depleter._creationDate) >= scopeOutPreMs
            ) {
                scopeTarget ??= snapScopeTo;
            }

            if (depletion?.health) {
                this.piercingDamage({
                    amount: depletion.health * dt,
                    source: DamageSources.Gas
                //          ^^^^^^^^^^^^^ dubious
                });
            }

            if (depletion?.adrenaline) {
                this.adrenaline -= depletion.adrenaline * dt;
            }
        });

        if (scopeTarget !== undefined || this.isInsideBuilding || this.downed) {
            this.effectiveScope = scopeTarget ?? DEFAULT_SCOPE;
        }

        // Automatic doors
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

        this.turning = false;
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
        if (this.spectating) {
            this.layer = this.spectating.layer;
        }
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
                if (newVisibleObjects.has(object) && isVisibleFromLayer(this.layer, object)) continue;

                this.visibleObjects.delete(object);
                packet.deletedObjects.push(object.id);
            }

            for (const object of newVisibleObjects) {
                if (this.visibleObjects.has(object) || !isVisibleFromLayer(this.layer, object)) continue;

                this.visibleObjects.add(object);
                fullObjects.add(object);
            }
        }

        for (const object of game.fullDirtyObjects) {
            if (!this.visibleObjects.has(object as GameObject)) continue;
            fullObjects.add(object);
        }

        packet.partialObjectsCache = [];
        for (const object of game.partialDirtyObjects) {
            if (!this.visibleObjects.has(object as GameObject) || fullObjects.has(object)) continue;
            packet.partialObjectsCache.push(object);
        }

        const inventory = player.inventory;
        let forceInclude = false;

        if (this.startedSpectating && this.spectating) {
            forceInclude = true;

            // this line probably doesn't do anything
            // packet.fullObjectsCache.push(this.spectating);
            this.startedSpectating = false;
        }

        packet.playerData = {
            pingSeq: this._pingSeq,
            ...(
                player.dirty.maxMinStats || forceInclude
                    ? { minMax: {
                        maxHealth: player._maxHealth,
                        minAdrenaline: player._minAdrenaline,
                        maxAdrenaline: player._maxAdrenaline
                    } }
                    : {}
            ),
            ...(
                player.dirty.health || forceInclude
                    ? { health: player._normalizedHealth }
                    : {}
            ),
            ...(
                player.dirty.adrenaline || forceInclude
                    ? { adrenaline: player._normalizedAdrenaline }
                    : {}
            ),
            ...(
                player.dirty.zoom || forceInclude
                    ? { zoom: player._scope.zoomLevel }
                    : {}
            ),
            ...(
                player.dirty.id || forceInclude
                    ? { id: {
                        id: player.id,
                        spectating: this.spectating !== undefined
                    } }
                    : {}
            ),
            ...(
                player.dirty.teammates || forceInclude
                    ? { teammates: player._team?.players as Player[] ?? [] }
                    : {}
            ),
            ...(
                player.dirty.weapons || forceInclude
                    ? { inventory: {
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
                    } }
                    : {}
            ),
            ...(
                player.dirty.slotLocks || forceInclude
                    ? { lockedSlots: player.inventory.lockedSlots }
                    : {}
            ),
            ...(
                player.dirty.items || forceInclude
                    ? { items: {
                        items: inventory.items.asRecord(),
                        scope: inventory.scope
                    } }
                    : {}
            ),
            ...(
                player.dirty.layer || forceInclude
                    ? { layer: player.layer }
                    : {}
            ),
            ...(
                player.dirty.activeC4s || forceInclude
                    ? { activeC4s: this.c4s.size > 0 }
                    : {}
            ),
            ...(
                player.dirty.perks || forceInclude
                    ? { perks: player.perks }
                    : {}
            ),
            ...(
                player.dirty.teamID || forceInclude
                    ? { teamID: player.teamID }
                    : {}
            ),
            blockEmoting: player.blockEmoting
        };

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
        packet.bullets = game.newBullets.filter(
            ({ initialPosition, finalPosition }) => Collision.lineIntersectsRectTest(
                initialPosition,
                finalPosition,
                this.screenHitbox.min,
                this.screenHitbox.max
            )
        );

        /**
         * It's in times like these where `inline constexpr`
         * would be very cool.
         */
        const maxDistSquared = 128 ** 2;

        // Cull explosions
        packet.explosions = game.explosions.filter(
            ({ position }) => this.screenHitbox.isPointInside(position)
                || Geometry.distanceSquared(position, this.position) < maxDistSquared
        );

        packet.emotes = game.emotes.filter(({ player }) => this.visibleObjects.has(player));

        const gas = game.gas;

        // shut up
        // eslint-disable-next-line @typescript-eslint/no-misused-spread
        packet.gas = gas.dirty || this._firstPacket ? { ...gas, finalStage: gas.getDef().finalStage } : undefined;
        packet.gasProgress = gas.completionRatioDirty || this._firstPacket ? gas.completionRatio : undefined;

        const newPlayers = this._firstPacket
            ? Array.from(game.grid.pool.getCategory(ObjectCategory.Player))
            : game.newPlayers;

        // new and deleted players
        packet.newPlayers = newPlayers.map(({ id, name, hasColor, nameColor, loadout: { badge } }) => ({
            id,
            name,
            hasColor,
            nameColor: hasColor ? nameColor : undefined,
            badge
        } as (UpdateDataCommon["newPlayers"] & object)[number]));

        if (this.game.teamMode) {
            for (const teammate of newPlayers.filter(({ teamID }) => teamID === player.teamID)) {
                fullObjects.add(teammate);
            }
        }

        packet.fullObjectsCache = Array.from(fullObjects);

        packet.deletedPlayers = game.deletedPlayers;

        packet.aliveCount = game.aliveCountDirty || this._firstPacket ? game.aliveCount : undefined;

        packet.planes = game.planes;

        packet.mapPings = [...game.mapPings, ...this._mapPings];
        this._mapPings.length = 0;

        packet.killLeader = game.killLeaderDirty || this._firstPacket
            ? {
                id: game.killLeader?.id ?? -1,
                kills: game.killLeader?.kills ?? 0
            }
            : undefined;

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

    hasPerk(perk: PerkIds | PerkDefinition): boolean {
        return this.perks.hasItem(perk);
    }

    ifPerkPresent<Name extends PerkIds>(
        perk: Name | PerkDefinition & { readonly idString: Name },
        cb: (data: PerkDefinition & { readonly idString: Name }) => void
    ): void {
        return this.perks.ifPresent<Name>(perk, cb);
    }

    mapPerk<Name extends PerkIds, U>(
        perk: Name | PerkDefinition & { readonly idString: Name },
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U
    ): U | undefined {
        return this.perks.map<Name, U>(perk, mapper);
    }

    mapPerkOrDefault<Name extends PerkIds, U>(
        perk: Name | PerkDefinition & { readonly idString: Name },
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U,
        defaultValue: U
    ): U {
        return this.perks.mapOrDefault<Name, U>(perk, mapper, defaultValue);
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
                if (this.game.teamMode && this._team?.hasLivingPlayers()) {
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
                if (Config.apiServer?.reportWebhookURL) {
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

                    fetch(Config.apiServer.reportWebhookURL, {
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

        if (this.game.teamMode) {
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
            this.socket?.send(buffer, true, false);
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

        // Reductions are merged additively
        amount *= 1 - (
            (this.inventory.helmet?.damageReduction ?? 0) + (this.inventory.vest?.damageReduction ?? 0)
        );

        amount = this._clampDamageAmount(amount);

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
                this.game.teamMode
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

        amount = this._clampDamageAmount(amount);

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
        this.health -= amount;
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
                this.game.teamMode

                // teamMode hopefully guarantees team's existence
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                && this._team!.players.some(p => !p.dead && !p.downed && !p.disconnected && p !== this)
                && !this.downed
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

                    // canTrackStats ensures this object's existence
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
            newModifiers.adrenDrain *= modifiers.adrenDrain;

            newModifiers.minAdrenaline += modifiers.minAdrenaline;
            newModifiers.hpRegen += modifiers.hpRegen;
        }

        // ! evil starts here
        for (const perk of this.perks) {
            switch (perk.idString) {
                case PerkIds.PlumpkinGamble: { // AW DANG IT
                    this.perks.removeItem(perk);

                    const halloweenPerks = Perks.definitions.filter(perkDef => {
                        return !perkDef.plumpkinGambleIgnore && perkDef.category === PerkCategories.Halloween;
                    });
                    this.perks.addItem(pickRandomInArray(halloweenPerks));
                    break;
                }
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
                    if (this.activeItem.isMelee) {
                        newModifiers.baseSpeed *= perk.speedMod;
                    }
                    break;
                }
                case PerkIds.LowProfile: {
                    newModifiers.size *= perk.sizeMod;
                    break;
                }
                case PerkIds.Infected: {
                    newModifiers.baseSpeed *= perk.speedMod;
                    newModifiers.maxHealth *= perk.healthMod;
                    newModifiers.adrenDrain *= perk.adrenDrainMod;
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
            size
        } = this._modifiers = this._calculateModifiers();

        this.maxHealth = GameConstants.player.defaultHealth * maxHealth;
        this.maxAdrenaline = GameConstants.player.maxAdrenaline * maxAdrenaline;
        this.minAdrenaline = minAdrenaline;
        this.sizeMod = size;
    }

    updateBackEquippedMelee(): void {
        const old = this.backEquippedMelee?.idString;
        this.backEquippedMelee = this.inventory.weapons.find(w => {
            return w
                && w.definition.itemType === ItemType.Melee
                && w.definition.onBack
                && w !== this.activeItem;
        })?.definition as MeleeDefinition | undefined;

        if (old !== this.backEquippedMelee?.idString) {
            this.setDirty();
        }
    }

    private static _itemToDamageSource(item: NonNullable<DamageParams["weaponUsed"]>): DamageSources {
        if (item instanceof Explosion) return DamageSources.Explosion;
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
        this.canDespawn = false;
        this._team?.setDirty();

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
            || source === DamageSources.Airdrop
            || source === DamageSources.BleedOut
            || source === DamageSources.FinallyKilled
        ) {
            packet.damageSource = source;

            if (downedBy !== undefined) {
                packet.creditedId = downedBy.id;
                if (downedBy !== this) packet.kills = ++downedBy.kills;
            }

            if (this.game.mode.weaponSwap && downedBy !== undefined) {
                if (!(weaponUsed instanceof Explosion)) {
                    downedBy.swapWeaponRandomly(weaponUsed, true);
                } else if (weaponUsed.weapon) {
                    downedBy.swapWeaponRandomly(weaponUsed.weapon, true);
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
                weaponUsed
                && "killstreak" in weaponUsed.definition
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
                }
            }

            // Weapon swap
            if (this.game.mode.weaponSwap) {
                if (!(weaponUsed instanceof Explosion)) {
                    source.swapWeaponRandomly(weaponUsed, true);
                } else if (weaponUsed.weapon) {
                    source.swapWeaponRandomly(weaponUsed.weapon, true);
                }
            }
            
            source.updateAndApplyModifiers();
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
        this.sendEmote(this.loadout.emotes[5], true);

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

                if (def.itemType === ItemType.Ammo && count !== Infinity) {
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
            if (!perk.noDrop) {
                this.game.addLoot(perk, position, layer);
            } else if (perk.noDrop && perk.category === PerkCategories.Halloween) {
                this.game.addLoot(PerkIds.PlumpkinGamble, position, layer);
            }
        }

        // Disguise funnies
        if (this.activeDisguise !== undefined) {
            const disguiseObstacle = this.game.map.generateObstacle(this.activeDisguise?.idString, this.position, { layer: this.layer });
            const disguiseDef = Obstacles.reify(this.activeDisguise);

            if (disguiseObstacle !== undefined) {
                this.game.addTimeout(() => {
                    disguiseObstacle.damage({
                        amount: disguiseObstacle.health
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

            // team can't be nullish here because if it were, it would fail the conditional this code is wrapped in
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.game.teams.delete(team!);
        }
    }

    down(
        source?: GameObject | (typeof DamageSources)["Gas" | "Airdrop" | "BleedOut" | "FinallyKilled"],
        weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion
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
            }
        } else if (source === DamageSources.Gas || source === DamageSources.Airdrop) {
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
        this.setDirty();
        this._team?.setDirty();
    }

    canInteract(player: Player): boolean {
        return !player.downed
            && this.downed
            && !this.beingRevivedBy
            && this !== player
            && this.teamID === player.teamID;
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
            if (!this.isMobile) {
                this.distanceToMouse = (packet as typeof packet & NoMobile).distanceToMouse ?? 0;
                /*
                    we put ?? cause even though the packet's isMobile should match the server's, it might
                    be possible—whether accidentally or maliciously—that it doesn't; however, the server is
                    not to honor any change to isMobile. however, the packet will still be announcing itself
                    as a mobile packet, and will thus lack the distanceToMouse field
                */
            }
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
                    if (!this.game.teamMode && action.item.itemType !== ItemType.Perk) break;
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

                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
                    const nearObjects = this.game.grid.intersectsHitbox(detectionHitbox);

                    for (const object of nearObjects) {
                        const { isLoot, isObstacle, isPlayer } = object;
                        const isInteractable = (isLoot || isObstacle || isPlayer) && object.canInteract(this) === true;

                        if (
                            (isLoot || (type === InputActions.Interact && isInteractable))
                            && object.hitbox?.collidesWith(detectionHitbox)
                            && adjacentOrEqualLayer(this.layer, object.layer)
                            && !(isLoot && [ItemType.Throwable, ItemType.Gun].includes(object.definition.itemType) && this.perks.hasItem(PerkIds.Lycanthropy))
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
                                    && adjacentOrEqualLayer(this.layer, object.layer)
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
                        if (this.game.teamMode && definitionList.hasString(action.emote.idString)) {
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
                skin: this.loadout.skin,
                helmet: this.inventory.helmet,
                vest: this.inventory.vest,
                backpack: this.inventory.backpack,
                halloweenThrowableSkin: this.halloweenThrowableSkin,
                activeDisguise: this.activeDisguise,
                infected: this.perks.hasItem(PerkIds.Infected),
                backEquippedMelee: this.backEquippedMelee
            }
        };

        if (this.dirty.size) {
            data.full.sizeMod = this._sizeMod;
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
