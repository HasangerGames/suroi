import { AnimationType, GameConstants, InputActions, KillfeedEventSeverity, KillfeedEventType, KillfeedMessageType, Layer, ObjectCategory, PlayerActions, SpectateActions } from "@common/constants";
import { Ammos } from "@common/definitions/ammos";
import { Armors, ArmorType } from "@common/definitions/armors";
import { Backpacks } from "@common/definitions/backpacks";
import { type BadgeDefinition } from "@common/definitions/badges";
import { Emotes, type EmoteDefinition } from "@common/definitions/emotes";
import { Guns, type GunDefinition } from "@common/definitions/guns";
import { HealingItems } from "@common/definitions/healingItems";
import { Loots, type WeaponDefinition } from "@common/definitions/loots";
import { type PlayerPing } from "@common/definitions/mapPings";
import { Melees, type MeleeDefinition } from "@common/definitions/melees";
import { Modes } from "@common/definitions/modes";
import { Obstacles, type ObstacleDefinition } from "@common/definitions/obstacles";
import { PerkCategories, PerkIds, Perks, type PerkDefinition, type PerkNames } from "@common/definitions/perks";
import { DEFAULT_SCOPE, Scopes, type ScopeDefinition } from "@common/definitions/scopes";
import { type SkinDefinition } from "@common/definitions/skins";
import { SyncedParticles, type SyncedParticleDefinition } from "@common/definitions/syncedParticles";
import { Throwables, type ThrowableDefinition } from "@common/definitions/throwables";
import { DisconnectPacket } from "@common/packets/disconnectPacket";
import { GameOverPacket, type GameOverData } from "@common/packets/gameOverPacket";
import { type AllowedEmoteSources, type NoMobile, type PlayerInputData } from "@common/packets/inputPacket";
import { createKillfeedMessage, KillFeedPacket, type ForEventType } from "@common/packets/killFeedPacket";
import { type InputPacket } from "@common/packets/packet";
import { PacketStream } from "@common/packets/packetStream";
import { ReportPacket } from "@common/packets/reportPacket";
import { type SpectatePacketData } from "@common/packets/spectatePacket";
import { UpdatePacket, type PlayerData, type UpdatePacketDataCommon, type UpdatePacketDataIn } from "@common/packets/updatePacket";
import { CircleHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer, isVisibleFromLayer } from "@common/utils/layer";
import { Collision, EaseFunctions, Geometry, Numeric } from "@common/utils/math";
import { ExtendedMap, type SDeepMutable, type SMutable, type Timeout } from "@common/utils/misc";
import { defaultModifiers, ItemType, type EventModifiers, type ExtendedWearerAttributes, type PlayerModifiers, type ReferenceTo, type ReifiableDef, type WearerAttributes } from "@common/utils/objectDefinitions";
import { type FullData } from "@common/utils/objectsSerializations";
import { pickRandomInArray, randomPointInsideCircle, weightedRandom } from "@common/utils/random";
import { SuroiByteStream } from "@common/utils/suroiByteStream";
import { FloorNames, FloorTypes } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import { randomBytes } from "crypto";
import { type WebSocket } from "uWebSockets.js";
import { Config } from "../config";
import { SpawnableLoots } from "../data/lootTables";
import { type Game } from "../game";
import { HealingAction, ReloadAction, ReviveAction, type Action } from "../inventory/action";
import { GunItem } from "../inventory/gunItem";
import { Inventory } from "../inventory/inventory";
import { CountableInventoryItem, InventoryItem } from "../inventory/inventoryItem";
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
import { type SyncedParticle } from "./syncedParticle";
import { type ThrowableProjectile } from "./throwableProj";

export interface PlayerContainer {
    readonly teamID?: string
    readonly autoFill: boolean
    player?: Player
    readonly ip: string | undefined
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

        this.dirty.teammates = true;
        this._team = value;
    }

    private _kills = 0;
    get kills(): number { return this._kills; }
    set kills(kills: number) {
        this._kills = kills;
        this.game.updateKillLeader(this);
    }

    private _maxHealth = GameConstants.player.defaultHealth;
    get maxHealth(): number { return this._maxHealth; }
    set maxHealth(maxHealth: number) {
        this._maxHealth = maxHealth;
        this.dirty.maxMinStats = true;
        this._team?.setDirty();
        this.health = this._health;
    }

    private _health = this._maxHealth;

    private _normalizedHealth = 0;
    get normalizedHealth(): number { return this._normalizedHealth; }

    get health(): number { return this._health; }
    set health(health: number) {
        this._health = Numeric.min(health, this._maxHealth);
        this._team?.setDirty();
        this.dirty.health = true;
        this._normalizedHealth = Numeric.remap(this.health, 0, this.maxHealth, 0, 1);
    }

    private _maxAdrenaline = GameConstants.player.maxAdrenaline;

    private _normalizedAdrenaline = 0;
    get normalizedAdrenaline(): number { return this._normalizedAdrenaline; }

    get maxAdrenaline(): number { return this._maxAdrenaline; }
    set maxAdrenaline(maxAdrenaline: number) {
        this._maxAdrenaline = maxAdrenaline;
        this.dirty.maxMinStats = true;
        this.adrenaline = this._adrenaline;
    }

    private _minAdrenaline = 0;
    get minAdrenaline(): number { return this._minAdrenaline; }
    set minAdrenaline(minAdrenaline: number) {
        this._minAdrenaline = Numeric.min(minAdrenaline, this._maxAdrenaline);
        this.dirty.maxMinStats = true;
        this.adrenaline = this._adrenaline;
    }

    private _adrenaline = this._minAdrenaline;
    get adrenaline(): number { return this._adrenaline; }
    set adrenaline(adrenaline: number) {
        this._adrenaline = Numeric.clamp(adrenaline, this._minAdrenaline, this._maxAdrenaline);
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

    private _modifiers = defaultModifiers();

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
        perks: true
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
    get effectiveScope(): ScopeDefinition { return this._scope; }
    set effectiveScope(target: ReifiableDef<ScopeDefinition>) {
        const scope = Scopes.reify(target);
        if (this._scope === scope) return;

        this._scope = scope;
        this.dirty.zoom = true;
        this.updateObjects = true;
    }

    get zoom(): number { return this._scope.zoomLevel; }

    readonly socket: WebSocket<PlayerContainer>;

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
            && this.activeItem instanceof GunItem
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

    c4s: ThrowableProjectile[] = [];

    readonly perks = new ServerPerkManager(this, Perks.defaults);
    perkUpdateMap?: Map<UpdatablePerkDefinition, number>; // key = perk, value = last updated

    constructor(game: Game, socket: WebSocket<PlayerContainer>, position: Vector, layer?: Layer, team?: Team) {
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

        const userData = socket.getUserData();
        this.socket = socket;
        this.name = GameConstants.player.defaultName;
        this.ip = userData.ip;
        this.role = userData.role;
        this.isDev = userData.isDev;
        this.nameColor = userData.nameColor ?? 0;
        this.hasColor = userData.nameColor !== undefined;

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

        const defaultScope = Modes[GameConstants.modeName].defaultScope;
        if (defaultScope) {
            this.inventory.scope = defaultScope;
            this.inventory.items.setItem(defaultScope, 1);
        } else {
            this.inventory.scope = DEFAULT_SCOPE.idString;
        }
        this.effectiveScope = DEFAULT_SCOPE;

        const specialFunnies = this.isDev && userData.lobbyClearing && !Config.disableLobbyClearing;
        // Inventory preset
        if (specialFunnies) {
            const [
                weaponA, weaponB, melee,
                killsA, killB, killsM
            ] = userData.weaponPreset.split(" ");

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

                if (!(weapon instanceof GunItem)) return;

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

    swapWeaponRandomly(itemOrSlot: InventoryItem | number = this.activeItem, force = false): void {
        if (this.perks.hasPerk(PerkIds.Lycanthropy)) return; // womp womp

        let slot = itemOrSlot === this.activeItem
            ? this.activeItemIndex
            : typeof itemOrSlot === "number"
                ? itemOrSlot
                : this.inventory.weapons.findIndex(i => i === itemOrSlot);

        if (slot === -1) {
            // this happens if the item to be swapped isn't currently in the inventory
            // in that case, we just take the first slot matching that item's type
            slot = GameConstants.player.inventorySlotTypings.filter(slot => slot === (itemOrSlot as InventoryItem).definition.itemType)?.[0] ?? 0;
            // and if we somehow don't have any matching slots, then someone's probably messing with us… fallback to slot 0 lol
        }

        const spawnable = SpawnableLoots();

        const { inventory } = this;
        const { items, backpack: { maxCapacity }, throwableItemMap } = inventory;
        const type = GameConstants.player.inventorySlotTypings[slot];

        const chosenItem = pickRandomInArray<WeaponDefinition>(
            type === ItemType.Throwable
                ? spawnable.forType(ItemType.Throwable).filter(
                    ({ idString: thr }) => (items.hasItem(thr) ? items.getItem(thr) : 0) < maxCapacity[thr]
                )
                : spawnable.forType(type)
        );
        if (chosenItem === undefined) return;

        switch (chosenItem.itemType) { // chosenItem.itemType === type, but the former helps ts narrow chosenItem's type
            case ItemType.Gun: {
                this.action?.cancel();

                const { capacity, ammoType, ammoSpawnAmount, summonAirdrop } = chosenItem;

                // Give the player ammo for the new gun if they do not have any ammo for it.
                if (!items.hasItem(ammoType) && !summonAirdrop) {
                    items.setItem(ammoType, ammoSpawnAmount);
                    this.dirty.items = true;
                }

                inventory.replaceWeapon(slot, chosenItem, force);
                (this.activeItem as GunItem).ammo = capacity;
                this.sendEmote(Guns.fromString(chosenItem.idString));
                break;
            }

            case ItemType.Melee: {
                inventory.replaceWeapon(slot, chosenItem, force);
                this.sendEmote(Melees.fromString(chosenItem.idString));
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
                this.sendEmote(Throwables.fromString(chosenItem.idString));
                break;
            }
        }

        this.sendEmote(Emotes.fromStringSafe(chosenItem.idString));
    }

    fillInventory(max = false): void {
        const { inventory } = this;

        inventory.scope = "4x_scope";
        inventory.backpack = max
            ? [...Backpacks.definitions].sort(({ level: lvlA }, { level: lvlB }) => lvlB - lvlA)[0]
            : pickRandomInArray(Backpacks.definitions);

        this.inventory.vest = max
            ? [...Armors.definitions.filter(({ armorType }) => armorType === ArmorType.Vest)].sort(({ level: lvlA }, { level: lvlB }) => lvlB - lvlA)[0]
            : Math.random() > 0.9
                ? undefined
                : pickRandomInArray(Armors.definitions.filter(({ armorType }) => armorType === ArmorType.Vest));

        this.inventory.helmet = max
            ? [...Armors.definitions.filter(({ armorType }) => armorType === ArmorType.Helmet)].sort(({ level: lvlA }, { level: lvlB }) => lvlB - lvlA)[0]
            : Math.random() > 0.9
                ? undefined
                : pickRandomInArray(Armors.definitions.filter(({ armorType }) => armorType === ArmorType.Helmet));

        const { items } = inventory;

        items.setItem("2x_scope", 1);
        items.setItem("4x_scope", 1);
        items.setItem("8x_scope", 1);
        items.setItem("15x_scope", 1);

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

    sendEmote(source?: AllowedEmoteSources): void {
        // -------------------------------------
        // Rate Limiting: Team Pings & Emotes.
        // -------------------------------------
        if (!this.rateLimitCheck()) return;
        // -------------------------------------

        if (
            source !== undefined
            && !this.game.pluginManager.emit("player_will_emote", {
                player: this,
                emote: source
            })
        ) {
            if (
                ("itemType" in source)
                && (source.itemType === ItemType.Ammo || source.itemType === ItemType.Healing)
                && !this.game.teamMode
            ) return;

            this.game.emotes.push(new Emote(source, this));

            this.game.pluginManager.emit("player_did_emote", {
                player: this,
                emote: source
            });
        }
    }

    sendMapPing(ping: PlayerPing, position: Vector): void {
        // -------------------------------------
        // Rate Limiting: Team Pings & Emotes.
        // -------------------------------------
        if (!this.rateLimitCheck()) return;
        // -------------------------------------

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

        this.updateAndApplyModifiers();

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
        if (this.perkUpdateMap) {
            for (const [perk, lastUpdated] of this.perkUpdateMap.entries()) {
                if (this.game.now - lastUpdated > perk.updateInterval) {
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
                            this.sendEmote(Emotes.fromStringSafe(perk.emote));
                            this.piercingDamage({
                                amount: perk.healthLoss
                            });
                            this.adrenaline -= this.adrenaline * (perk.adrenLoss / 100);
                            break;
                        }
                        case PerkIds.Shrouded: {
                            this.game.addSyncedParticle(SyncedParticles.fromString("shrouded_particle"), this.position, this.layer, this.id)
                                .setTarget(randomPointInsideCircle(this.position, 5), 1000, EaseFunctions.circOut);
                            break;
                        }
                    }
                    // ! evil ends here
                }
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

        // Calculate speed
        const speed = this.baseSpeed                                          // Base speed
            * (FloorTypes[this.floor].speedMultiplier ?? 1)                   // Speed multiplier from floor player is standing in
            * recoilMultiplier                                                // Recoil from items
            * perkSpeedMod                                                    // See above
            * (this.action?.speedMultiplier ?? 1)                             // Speed modifier from performing actions
            * (1 + (this.adrenaline / 1000))                                  // Linear speed boost from adrenaline
            * (this.downed ? 0.5 : this.activeItemDefinition.speedMultiplier) // Active item/knocked out speed modifier
            * (this.beingRevivedBy ? 0.5 : 1)                                 // Being revived speed multiplier
            * this._modifiers.baseSpeed;                                      // Current on-wearer modifier

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

        let toRegen = this._modifiers.hpRegen;
        if (this._adrenaline > 0) {
            // Drain adrenaline
            this.adrenaline -= 0.0005 * this._modifiers.adrenDrain * dt;

            // Regenerate health
            toRegen += (this.adrenaline / 40 + 0.35) * this.mapPerkOrDefault(
                PerkIds.LacedStimulants,
                ({ healDmgRate, lowerHpLimit }) => (this.health <= lowerHpLimit ? 1 : -healDmgRate),
                1
            );
        }

        this.health += dt / 900 * toRegen;

        // Shoot gun/use item
        if (this.startedAttacking) {
            this.game.pluginManager.emit("player_start_attacking", this);
            this.startedAttacking = false;
            this.disableInvulnerability();
            this.activeItem.useItem();
        }

        if (this.stoppedAttacking) {
            this.game.pluginManager.emit("player_stop_attacking", this);
            this.stoppedAttacking = false;
            this.activeItem.stopUse();
        }

        // Gas damage
        const gas = this.game.gas;
        if (gas.doDamage && gas.isInGas(this.position)) {
            this.piercingDamage({
                amount: gas.scaledDamage(this.position),
                source: KillfeedEventType.Gas
            });
        }

        // Knocked out damage
        if (this.downed && !this.beingRevivedBy) {
            this.piercingDamage({
                amount: GameConstants.player.bleedOutDPMs * dt,
                source: KillfeedEventType.BleedOut
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

            // For convenience and readability
            type ScopeBlockingParticle = SyncedParticleDefinition & { readonly hitbox: Hitbox };
            // If lifetime - age > scope out time, we have the potential to zoom in the scope
            if (depleter._lifetime - (this.game.now - depleter._creationDate)
                >= ((def as ScopeBlockingParticle).scopeOutPreMs ?? 0)) {
                scopeTarget ??= (def as ScopeBlockingParticle).snapScopeTo;
            }

            if (depletion.health) {
                this.piercingDamage({
                    amount: depletion.health * dt,
                    source: KillfeedEventType.Gas
                //          ^^^^^^^^^^^^^^^^^^^^^ dubious
                });
            }

            if (depletion.adrenaline) {
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
                !door?.isObstacle
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
                for (const door of openedDoors) door.interact();
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
        const packet: SMutable<Partial<UpdatePacketDataIn>> = {};

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

            const dim = player.zoom * 2 + 8;
            this.screenHitbox = RectangleHitbox.fromRect(dim, dim, player.position);

            const visCache = new ExtendedMap<GameObject, boolean>();
            const newVisibleObjects = game.grid.intersectsHitbox(this.screenHitbox);

            packet.deletedObjects = [...this.visibleObjects]
                .filter(
                    object => (
                        (
                            !newVisibleObjects.has(object)
                            || !isVisibleFromLayer(this.layer, object, object?.hitbox && [...game.grid.intersectsHitbox(object.hitbox)])
                        )
                        && (this.visibleObjects.delete(object), true)
                        && (!object.isObstacle || !object.definition.isStair)
                    )
                )
                .map(({ id }) => id);

            newVisibleObjects
                .forEach(
                    object => {
                        if (
                            (
                                this.visibleObjects.has(object)
                                || !(
                                    visCache.getAndGetDefaultIfAbsent(
                                        object,
                                        () => isVisibleFromLayer(this.layer, object, object?.hitbox && [...game.grid.intersectsHitbox(object.hitbox)])
                                    )
                                )
                            )
                            && (!object.isObstacle || !object.definition.isStair)
                        ) return;

                        this.visibleObjects.add(object);
                        fullObjects.add(object);
                    }
                );
        }

        for (const object of game.fullDirtyObjects) {
            if (!this.visibleObjects.has(object as GameObject)) continue;
            fullObjects.add(object);
        }

        packet.partialObjectsCache = [...game.partialDirtyObjects].filter(
            object => this.visibleObjects.has(object as GameObject) && !fullObjects.has(object)
        );

        const inventory = player.inventory;
        let forceInclude = false;

        if (this.startedSpectating && this.spectating) {
            forceInclude = true;

            // this line probably doesn't do anything
            // packet.fullObjectsCache.push(this.spectating);
            this.startedSpectating = false;
        }

        packet.playerData = {
            ...(
                player.dirty.maxMinStats || forceInclude
                    ? { minMax: {
                        maxHealth: player.maxHealth,
                        minAdrenaline: player.minAdrenaline,
                        maxAdrenaline: player.maxAdrenaline
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
                    ? { teammates: player._team?.players ?? [] }
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
                                count: item instanceof GunItem
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
                    ? { activeC4s: this.c4s.length > 0 }
                    : {}
            ),
            ...(
                player.dirty.perks || forceInclude
                    ? { perks: this.perks }
                    : {}
            )
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

        // Emotes
        packet.emotes = game.emotes.filter(({ player }) => this.visibleObjects.has(player));

        const gas = game.gas;

        packet.gas = gas.dirty || this._firstPacket ? { ...gas } : undefined;
        packet.gasProgress = gas.completionRatioDirty || this._firstPacket ? gas.completionRatio : undefined;

        const newPlayers = this._firstPacket
            ? [...game.grid.pool.getCategory(ObjectCategory.Player)]
            : game.newPlayers;

        // new and deleted players
        packet.newPlayers = newPlayers.map(({ id, name, hasColor, nameColor, loadout: { badge } }) => ({
            id,
            name,
            hasColor,
            nameColor: hasColor ? nameColor : undefined,
            badge
        } as (UpdatePacketDataCommon["newPlayers"] & object)[number]));

        if (this.game.teamMode) {
            for (const teammate of newPlayers.filter(({ teamID }) => teamID === player.teamID)) {
                fullObjects.add(teammate);
            }
        }

        packet.fullObjectsCache = [...fullObjects];

        packet.deletedPlayers = game.deletedPlayers;

        // alive count
        packet.aliveCount = game.aliveCountDirty || this._firstPacket ? game.aliveCount : undefined;

        // killfeed messages
        const killLeader = game.killLeader;

        packet.planes = game.planes;
        packet.mapPings = [...game.mapPings, ...this._mapPings];
        this._mapPings.length = 0;

        // serialize and send update packet
        this.sendPacket(UpdatePacket.create(packet as UpdatePacketDataIn));

        if (this._firstPacket && killLeader) {
            this._packets.push(KillFeedPacket.create({
                messageType: KillfeedMessageType.KillLeaderAssigned,
                victimId: killLeader.id,
                attackerKills: killLeader.kills,
                hideFromKillfeed: true
            }));
        }

        this._firstPacket = false;

        this._packetStream.stream.index = 0;
        for (const packet of this._packets) {
            this._packetStream.serializeServerPacket(packet);
        }

        for (const packet of this.game.packets) {
            this._packetStream.serializeServerPacket(packet);
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

    hasPerk(perk: PerkNames | PerkDefinition): boolean {
        return this.perks.hasPerk(perk);
    }

    ifPerkPresent<Name extends PerkNames>(
        perk: Name | PerkDefinition & { readonly idString: Name },
        cb: (data: PerkDefinition & { readonly idString: Name }) => void
    ): void {
        return this.perks.ifPresent<Name>(perk, cb);
    }

    mapPerk<Name extends PerkNames, U>(
        perk: Name | PerkDefinition & { readonly idString: Name },
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U
    ): U | undefined {
        return this.perks.map<Name, U>(perk, mapper);
    }

    mapPerkOrDefault<Name extends PerkNames, U>(
        perk: Name | PerkDefinition & { readonly idString: Name },
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U,
        defaultValue: U
    ): U {
        return this.perks.mapOrDefault<Name, U>(perk, mapper, defaultValue);
    }

    spectate(packet: SpectatePacketData): void {
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
                const reportID = randomBytes(4).toString("hex");
                // SERVER HOSTERS assign your custom server an ID somewhere then pass it into the report body region: region
                const reportJson = {
                    id: reportID,
                    reporterName: this.name,
                    suspectName: this.spectating?.name,
                    suspectIP: this.spectating?.ip,
                    reporterIP: this.ip
                };

                this.sendPacket(ReportPacket.create({
                    playerName: this.spectating?.name ?? "",
                    reportID: reportID
                }));
                if (Config.protection) {
                    const reportURL = String(Config.protection?.ipChecker?.logURL);
                    const reportData = {
                        embeds: [
                            {
                                title: "Report Received",
                                description: `Report ID: \`${reportID}\``,
                                color: 16711680,
                                fields: [
                                    {
                                        name: "Username",
                                        value: `\`${this.spectating?.name}\``
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

                    // Send report to Discord
                    fetch(reportURL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(reportData)
                    }).catch(error => {
                        console.error("Error: ", error);
                    });

                    // Post the report to the server
                    fetch(`${Config.protection?.punishments?.url}/reports`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "api-key": Config?.protection?.punishments?.password || "" },
                        body: JSON.stringify(reportJson)
                    }).then(response => response.json())
                        .then(console.log)
                        .catch((e: unknown) => console.error(e));
                }
            }
        }

        if (toSpectate === undefined) return;

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

    private readonly _packets: InputPacket[] = [];

    sendPacket(packet: InputPacket): void {
        this._packets.push(packet);
    }

    disconnect(reason: string): void {
        const stream = new PacketStream(new ArrayBuffer(128));
        stream.serializeServerPacket(
            DisconnectPacket.create({
                reason
            })
        );

        this.sendData(stream.getBuffer());
        this.disconnected = true;
        // timeout to make sure disconnect packet is sent
        setTimeout(() => {
            this.game.removePlayer(this);
        }, 10);
    }

    sendData(buffer: ArrayBuffer): void {
        try {
            this.socket.send(buffer, true, false);
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

        if (amount < 0 || this.dead) amount = 0;

        return amount;
    }

    override damage(params: DamageParams): void {
        if (this.invulnerable) return;

        const { source, weaponUsed } = params;
        let { amount } = params;

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
            )
        ) return;

        amount = this._clampDamageAmount(amount);

        if (
            this.game.pluginManager.emit("player_will_piercing_damaged", {
                player: this,
                amount,
                source,
                weaponUsed
            })
        ) return;

        const canTrackStats = weaponUsed instanceof InventoryItem;
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
    }

    private _calculateModifiers(): PlayerModifiers {
        const newModifiers = defaultModifiers();
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
                    this.perks.removePerk(perk);

                    const halloweenPerks = Perks.definitions.filter(perkDef => {
                        return !perkDef.plumpkinGambleIgnore && perkDef.category === PerkCategories.Halloween;
                    });
                    this.perks.addPerk(pickRandomInArray(halloweenPerks));
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
                        maxHealth: (base + perk.hpMod) / base,
                        sizeMod: perk.sizeMod
                    });
                    break;
                }
                case PerkIds.Berserker: {
                    if (this.activeItem instanceof MeleeItem) {
                        newModifiers.baseSpeed *= perk.speedMod;
                    }
                    break;
                }
                case PerkIds.LowProfile: {
                    newModifiers.size *= perk.sizeMod;
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

        let action: Action | undefined;
        if ((action = this.beingRevivedBy?.action) instanceof ReviveAction) {
            action.cancel();
        }

        const sourceIsPlayer = source instanceof Player;

        if (sourceIsPlayer) {
            this.killedBy = source;
            if (source !== this && (!this.game.teamMode || source.teamID !== this.teamID)) source.kills++;

            for (const perk of source.perks) {
                switch (perk.idString) {
                    case PerkIds.BabyPlumpkinPie: {
                        source.swapWeaponRandomly(undefined, true);
                        break;
                    }

                    case PerkIds.Engorged: {
                        if (source.kills <= perk.killsLimit) {
                            source.sizeMod *= perk.sizeMod;
                            source.maxHealth *= perk.hpMod;
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
        }

        if (
            sourceIsPlayer
            // firstly, 'GameObject in KillfeedEventType' returns false;
            // secondly, so does 'undefined in KillfeedEventType';
            // thirdly, enum double-indexing means that 'KillfeedEventType.<whatever> in KillfeedEventType' returns true
            // @ts-expect-error see above
            || source in KillfeedEventType
        ) {
            const message = createKillfeedMessage(KillfeedMessageType.DeathOrDown)
                .victimId(this.id);

            const attributeToPlayer = (player: Player, item: InventoryItem | null = player.activeItem): void => {
                (
                    message as ForEventType<
                        | KillfeedEventType.NormalTwoParty
                        | KillfeedEventType.FinishedOff
                        | KillfeedEventType.FinallyKilled
                        | KillfeedEventType.Gas
                        | KillfeedEventType.BleedOut
                        | KillfeedEventType.Airdrop
                    >
                ).attackerId(player.id)
                    .attackerKills(player.kills);

                if (item !== null) {
                    if (
                        [
                            KillfeedEventType.Suicide,
                            KillfeedEventType.NormalTwoParty,
                            KillfeedEventType.FinishedOff
                        ].includes(message.eventType() as DamageParams["source"] & KillfeedEventType)
                    ) {
                        const msg = (message as ForEventType<
                            KillfeedEventType.Suicide |
                            KillfeedEventType.NormalTwoParty |
                            KillfeedEventType.FinishedOff
                        >).weaponUsed(item.definition);

                        if (item.definition.killstreak) {
                            msg.killstreak(item.stats.kills);
                        }
                    }
                }
            };

            const attributeToDowner = (withWeapon = false): boolean => {
                const downer = this.downedBy;
                if (!downer) return false;

                const { player, item } = downer;

                ++player.kills;
                if (
                    (item instanceof GunItem || item instanceof MeleeItem)
                    && player.inventory.weapons.includes(item)
                ) {
                    const kills = ++item.stats.kills;

                    for (const entry of item.definition.wearerAttributes?.on?.kill ?? []) {
                        if (kills >= (entry.limit ?? Infinity)) continue;

                        player.health += entry.healthRestored ?? 0;
                        player.adrenaline += entry.adrenalineRestored ?? 0;
                    }
                }

                if (withWeapon) {
                    // see call sites for why this is safe
                    (
                        message as ForEventType<
                            | KillfeedEventType.NormalTwoParty
                            | KillfeedEventType.FinishedOff
                        >
                    ).weaponUsed(item?.definition);
                }

                attributeToPlayer(player, item);

                return true;
            };

            if (
                (
                    [
                        KillfeedEventType.FinallyKilled,
                        KillfeedEventType.Gas,
                        KillfeedEventType.BleedOut
                    ].includes as (arg: DamageParams["source"]) => arg is DamageParams["source"] & KillfeedEventType
                )(source)
            ) {
                message.eventType(source);

                attributeToDowner();
            } else if (sourceIsPlayer) {
                if (source === this) {
                    message.eventType(KillfeedEventType.Suicide)
                        .weaponUsed(weaponUsed?.definition);
                } else {
                    message.eventType(
                        wasDowned
                            ? KillfeedEventType.FinishedOff
                            : KillfeedEventType.NormalTwoParty
                    ).weaponUsed(weaponUsed?.definition);

                    if (
                        this.teamID === undefined // if we're in solos…
                        || source.teamID !== this.teamID // …or the killer is in a different team from the downer…
                        || !attributeToDowner(true) // …or if attributing to the downer fails (because they can't be found)…
                    ) {
                        attributeToPlayer(source, weaponUsed instanceof Explosion ? null : weaponUsed); // …then attribute to the killer
                    }
                }
            } else if (source instanceof BaseGameObject) {
                console.warn(`Unexpected source of death for player '${this.name}' (id: ${this.id}); source is of category ${ObjectCategory[source.type]}`);
            }

            this.game.packets.push(
                KillFeedPacket.create(message.build())
            );
        }

        // Reset movement and attacking variables
        this.movement.up = this.movement.down = this.movement.left = this.movement.right = false;
        this.startedAttacking = false;
        this.attacking = false;
        this.stoppedAttacking = false;
        this.game.aliveCountDirty = true;
        this.adrenaline = 0;
        this.dirty.items = true;
        this.action?.cancel();
        this.sendEmote(this.loadout.emotes[5]);

        this.game.livingPlayers.delete(this);
        this.game.updateGameData({ aliveCount: this.game.aliveCount });
        this.game.fullDirtyObjects.add(this);
        removeFrom(this.game.spectatablePlayers, this);

        if (this.activeItem instanceof ThrowableItem) {
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
                if (
                    def.noDrop
                    || ("ephemeral" in def && def.ephemeral)
                ) continue;

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
            if (item?.noDrop === false) {
                this.game.addLoot(item, position, layer);
            }
        }

        this.inventory.helmet = this.inventory.vest = undefined;

        // Drop skin
        const { skin } = this.loadout;
        if (skin.hideFromLoadout && !skin.noDrop) {
            this.game.addLoot(skin, position, layer);
        }

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

        // Send game over to dead player
        if (!this.disconnected) {
            this.sendGameOverPacket();
        }

        // Remove player from kill leader
        if (this === this.game.killLeader) {
            this.game.killLeaderDead(sourceIsPlayer ? source : undefined);
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
                    source: KillfeedEventType.FinallyKilled
                });
            }

            // team can't be nullish here because if it were, it would fail the conditional this code is wrapped in
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.game.teams.delete(team!);
        }
    }

    down(
        source?: GameObject | (typeof KillfeedEventType)["Gas" | "Airdrop" | "BleedOut" | "FinallyKilled"],
        weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion
    ): void {
        const sourceIsPlayer = source instanceof Player;

        if (sourceIsPlayer || source === KillfeedEventType.Gas || source === KillfeedEventType.Airdrop) {
            const message = createKillfeedMessage(KillfeedMessageType.DeathOrDown)
                .severity(KillfeedEventSeverity.Down)
                .victimId(this.id);

            if (sourceIsPlayer) {
                this.downedBy = {
                    player: source,
                    item: weaponUsed instanceof InventoryItem ? weaponUsed : undefined
                };

                if (source !== this) {
                    message.eventType(KillfeedEventType.NormalTwoParty)
                        .attackerId(source.id)
                        .weaponUsed(weaponUsed?.definition);
                }
            } else {
                message.eventType(source);
            }

            this.game.packets.push(
                KillFeedPacket.create(message.build())
            );
        }

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
        const packet = GameOverPacket.create({
            won,
            playerID: this.id,
            kills: this.kills,
            damageDone: this.damageDone,
            damageTaken: this.damageTaken,
            timeAlive: (this.game.now - this.joinTime) / 1000,
            rank: won ? 1 as const : this.game.aliveCount + 1
        } as GameOverData);

        this.sendPacket(packet);

        for (const spectator of this.spectators) {
            spectator.sendPacket(packet);
        }
    }

    processInputs(packet: PlayerInputData): void {
        this.movement = {
            ...packet.movement,
            ...(packet.isMobile ? packet.mobile : { moving: false, angle: 0 })
        };

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
                            && !(isLoot && [ItemType.Throwable, ItemType.Gun].includes(object.definition.itemType) && this.perks.hasPerk(PerkIds.Lycanthropy))
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
                    if (this.activeItem instanceof GunItem) {
                        this.activeItem.reload();
                    }
                    break;
                case InputActions.Cancel:
                    this.action?.cancel();
                    break;
                case InputActions.Emote:
                    this.sendEmote(action.emote);
                    break;
                case InputActions.MapPing:
                    this.sendMapPing(action.ping, action.position);
                    break;
                case InputActions.ExplodeC4:
                    for (const c4 of this.c4s) {
                        c4.detonate(750);
                    }
                    this.c4s.length = 0;
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
                blockEmoting: this.blockEmoting
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
