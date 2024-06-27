import { randomBytes } from "crypto";
import { type WebSocket } from "uWebSockets.js";
import { AnimationType, GameConstants, InputActions, KillfeedEventSeverity, KillfeedEventType, KillfeedMessageType, ObjectCategory, PlayerActions, SpectateActions } from "../../../common/src/constants";
import { Ammos } from "../../../common/src/definitions/ammos";
import { type BadgeDefinition } from "../../../common/src/definitions/badges";
import { Emotes, type EmoteDefinition } from "../../../common/src/definitions/emotes";
import { Guns, type GunDefinition } from "../../../common/src/definitions/guns";
import { Loots, type WeaponDefinition } from "../../../common/src/definitions/loots";
import { type PlayerPing } from "../../../common/src/definitions/mapPings";
import { Melees, type MeleeDefinition } from "../../../common/src/definitions/melees";
import { DEFAULT_SCOPE, Scopes, type ScopeDefinition } from "../../../common/src/definitions/scopes";
import { type SkinDefinition } from "../../../common/src/definitions/skins";
import { type SyncedParticleDefinition } from "../../../common/src/definitions/syncedParticles";
import { type ThrowableDefinition } from "../../../common/src/definitions/throwables";
import { DisconnectPacket } from "../../../common/src/packets/disconnectPacket";
import { GameOverPacket } from "../../../common/src/packets/gameOverPacket";
import { type InputPacket } from "../../../common/src/packets/inputPacket";
import { KillFeedPacket } from "../../../common/src/packets/killFeedPacket";
import { type Packet } from "../../../common/src/packets/packet";
import { PacketStream } from "../../../common/src/packets/packetStream";
import { ReportPacket } from "../../../common/src/packets/reportPacket";
import { type SpectatePacket } from "../../../common/src/packets/spectatePacket";
import { UpdatePacket, type PlayerData } from "../../../common/src/packets/updatePacket";
import { CircleHitbox, RectangleHitbox, type Hitbox } from "../../../common/src/utils/hitbox";
import { Collision, Geometry, Numeric } from "../../../common/src/utils/math";
import { type Timeout } from "../../../common/src/utils/misc";
import { ItemType, type ExtendedWearerAttributes, type ReferenceTo, type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { pickRandomInArray } from "../../../common/src/utils/random";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { FloorTypes } from "../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { Config } from "../config";
import { type Game } from "../game";
import { HealingAction, ReloadAction, ReviveAction, type Action } from "../inventory/action";
import { GunItem } from "../inventory/gunItem";
import { Inventory } from "../inventory/inventory";
import { CountableInventoryItem, InventoryItem } from "../inventory/inventoryItem";
import { MeleeItem } from "../inventory/meleeItem";
import { ThrowableItem } from "../inventory/throwableItem";
import { Events } from "../pluginManager";
import { type Team } from "../team";
import { mod_api_data, sendPostRequest } from "../utils/apiHelper";
import { removeFrom } from "../utils/misc";
import { Building } from "./building";
import { DeathMarker } from "./deathMarker";
import { Emote } from "./emote";
import { type Explosion } from "./explosion";
import { BaseGameObject, DamageParams, type GameObject } from "./gameObject";
import { Loot } from "./loot";
import { type Obstacle } from "./obstacle";
import { SyncedParticle } from "./syncedParticle";
import { HealingItems } from "../../../common/src/definitions/healingItems";
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

export class Player extends BaseGameObject<ObjectCategory.Player> {
    override readonly type = ObjectCategory.Player;
    override readonly fullAllocBytes = 16;
    override readonly partialAllocBytes = 4;
    override readonly damageable = true;
    readonly hitbox: CircleHitbox;

    name: string;
    readonly ip?: string;

    teamID?: number;

    readonly loadout: {
        badge?: BadgeDefinition
        skin: SkinDefinition
        emotes: Array<EmoteDefinition | undefined>
    };

    joined = false;
    disconnected = false;

    private _team?: Team;
    get team(): Team | undefined { return this._team; }

    set team(value: Team) {
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
        this._health = Math.min(health, this._maxHealth);
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
        this._minAdrenaline = Math.min(minAdrenaline, this._maxAdrenaline);
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

    private _modifiers = {
        // Multiplicative
        maxHealth: 1,
        maxAdrenaline: 1,
        baseSpeed: 1,

        // Additive
        minAdrenaline: 0
    };

    /**
     * Returns a clone
     */
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    get modifiers() { return { ...this._modifiers }; }

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
    readonly dirty: PlayerData["dirty"] = {
        id: true,
        teammates: true,
        health: true,
        maxMinStats: true,
        adrenaline: true,
        weapons: true,
        slotLocks: true,
        items: true,
        zoom: true
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

    floor = "water";

    screenHitbox = RectangleHitbox.fromRect(1, 1);

    downed = false;
    beingRevivedBy?: Player;

    get position(): Vector {
        return this.hitbox.position;
    }

    set position(position: Vector) {
        if (Vec.equals(position, this.position)) return;

        this.hitbox.position = position;
        this._team?.setDirty();
    }

    baseSpeed = Config.movementSpeed;

    private _movementVector = Vec.create(0, 0);
    get movementVector(): Vector { return Vec.clone(this._movementVector); }

    spawnPosition: Vector = Vec.create(this.game.map.width / 2, this.game.map.height / 2);

    private readonly _mapPings: Game["mapPings"] = [];

    constructor(game: Game, socket: WebSocket<PlayerContainer>, position: Vector, team?: Team) {
        super(game, position);

        if (team) {
            this._team = team;
            this.teamID = team.id;

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
        this.hitbox = new CircleHitbox(GameConstants.player.radius, position);

        this.inventory.addOrReplaceWeapon(2, "fists");

        this.inventory.scope = "1x_scope";
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
            this.inventory.vest = Loots.fromString("tactical_vest");
            this.inventory.helmet = Loots.fromString("tactical_helmet");

            for (const { idString: item } of [...HealingItems, ...Scopes]) {
                this.inventory.items.setItem(item, backpack.maxCapacity[item]);
            }

            this.inventory.scope = "8x_scope";

            determinePreset(0, weaponA, killsA);
            determinePreset(1, weaponB, killB);
            determinePreset(2, melee, killsM);
        }

        this.updateAndApplyModifiers();

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
        this.inventory.items.setItem(
            primaryDefinition.ammoType,
            this.inventory.backpack.maxCapacity[primaryDefinition.ammoType]
        );
    }

    giveThrowable(idString: ReferenceTo<ThrowableDefinition>, count?: number): void {
        const { inventory } = this;

        inventory.items.incrementItem(idString, count ?? 3);
        inventory.useItem(idString);
        // we hope `throwableItemMap` is correctly sync'd
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        inventory.throwableItemMap.get(idString)!.count = inventory.items.getItem(idString);
    }

    fillInventory(): void {
        const { inventory } = this;

        inventory.scope = "4x_scope";
        inventory.backpack = Loots.fromString("tactical_pack");
        this.inventory.vest = Loots.fromString("tactical_vest");
        this.inventory.helmet = Loots.fromString("tactical_helmet");

        const { items } = inventory;

        items.setItem("2x_scope", 1);
        items.setItem("4x_scope", 1);
        items.setItem("8x_scope", 1);
        items.setItem("15x_scope", 1);

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

    sendEmote(emote?: EmoteDefinition): void {
        if (!this.loadout.emotes.includes(emote) && (!this.game.teamMode || !emote?.isTeamEmote)) return;

        if (emote) {
            this.game.emotes.push(new Emote(emote, this));
            this.game.pluginManager.emit(Events.Player_Emote, {
                player: this,
                emote
            });
        }
    }

    sendMapPing(ping: PlayerPing, position: Vector): void {
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
        this.game.pluginManager.emit(Events.Player_MapPing, {
            player: this,
            ping,
            position
        });
    }

    update(): void {
        const dt = this.game.dt;

        // This system allows opposite movement keys to cancel each other out.
        const movement = Vec.create(0, 0);

        const playerMovement = this.movement;
        if (this.isMobile && playerMovement.moving) {
            movement.x = Math.cos(playerMovement.angle) * 1.45;
            movement.y = Math.sin(playerMovement.angle) * 1.45;
        } else {
            if (playerMovement.up) movement.y--;
            if (playerMovement.down) movement.y++;
            if (playerMovement.left) movement.x--;
            if (playerMovement.right) movement.x++;
        }

        if (movement.x * movement.y !== 0) { // If the product is non-zero, then both of the components must be non-zero
            movement.x *= Math.SQRT1_2;
            movement.y *= Math.SQRT1_2;
        }

        // Calculate speed
        let recoilMultiplier = 1;
        if (this.recoil.active) {
            if (this.recoil.time < this.game.now) {
                this.recoil.active = false;
            } else {
                recoilMultiplier = this.recoil.multiplier;
            }
        }

        const speed = this.baseSpeed                        // Base speed
            * (FloorTypes[this.floor].speedMultiplier ?? 1) // Speed multiplier from floor player is standing in
            * recoilMultiplier                              // Recoil from items
            * (this.action?.speedMultiplier ?? 1)           // Speed modifier from performing actions
            * (1 + (this.adrenaline / 1000))                // Linear speed boost from adrenaline
            * (this.downed ? 1 : this.activeItemDefinition.speedMultiplier)     // Active item speed modifier
            * (this.downed ? 0.5 : 1)                       // Knocked out speed multiplier
            * (this.beingRevivedBy ? 0.5 : 1)               // Being revived speed multiplier
            * this.modifiers.baseSpeed;                     // Current on-wearer modifier

        const oldPosition = Vec.clone(this.position);
        const movementVector = Vec.scale(movement, speed);
        this._movementVector = movementVector;

        this.position = Vec.add(
            this.position,
            Vec.scale(this.movementVector, dt)
        );

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
        this.nearObjects = this.game.grid.intersectsHitbox(this.hitbox);

        for (let step = 0; step < 10; step++) {
            let collided = false;
            for (const potential of this.nearObjects) {
                if (
                    potential.type === ObjectCategory.Obstacle
                    && potential.collidable
                    && this.hitbox.collidesWith(potential.hitbox)
                ) {
                    collided = true;
                    this.hitbox.resolveCollision(potential.hitbox);
                }
            }
            if (!collided) break;
        }

        // World boundaries
        this.position.x = Numeric.clamp(this.position.x, this.hitbox.radius, this.game.map.width - this.hitbox.radius);
        this.position.y = Numeric.clamp(this.position.y, this.hitbox.radius, this.game.map.height - this.hitbox.radius);

        this.isMoving = !Vec.equals(oldPosition, this.position);

        if (this.isMoving) this.game.grid.updateObject(this);

        // Disable invulnerability if the player moves or turns
        if (this.isMoving || this.turning) {
            this.disableInvulnerability();
            this.setPartialDirty();

            if (this.isMoving) {
                this.floor = this.game.map.terrain.getFloor(this.position);
            }
        }

        // Drain adrenaline
        if (this._adrenaline > 0) {
            this.adrenaline -= 0.0005 * dt;
        }

        // Regenerate health
        if (this._adrenaline >= 87.5) this.health += dt * 2.75 / (30 ** 2);
        else if (this._adrenaline >= 50) this.health += dt * 2.125 / (30 ** 2);
        else if (this._adrenaline >= 25) this.health += dt * 1.125 / (30 ** 2);
        else if (this._adrenaline > 0) this.health += dt * 0.625 / (30 ** 2);

        // Shoot gun/use item
        if (this.startedAttacking) {
            this.game.pluginManager.emit(Events.Player_StartAttacking, this);
            this.startedAttacking = false;
            this.disableInvulnerability();
            this.activeItem.useItem();
        }

        if (this.stoppedAttacking) {
            this.game.pluginManager.emit(Events.Player_StopAttacking, this);
            this.stoppedAttacking = false;
            this.activeItem.stopUse();
        }

        const gas = this.game.gas;
        // Gas damage
        if (gas.doDamage && gas.isInGas(this.position)) {
            this.piercingDamage({
                amount: gas.dps,
                source: KillfeedEventType.Gas
            });
        }

        // Knocked out damage
        if (this.downed && !this.beingRevivedBy) {
            this.piercingDamage({
                amount: GameConstants.bleedOutDPMs * dt,
                source: KillfeedEventType.BleedOut
            });
        }

        let isInsideBuilding = false;
        const depleters = new Set<SyncedParticleDefinition>();
        for (const object of this.nearObjects) {
            if (
                !isInsideBuilding
                && object instanceof Building
                && !object.dead
                && object.scopeHitbox?.collidesWith(this.hitbox)
            ) {
                isInsideBuilding = true;
            }

            if (
                object instanceof SyncedParticle
                && object.hitbox?.collidesWith(this.hitbox)
            ) {
                depleters.add(object.definition);
            }
        }

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
        depleters.forEach(def => {
            const depletion = def.depletePerMs;

            // we arbitrarily take the first scope target we find and stick with it
            scopeTarget ??= (def as SyncedParticleDefinition & { readonly hitbox: Hitbox }).snapScopeTo;

            if (depletion.health) {
                this.piercingDamage({
                    amount: depletion.health * dt,
                    source: KillfeedEventType.Gas
                //          ^^^^^^^^^^^^^^^^^^^^^ dubious
                });
            }

            if (depletion.adrenaline) {
                this.adrenaline = Math.max(0, this.adrenaline - depletion.adrenaline * dt);
            }
        });

        if (scopeTarget !== undefined || this.isInsideBuilding || this.downed) {
            this.effectiveScope = scopeTarget ?? DEFAULT_SCOPE;
        }

        this.turning = false;
        this.game.pluginManager.emit(Events.Player_Update, this);
    }

    private _firstPacket = true;

    private readonly _packetStream = new PacketStream(SuroiBitStream.alloc(1 << 16));

    /**
     * Calculate visible objects, check team, and send packets
     */
    secondUpdate(): void {
        const packet = new UpdatePacket();

        const player = this.spectating ?? this;
        const game = this.game;

        // Calculate visible objects
        this.ticksSinceLastUpdate++;
        if (this.ticksSinceLastUpdate > 8 || game.updateObjects || this.updateObjects) {
            this.ticksSinceLastUpdate = 0;
            this.updateObjects = false;

            const dim = player.zoom * 2 + 8;
            this.screenHitbox = RectangleHitbox.fromRect(
                dim,
                dim,
                player.position
            );

            const newVisibleObjects = game.grid.intersectsHitbox(this.screenHitbox);

            for (const object of this.visibleObjects) {
                if (!newVisibleObjects.has(object)) {
                    this.visibleObjects.delete(object);
                    packet.deletedObjects.push(object.id);
                }
            }

            for (const object of newVisibleObjects) {
                if (!this.visibleObjects.has(object)) {
                    this.visibleObjects.add(object);
                    packet.fullObjectsCache.push(object);
                }
            }
        }

        for (const object of game.fullDirtyObjects) {
            if (this.visibleObjects.has(object as GameObject) && !packet.fullObjectsCache.includes(object)) {
                packet.fullObjectsCache.push(object);
            }
        }

        for (const object of game.partialDirtyObjects) {
            if (this.visibleObjects.has(object as GameObject) && !packet.fullObjectsCache.includes(object)) {
                packet.partialObjectsCache.push(object);
            }
        }

        const inventory = player.inventory;

        // player data
        packet.playerData = {
            normalizedHealth: player._normalizedHealth,
            normalizedAdrenaline: player._normalizedAdrenaline,
            maxHealth: player.maxHealth,
            minAdrenaline: player.minAdrenaline,
            maxAdrenaline: player.maxAdrenaline,
            zoom: player._scope.zoomLevel,
            id: player.id,
            teammates: player._team?.players.filter(p => p.id !== player.id) ?? [],
            spectating: this.spectating !== undefined,
            dirty: player.dirty,
            inventory: {
                activeWeaponIndex: inventory.activeWeaponIndex,
                lockedSlots: inventory.lockedSlots,
                scope: inventory.scope,
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
                    }) satisfies (PlayerData["inventory"]["weapons"] & object)[number];
                }),
                items: inventory.items.asRecord()
            }
        };

        if (this.startedSpectating && this.spectating) {
            for (const key in packet.playerData.dirty) {
                packet.playerData.dirty[key as keyof PlayerData["dirty"]] = true;
            }
            packet.fullDirtyObjects.push(this.spectating);
            this.startedSpectating = false;
        }

        // Cull bullets
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
        // gas
        packet.gas = {
            ...gas,
            dirty: gas.dirty || this._firstPacket
        };

        packet.gasProgress = {
            dirty: gas.completionRatioDirty || this._firstPacket,
            value: gas.completionRatio
        };

        const newPlayers = this._firstPacket
            ? [...game.grid.pool.getCategory(ObjectCategory.Player)]
            : game.newPlayers;

        // new and deleted players
        packet.newPlayers = newPlayers;

        if (this.game.teamMode) {
            for (const teammate of newPlayers.filter(p => p.teamID === player.teamID)) {
                packet.fullObjectsCache.push(teammate);
            }
        }

        packet.deletedPlayers = game.deletedPlayers;

        // alive count
        packet.aliveCount = game.aliveCount;
        packet.aliveCountDirty = game.aliveCountDirty || this._firstPacket;

        // killfeed messages
        const killLeader = game.killLeader;

        if (this._firstPacket && killLeader) {
            this.packets.push(KillFeedPacket.create({
                messageType: KillfeedMessageType.KillLeaderAssigned,
                victimId: killLeader.id,
                attackerKills: killLeader.kills,
                hideFromKillfeed: true
            }));
        }

        packet.planes = game.planes;
        packet.mapPings = [...game.mapPings, ...this._mapPings];
        this._mapPings.length = 0;

        // serialize and send update packet
        this.sendPacket(packet);
        this._firstPacket = false;

        this._packetStream.stream.index = 0;
        for (const packet of this.packets) {
            this._packetStream.serializeServerPacket(packet);
        }

        for (const packet of this.game.packets) {
            this._packetStream.serializeServerPacket(packet);
        }

        this.packets.length = 0;
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
            this.dirty[key as keyof PlayerData["dirty"]] = false;
        }
        this._animation.dirty = false;
        this._action.dirty = false;
    }

    spectate(packet: SpectatePacket): void {
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

                const packet = new ReportPacket();
                packet.playerName = this.spectating?.name ?? "";
                packet.reportID = reportID;
                this.sendPacket(packet);

                const reportURL = String(mod_api_data.API_WEBHOOK_URL);
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

                /*
                    Promise result ignored because we don't really care
                    what happens when we send a post request to Discord
                    for logging
                */
                sendPostRequest(reportURL, reportData)
                    .catch(error => {
                        console.error("Error: ", error);
                    });

                // Post the report to the server with the json
                sendPostRequest(`${mod_api_data.API_SERVER_URL}/reports`, reportJson)
                    .then(console.log)
                    .catch((e: unknown) => console.error(e));
                // i love eslint
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

    packets: Packet[] = [];

    sendPacket(packet: Packet): void {
        this.packets.push(packet);
    }

    disconnect(reason: string): void {
        const disconnectPacket = new DisconnectPacket();
        disconnectPacket.reason = reason;
        const stream = new PacketStream(new ArrayBuffer(128));
        stream.serializeServerPacket(disconnectPacket);
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

        this.game.pluginManager.emit(Events.Player_Damage, {
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

        this.game.pluginManager.emit(Events.Player_PiercingDamage, {
            player: this,
            amount,
            source,
            weaponUsed
        });

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
                Events.InvItem_StatsChanged,
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

    updateAndApplyModifiers(): void {
        const newModifiers: this["modifiers"] = {
            maxHealth: 1,
            maxAdrenaline: 1,
            baseSpeed: 1,
            minAdrenaline: 0
        };

        const maxWeapons = GameConstants.player.maxWeapons;
        for (let i = 0; i < maxWeapons; i++) {
            const weapon = this.inventory.getWeapon(i);

            if (weapon === undefined) continue;

            const modifiers = weapon.modifiers;

            newModifiers.maxAdrenaline *= modifiers.maxAdrenaline;
            newModifiers.maxHealth *= modifiers.maxHealth;
            newModifiers.baseSpeed *= modifiers.baseSpeed;
            newModifiers.minAdrenaline += modifiers.minAdrenaline;
        }

        this._modifiers = newModifiers;
        this.maxHealth = GameConstants.player.defaultHealth * this._modifiers.maxHealth;
        this.maxAdrenaline = GameConstants.player.maxAdrenaline * this._modifiers.maxAdrenaline;
        this.minAdrenaline = this.modifiers.minAdrenaline;
    }

    // dies of death
    die(params: Omit<DamageParams, "amount">): void {
        if (this.health > 0 || this.dead) return;
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
        }

        if (
            sourceIsPlayer
            // firstly, 'GameObject in KillfeedEventType' returns false;
            // secondly, so does 'undefined in KillfeedEventType';
            // thirdly, enum double-indexing means that 'KillfeedEventType.<whatever> in KillfeedEventType' returns true
            // @ts-expect-error see above (shove it es-cope)
            || source in KillfeedEventType
        ) {
            const killFeedPacket = KillFeedPacket.create({
                messageType: KillfeedMessageType.DeathOrDown,
                victimId: this.id,
                weaponUsed: weaponUsed?.definition
            });

            const attributeToPlayer = (player: Player, item = player.activeItem): void => {
                killFeedPacket.attackerId = player.id;
                killFeedPacket.attackerKills = player.kills;

                if (item.definition.killstreak) {
                    killFeedPacket.killstreak = item.stats.kills;
                }
            };

            const attributeToDowner = (): boolean => {
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

                killFeedPacket.weaponUsed = item?.definition;
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
                killFeedPacket.eventType = source;

                attributeToDowner();
            } else if (sourceIsPlayer) {
                if (source !== this) {
                    killFeedPacket.eventType = wasDowned
                        ? KillfeedEventType.FinishedOff
                        : KillfeedEventType.NormalTwoParty;

                    if (
                        this.teamID === undefined // if we're in solos…
                        || source.teamID !== this.teamID // …or the killer is in a different team from the downer…
                        || !attributeToDowner() // …or if attributing to the downer fails (because they can't be found)…
                    ) {
                        attributeToPlayer(source); // …then attribute to the killer
                    }
                }
            } else if (source instanceof BaseGameObject) {
                console.warn(`Unexpected source of death for player '${this.name}' (id: ${this.id}); source is of category ${ObjectCategory[source.type]}`);
            } else {
                killFeedPacket.eventType = source;
            }

            this.game.packets.push(killFeedPacket);
        }

        this.game.pluginManager.emit(Events.Player_Death, {
            player: this,
            ...params
        });

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

        // Drop weapons
        this.inventory.unlockAll();
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
                        left -= subtractAmount = Math.min(left, def.maxStackSize);
                        this.game.addLoot(item, this.position, { count: subtractAmount });
                    } while (left > 0);

                    continue;
                }

                this.game.addLoot(item, this.position, { count });
                this.inventory.items.setItem(item, 0);
            }
        }

        // Drop equipment
        for (const itemType of ["helmet", "vest", "backpack"] as const) {
            const item = this.inventory[itemType];
            if (item?.noDrop === false) {
                this.game.addLoot(item, this.position);
            }
        }

        this.inventory.helmet = this.inventory.vest = undefined;

        // Drop skin
        const { skin } = this.loadout;
        if (skin.hideFromLoadout && !skin.noDrop) {
            this.game.addLoot(skin, this.position);
        }

        // Create death marker
        this.game.grid.addObject(new DeathMarker(this));

        // Send game over to dead player
        if (!this.disconnected) {
            this.sendGameOverPacket();
        }

        // Remove player from kill leader
        if (this === this.game.killLeader) {
            this.game.killLeaderDead(sourceIsPlayer ? source : undefined);
        }
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
            const killFeedMessage = KillFeedPacket.create({
                messageType: KillfeedMessageType.DeathOrDown,
                severity: KillfeedEventSeverity.Down,
                victimId: this.id,
                weaponUsed: weaponUsed?.definition
            });

            if (sourceIsPlayer) {
                this.downedBy = {
                    player: source,
                    item: weaponUsed instanceof InventoryItem ? weaponUsed : undefined
                };

                if (source !== this) {
                    killFeedMessage.eventType = KillfeedEventType.NormalTwoParty;
                    killFeedMessage.attackerId = source.id;
                }
            } else {
                killFeedMessage.eventType = source;
            }

            this.game.packets.push(killFeedMessage);
        }

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
        const packet = new GameOverPacket();
        packet.won = won;
        packet.playerID = this.id;
        packet.kills = this.kills;
        packet.damageDone = this.damageDone;
        packet.damageTaken = this.damageTaken;
        packet.timeAlive = (this.game.now - this.joinTime) / 1000;
        packet.rank = this.game.aliveCount + 1;
        this.sendPacket(packet);

        for (const spectator of this.spectators) {
            spectator.sendPacket(packet);
        }
    }

    processInputs(packet: InputPacket): void {
        this.movement = {
            ...packet.movement,
            ...packet.mobile
        };

        const wasAttacking = this.attacking;
        const isAttacking = packet.attacking;

        this.attacking = isAttacking;
        this.startedAttacking ||= !wasAttacking && isAttacking;
        this.stoppedAttacking ||= wasAttacking && !isAttacking;

        this.turning = packet.turning;
        if (this.turning) {
            this.rotation = packet.rotation;
            if (!this.isMobile) this.distanceToMouse = packet.distanceToMouse;
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
                    inventory.dropWeapon(action.slot);
                    break;
                }
                case InputActions.DropItem: {
                    if (!this.game.teamMode) break;
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
                    inventory.unlock(action.slot);
                    break;
                }
                case InputActions.ToggleSlotLock: {
                    const slot = action.slot;

                    inventory.isLocked(slot)
                        ? inventory.unlock(slot)
                        : inventory.lock(slot);
                    break;
                }
                case InputActions.Loot: {
                    interface CloseObject {
                        object: Loot | undefined
                        minDist: number
                    }

                    const uninteractable: CloseObject = {
                        object: undefined,
                        minDist: Number.MAX_VALUE
                    };
                    const detectionHitbox = new CircleHitbox(3, this.position);
                    const nearObjects = this.game.grid.intersectsHitbox(detectionHitbox);

                    for (const object of nearObjects) {
                        if (
                            (object instanceof Loot)
                            && object.hitbox.collidesWith(detectionHitbox)
                        ) {
                            const dist = Geometry.distanceSquared(object.position, this.position);
                            if (
                                object instanceof Loot
                                && dist < uninteractable.minDist
                            ) {
                                uninteractable.minDist = dist;
                                uninteractable.object = object;
                            }
                        }
                    }

                    uninteractable.object?.interact(this, !uninteractable.object.canInteract(this));

                    this.canDespawn = false;
                    this.disableInvulnerability();
                    break;
                }
                case InputActions.Interact: {
                    interface CloseObject {
                        object: Obstacle | Player | undefined
                        minDist: number
                    }

                    const interactable: CloseObject = {
                        object: undefined,
                        minDist: Number.MAX_VALUE
                    };
                    const detectionHitbox = new CircleHitbox(3, this.position);
                    const nearObjects = this.game.grid.intersectsHitbox(detectionHitbox);

                    for (const object of nearObjects) {
                        if (
                            (
                                object.type !== ObjectCategory.Obstacle && object.type !== ObjectCategory.Player
                            )
                            || !object.canInteract(this)
                            || !object.hitbox?.collidesWith(detectionHitbox)
                        ) continue;

                        const dist = Geometry.distanceSquared(object.position, this.position);
                        if (dist < interactable.minDist) {
                            interactable.minDist = dist;
                            interactable.object = object;
                        }
                    }

                    if (interactable.object) {
                        interactable.object.interact(this);

                        if (interactable.object.type === ObjectCategory.Obstacle && interactable.object.isDoor) {
                            // If the closest object is a door, interact with other doors within range
                            for (const object of nearObjects) {
                                if (
                                    object.type === ObjectCategory.Obstacle
                                    && object.isDoor
                                    && !object.door?.locked
                                    && object !== interactable.object
                                    && object.hitbox.collidesWith(detectionHitbox)
                                ) {
                                    object.interact(this);
                                }
                            }
                        }
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
            }
        }

        this.game.pluginManager.emit(Events.Player_Input, {
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
        const data: FullData<ObjectCategory.Player> = {
            position: this.position,
            rotation: this.rotation,
            full: {
                dead: this.dead,
                downed: this.downed,
                beingRevived: !!this.beingRevivedBy,
                teamID: this.teamID ?? 0,
                invulnerable: this.invulnerable,
                helmet: this.inventory.helmet,
                vest: this.inventory.vest,
                backpack: this.inventory.backpack,
                skin: this.loadout.skin,
                activeItem: this.activeItem.definition
            }
        };

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
