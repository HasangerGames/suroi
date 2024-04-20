import { randomBytes } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { type WebSocket } from "uWebSockets.js";
import { AnimationType, GameConstants, InputActions, KillfeedEventSeverity, KillfeedEventType, KillfeedMessageType, ObjectCategory, PlayerActions, SpectateActions } from "../../../common/src/constants";
import { type BadgeDefinition } from "../../../common/src/definitions/badges";
import { Emotes, type EmoteDefinition } from "../../../common/src/definitions/emotes";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { Loots, type WeaponDefinition } from "../../../common/src/definitions/loots";
import { type MapPingDefinition } from "../../../common/src/definitions/mapPings";
import { DEFAULT_SCOPE, Scopes, type ScopeDefinition } from "../../../common/src/definitions/scopes";
import { type SkinDefinition } from "../../../common/src/definitions/skins";
import { type SyncedParticleDefinition } from "../../../common/src/definitions/syncedParticles";
import { type ThrowableDefinition } from "../../../common/src/definitions/throwables";
import { GameOverPacket } from "../../../common/src/packets/gameOverPacket";
import { type InputPacket } from "../../../common/src/packets/inputPacket";
import { PacketStream, type Packet } from "../../../common/src/packets/packetStream";
import { ReportPacket } from "../../../common/src/packets/reportPacket";
import { type SpectatePacket } from "../../../common/src/packets/spectatePacket";
import { UpdatePacket, type KillFeedMessage, type PlayerData } from "../../../common/src/packets/updatePacket";
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
import { type Team } from "../team";
import { removeFrom } from "../utils/misc";
import { Building } from "./building";
import { DeathMarker } from "./deathMarker";
import { Emote } from "./emote";
import { type Explosion } from "./explosion";
import { BaseGameObject, type GameObject } from "./gameObject";
import { Loot } from "./loot";
import { type Obstacle } from "./obstacle";
import { SyncedParticle } from "./syncedParticle";

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
        this.team?.setDirty();
        this.health = this._health;
    }

    private _health = this._maxHealth;

    normalizedHealth = 0;

    get health(): number { return this._health; }
    set health(health: number) {
        this._health = Math.min(health, this._maxHealth);
        this.team?.setDirty();
        this.dirty.health = true;
        this.normalizedHealth = Numeric.remap(this.health, 0, this.maxHealth, 0, 1);
    }

    private _maxAdrenaline = GameConstants.player.maxAdrenaline;

    normalizedAdrenaline = 0;

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
        this.normalizedAdrenaline = Numeric.remap(this.adrenaline, this.minAdrenaline, this.maxAdrenaline, 0, 1);
    }

    private _modifiers = {
        // Multiplicative
        maxHealth: 1,
        maxAdrenaline: 1,
        baseSpeed: 1,

        // Additive
        minAdrenaline: 0
    };
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/lines-between-class-members
    get modifiers() { return this._modifiers; }

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
        items: true,
        throwable: true,
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
            !wasReload &&
            value === undefined &&
            this.activeItem instanceof GunItem &&
            this.activeItem.ammo <= 0 &&
            this.inventory.items.hasItem((this.activeItemDefinition as GunDefinition).ammoType)
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

    lastSwitch = 0;
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
        this.hitbox.position = position;
        this.team?.setDirty();
    }

    private _movementVector = Vec.create(0, 0);
    get movementVector(): Vector { return Vec.clone(this._movementVector); }

    spawnPosition: Vector = Vec.create(this.game.map.width / 2, this.game.map.height / 2);

    mapPings: Game["mapPings"] = [];

    // objectToPlace: GameObject & { position: Vector, definition: ObjectDefinition };

    constructor(game: Game, socket: WebSocket<PlayerContainer>, position: Vector, team?: Team) {
        super(game, position);

        if (team) {
            this.team = team;
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

        /* Object placing code start //
        this.objectToPlace = new Obstacle(game, "window2", position);
        game.grid.addObject(this.objectToPlace);
        // Object placing code end */

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
            const [weaponA, weaponB, melee] = userData.weaponPreset.split(" ");

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const oldDeterminePreset = (slot: 0 | 1 | 2, char: string): void => {
                switch (slot) {
                    case 0:
                    case 1: {
                        switch (char) {
                            case "0": {
                                this.inventory.addOrReplaceWeapon(slot, "deathray");
                                (this.inventory.getWeapon(slot) as GunItem).ammo = 1;
                                break;
                            }
                            case "1":
                            case "2":
                            case "3":
                            case "4":
                            case "5":
                            case "6": {
                                this.inventory.addOrReplaceWeapon(slot, "revitalizer");
                                const revit = this.inventory.getWeapon(slot) as GunItem;
                                revit.ammo = 5;
                                revit.stats.kills = Number.parseInt(char, 10) - 1;
                                this.inventory.items.setItem("12g", 15);
                                break;
                            }
                            case "7": {
                                this.inventory.addOrReplaceWeapon(slot, "usas12");
                                (this.inventory.getWeapon(slot) as GunItem).ammo = 10;
                                this.inventory.items.setItem("12g", 15);
                                break;
                            }
                            case "8": {
                                this.inventory.addOrReplaceWeapon(slot, "s_g17");
                                (this.inventory.getWeapon(slot) as GunItem).ammo = 100;
                                break;
                            }
                            case "usas12": {
                                this.inventory.addOrReplaceWeapon(slot, "usas12");
                                (this.inventory.getWeapon(slot) as GunItem).ammo = 100;
                                break;
                            }
                        }
                        break;
                    }
                    case 2: {
                        switch (char) {
                            case "0": {
                                this.inventory.addOrReplaceWeapon(2, "heap_sword");
                                break;
                            }
                            case "1": {
                                this.inventory.addOrReplaceWeapon(2, "kbar");
                                break;
                            }
                        }
                        break;
                    }
                }
            };
            const determinePreset = (slot: 0 | 1 | 2, weaponName: string): void => {
                try {
                    this.inventory.addOrReplaceWeapon(slot, weaponName);
                    const weapon = this.inventory.getWeapon(slot) as GunItem;
                    weapon.ammo = 10000;
                    weapon._modifiers.maxAdrenaline = 2;
                    weapon._modifiers.maxHealth = 2;
                } catch (err) {
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    console.error(`Error in determinePreset: ${err}`);
                }
            };
            determinePreset(0, weaponA);
            determinePreset(1, weaponB);
            determinePreset(2, melee);

            this.inventory.items.setItem("2x_scope", 1);
            this.inventory.items.setItem("4x_scope", 1);
            this.inventory.items.setItem("8x_scope", 1);
            this.inventory.items.setItem("15x_scope", 1);
            this.inventory.scope = "8x_scope";
            this.inventory.backpack = Loots.fromString("tactical_pack");
            this.inventory.vest = Loots.fromString("tactical_vest");
            this.inventory.helmet = Loots.fromString("tactical_helmet");
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
        this.inventory.items.incrementItem(idString, count ?? 3);
        this.inventory.useItem(idString);
        this.inventory.throwableItemMap.get(idString)!.count = this.inventory.items.getItem(idString);
    }

    spawnPos(position: Vector): void {
        this.spawnPosition = position;
    }

    sendEmote(emote?: EmoteDefinition): void {
        if (!this.loadout.emotes.includes(emote) && !emote?.isTeamEmote) return;

        if (emote) {
            this.game.emotes.push(new Emote(emote, this));
        }
    }

    sendMapPing(ping: MapPingDefinition, position: Vector): void {
        if (!ping.isPlayerPing) return;

        if (this.team) {
            for (const player of this.team.players) {
                if (!player) continue;

                player.mapPings.push({
                    definition: ping,
                    position,
                    playerId: this.id
                });
            }
            return;
        }

        this.mapPings.push({
            definition: ping,
            position,
            playerId: this.id
        });
    }

    update(): void {
        const dt = GameConstants.msPerTick;

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

        /* eslint-disable no-multi-spaces */
        const speed = Config.movementSpeed *                // Base speed
            (FloorTypes[this.floor].speedMultiplier ?? 1) * // Speed multiplier from floor player is standing in
            recoilMultiplier *                              // Recoil from items
            (this.action?.speedMultiplier ?? 1) *           // Speed modifier from performing actions
            (1 + (this.adrenaline / 1000)) *                // Linear speed boost from adrenaline
            this.activeItemDefinition.speedMultiplier *     // Active item speed modifier
            (this.downed ? 0.5 : 1) *                       // Knocked out speed multiplier
            (this.beingRevivedBy ? 0.5 : 1) *                 // Being revived speed multiplier
            this.modifiers.baseSpeed;                       // Current on-wearer modifier

        const oldPosition = Vec.clone(this.position);
        const movementVector = Vec.scale(movement, speed);
        this._movementVector = movementVector;
        this.position = Vec.add(
            this.position,
            Vec.scale(movementVector, dt)
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

        /* Object placing code start //
        const position = Vec.add(
            this.position,
            Vec.create(Math.cos(this.rotation) * this.distanceToMouse, Math.sin(this.rotation) * this.distanceToMouse)
        );
        const obj = this.objectToPlace;
        obj.position = position;
        if (this.game.emotes.length > 0) {
            obj.rotation += 1;
            obj.rotation %= 4;
        }
        this.objectToPlace.setDirty();
        if (this.startedAttacking) {
            const map = this.game.map;
            const round = (n: number): number => Math.round(n * 100) / 100;
            console.log(`{ idString: "${obj.definition.idString}", position: Vec.create(${round(obj.position.x - map.width / 2)}, ${round(obj.position.y - map.height / 2)}), rotation: ${obj.rotation} },`);
            //console.log(`Vec.create(${round(position.x - map.width / 2)}, ${round(position.y - map.height / 2)}),`);
        }
        // Object placing code end */

        // Find and resolve collisions
        this.nearObjects = this.game.grid.intersectsHitbox(this.hitbox);

        for (let step = 0; step < 10; step++) {
            let collided = false;
            for (const potential of this.nearObjects) {
                if (
                    potential.type === ObjectCategory.Obstacle &&
                    potential.collidable &&
                    this.hitbox.collidesWith(potential.hitbox)
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
            this.startedAttacking = false;
            this.disableInvulnerability();
            this.activeItem.useItem();
        }

        if (this.stoppedAttacking) {
            this.stoppedAttacking = false;
            this.activeItem.stopUse();
        }

        const gas = this.game.gas;
        // Gas damage
        if (gas.doDamage && gas.isInGas(this.position)) {
            this.piercingDamage(gas.dps, KillfeedEventType.Gas);
        }

        // Knocked out damage
        if (this.downed && !this.beingRevivedBy) {
            this.piercingDamage(GameConstants.bleedOutDPMs * dt, KillfeedEventType.BleedOut);
        }

        let isInsideBuilding = false;
        const depleters = new Set<SyncedParticleDefinition>();
        for (const object of this.nearObjects) {
            if (
                !isInsideBuilding &&
                object instanceof Building &&
                !object.dead &&
                object.scopeHitbox?.collidesWith(this.hitbox)
            ) {
                isInsideBuilding = true;
            }

            if (
                object instanceof SyncedParticle &&
                object.hitbox?.collidesWith(this.hitbox)
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
                this.piercingDamage(depletion.health * dt, KillfeedEventType.Gas);
                //                                         ^^^^^^^^^^^^ dubious
            }

            if (depletion.adrenaline) {
                this.adrenaline = Math.max(0, this.adrenaline - depletion.adrenaline * dt);
            }
        });

        if (scopeTarget !== undefined || this.isInsideBuilding || this.downed) {
            this.effectiveScope = scopeTarget ?? DEFAULT_SCOPE;
        }

        this.turning = false;
    }

    private _firstPacket = true;

    packetStream = new PacketStream(SuroiBitStream.alloc(1 << 16));

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

            this.screenHitbox = RectangleHitbox.fromRect(
                player.zoom * 2 + 8,
                player.zoom * 2 + 8,
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
            normalizedHealth: player.normalizedHealth,
            normalizedAdrenaline: player.normalizedAdrenaline,
            maxHealth: player.maxHealth,
            minAdrenaline: player.minAdrenaline,
            maxAdrenaline: player.maxAdrenaline,
            zoom: player._scope.zoomLevel,
            id: player.id,
            teammates: this.game.teamMode ? this.team!.players.filter(p => p.id !== this.id) : [],
            spectating: this.spectating !== undefined,
            dirty: player.dirty,
            inventory: {
                activeWeaponIndex: inventory.activeWeaponIndex,
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
        for (const bullet of game.newBullets) {
            if (Collision.lineIntersectsRectTest(bullet.initialPosition,
                bullet.finalPosition,
                this.screenHitbox.min,
                this.screenHitbox.max)) {
                packet.bullets.push(bullet);
            }
        }

        // Cull explosions
        for (const explosion of game.explosions) {
            if (this.screenHitbox.isPointInside(explosion.position) ||
                Geometry.distanceSquared(explosion.position, this.position) < 128 ** 2) {
                packet.explosions.push(explosion);
            }
        }

        // Emotes
        for (const emote of game.emotes) {
            if (this.visibleObjects.has(emote.player)) {
                packet.emotes.push(emote);
            }
        }

        // gas
        packet.gas = {
            ...game.gas,
            dirty: game.gas.dirty || this._firstPacket
        };

        packet.gasProgress = {
            dirty: game.gas.completionRatioDirty || this._firstPacket,
            value: game.gas.completionRatio
        };

        // new and deleted players
        packet.newPlayers = this._firstPacket
            ? [...game.grid.pool.getCategory(ObjectCategory.Player)]
            : game.newPlayers;

        packet.deletedPlayers = game.deletedPlayers;

        // alive count
        packet.aliveCount = game.aliveCount;
        packet.aliveCountDirty = game.aliveCountDirty || this._firstPacket;

        // killfeed messages
        packet.killFeedMessages = game.killFeedMessages;
        const killLeader = game.killLeader;

        if (this._firstPacket && killLeader) {
            packet.killFeedMessages.push({
                messageType: KillfeedMessageType.KillLeaderAssigned,
                victimId: killLeader.id,
                attackerKills: killLeader.kills,
                hideFromKillfeed: true
            });
        }

        packet.planes = game.planes;
        packet.mapPings = [...game.mapPings, ...this.mapPings];
        this.mapPings.length = 0;

        // serialize and send update packet
        this.sendPacket(packet);
        this._firstPacket = false;

        this.packetStream.stream.index = 0;
        for (const packet of this.packets) {
            this.packetStream.serializePacket(packet);
        }
        this.packets.length = 0;
        this.sendData(this.packetStream.getBuffer());
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
                if (this.game.teamMode && this.team?.hasLivingPlayers()) {
                    // Find closest teammate
                    toSpectate = this.team.getLivingPlayers()
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
                if (!existsSync("reports")) mkdirSync("reports");
                const reportID = randomBytes(4).toString("hex");
                writeFileSync(`reports/${reportID}.json`, JSON.stringify({
                    ip: this.spectating?.ip,
                    name: this.spectating?.name,
                    time: this.game.now
                }));
                const packet = new ReportPacket();
                packet.playerName = this.spectating?.name ?? "";
                packet.reportID = reportID;
                this.sendPacket(packet);
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

    override damage(amount: number, source?: GameObject, weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion): void {
        if (this.invulnerable) return;

        // Reductions are merged additively
        amount *= 1 - (
            (this.inventory.helmet?.damageReduction ?? 0) + (this.inventory.vest?.damageReduction ?? 0)
        );

        amount = this._clampDamageAmount(amount);

        this.piercingDamage(amount, source, weaponUsed);
    }

    /**
     * Deals damage whilst ignoring protective modifiers but not invulnerability
     */
    piercingDamage(
        amount: number,
        source?: GameObject | KillfeedEventType.Gas | KillfeedEventType.Airdrop | KillfeedEventType.BleedOut,
        weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion
    ): void {
        if (
            this.invulnerable ||
            (
                this.game.teamMode &&
                source instanceof Player &&
                source.teamID === this.teamID &&
                source.id !== this.id &&
                !this.disconnected
            )
        ) return;

        amount = this._clampDamageAmount(amount);

        const canTrackStats = weaponUsed instanceof GunItem || weaponUsed instanceof MeleeItem;
        const attributes = canTrackStats ? weaponUsed.definition.wearerAttributes?.on : undefined;
        const sourceIsPlayer = source instanceof Player;
        const applyPlayerFX = sourceIsPlayer
            ? (modifiers: ExtendedWearerAttributes): void => {
                source.health += modifiers.healthRestored ?? 0;
                source.adrenaline += modifiers.adrenalineRestored ?? 0;
            }
            : () => {};

        // Decrease health; update damage done and damage taken
        this.health -= amount;
        if (amount > 0) {
            this.damageTaken += amount;

            if (canTrackStats && !this.dead) {
                const damageDealt = weaponUsed.stats.damage += amount;

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
            if (this.game.teamMode && this._team!.players.some(p => !p.dead && !p.downed && !p.disconnected && p !== this) && !this.downed) {
                this.down(source, weaponUsed);
            } else {
                if (canTrackStats) {
                    const kills = ++weaponUsed.stats.kills;

                    if (sourceIsPlayer) {
                        for (const entry of attributes?.kill ?? []) {
                            if (kills >= (entry.limit ?? Infinity)) continue;

                            applyPlayerFX(entry);
                        }
                    }
                }

                this.die(source, weaponUsed);
            }
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

            newModifiers.maxAdrenaline *= weapon._modifiers.maxAdrenaline;
            newModifiers.maxHealth *= weapon._modifiers.maxHealth;
            newModifiers.baseSpeed *= weapon._modifiers.baseSpeed;
            newModifiers.minAdrenaline += weapon._modifiers.minAdrenaline;
        }

        this._modifiers = newModifiers;
        this.maxHealth = GameConstants.player.defaultHealth * this._modifiers.maxHealth;
        this.maxAdrenaline = GameConstants.player.maxAdrenaline * this._modifiers.maxAdrenaline;
        this.minAdrenaline = this.modifiers.minAdrenaline;
    }

    // dies of death
    die(
        source?: GameObject | (typeof KillfeedEventType)["Gas" | "Airdrop" | "BleedOut" | "FinallyKilled"],
        weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion
    ): void {
        if (this.health > 0 || this.dead) return;

        this.health = 0;
        this.dead = true;
        const wasDowned = this.downed;
        this.downed = false;
        this.canDespawn = false;
        this.team?.setDirty();

        let action: Action | undefined;
        if ((action = this.beingRevivedBy?.action) instanceof ReviveAction) {
            action.cancel();
        }

        const sourceIsPlayer = source instanceof Player;
        // Send kill packets
        if (sourceIsPlayer) {
            this.killedBy = source;
            if (source !== this && (!this.game.teamMode || source.teamID !== this.teamID)) source.kills++;

            /*
            // Weapon swap event
            const inventory = source.inventory;
            const index = source.activeItemIndex;
            inventory.removeWeapon(index);
            inventory.setActiveWeaponIndex(index);
            switch (index) {
                case 0:
                case 1: {
                    const gun = pickRandomInArray(Guns.filter(g => !g.killstreak));
                    inventory.addOrReplaceWeapon(index, gun);
                    const { ammoType } = gun;
                    if (gun.ammoSpawnAmount) inventory.items[ammoType] = Math.min(inventory.backpack.maxCapacity[ammoType], inventory.items[ammoType] + gun.ammoSpawnAmount);
                    break;
                }
                case 2: {
                    inventory.addOrReplaceWeapon(index, pickRandomInArray(Melees.filter(m => !m.killstreak)));
                    break;
                }
            }
            */
        }

        if (
            sourceIsPlayer ||
            // firstly, 'GameObject in KillfeedEventType' returns false;
            // secondly, so does 'undefined in KillfeedEventType';
            // thirdly, enum double-indexing means that 'KillfeedEventType.<whatever> in KillfeedEventType' returns true
            // @ts-expect-error see above (shove it es-cope)
            source in KillfeedEventType
        ) {
            const killFeedMessage: KillFeedMessage = {
                messageType: KillfeedMessageType.DeathOrDown,
                victimId: this.id,
                victimBadge: this.loadout.badge,
                weaponUsed: weaponUsed?.definition
            };

            const attributeToPlayer = (player: Player, item = player.activeItem): void => {
                killFeedMessage.attackerId = player.id;
                killFeedMessage.attackerKills = player.kills;
                if (player.loadout.badge) {
                    killFeedMessage.attackBadge = player.loadout.badge;
                }

                if (item.definition.killstreak) {
                    killFeedMessage.killstreak = item.stats.kills;
                }
            };

            if (source === KillfeedEventType.FinallyKilled) {
                killFeedMessage.eventType = source;

                const antecedent = this.downedBy;
                if (antecedent) {
                    const { player, item } = antecedent;

                    ++player.kills;
                    if (
                        (item instanceof GunItem || item instanceof MeleeItem) &&
                        player.inventory.weapons.includes(item)
                    ) {
                        const kills = ++item.stats.kills;

                        for (
                            const entry of item.definition.wearerAttributes?.on?.kill ?? []
                        ) {
                            if (kills >= (entry.limit ?? Infinity)) continue;

                            player.health += entry.healthRestored ?? 0;
                            player.adrenaline += entry.adrenalineRestored ?? 0;
                        }
                    }

                    killFeedMessage.weaponUsed = item?.definition;
                    attributeToPlayer(player, item);
                }
            } else if (sourceIsPlayer) {
                if (source !== this) {
                    killFeedMessage.eventType = wasDowned
                        ? KillfeedEventType.FinishedOff
                        : KillfeedEventType.NormalTwoParty;

                    attributeToPlayer(source);
                }
            } else if (source instanceof BaseGameObject) {
                console.warn(`Unexpected source of death for player '${this.name}' (id: ${this.id}); source is of category ${ObjectCategory[source.type]}`);
            } else {
                killFeedMessage.eventType = source;
            }

            this.game.killFeedMessages.push(killFeedMessage);
        }

        // Reset movement and attacking variables
        this.movement.up = false;
        this.movement.down = false;
        this.movement.left = false;
        this.movement.right = false;
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
        this.inventory.dropWeapons();

        // Drop inventory items
        for (const item in this.inventory.items.asRecord()) {
            const count = this.inventory.items.getItem(item);
            const def = Loots.fromString(item);

            if (count > 0) {
                if (
                    def.noDrop ||
                    ("ephemeral" in def && def.ephemeral)
                ) continue;

                if (def.itemType === ItemType.Ammo && count !== Infinity) {
                    let left = count;
                    let subtractAmount = 0;

                    do {
                        left -= subtractAmount = Math.min(left, def.maxStackSize);
                        this.game.addLoot(item, this.position, subtractAmount);
                    } while (left > 0);

                    continue;
                }

                this.game.addLoot(item, this.position, count);
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
                player.die(KillfeedEventType.FinallyKilled);
            }

            this.game.teams.delete(team!);
        }
    }

    down(
        source?: GameObject | (typeof KillfeedEventType)["Gas" | "Airdrop" | "BleedOut" | "FinallyKilled"],
        weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion
    ): void {
        const sourceIsPlayer = source instanceof Player;

        if (sourceIsPlayer || source === KillfeedEventType.Gas || source === KillfeedEventType.Airdrop) {
            const killFeedMessage: KillFeedMessage = {
                messageType: KillfeedMessageType.DeathOrDown,
                severity: KillfeedEventSeverity.Down,
                victimId: this.id,
                victimBadge: this.loadout.badge,
                weaponUsed: weaponUsed?.definition
            };

            if (sourceIsPlayer) {
                this.downedBy = {
                    player: source,
                    item: weaponUsed instanceof InventoryItem ? weaponUsed : undefined
                };

                if (source !== this) {
                    killFeedMessage.eventType = KillfeedEventType.NormalTwoParty;
                    killFeedMessage.attackerId = source.id;
                    if (source.loadout.badge) {
                        killFeedMessage.attackBadge = source.loadout.badge;
                    }
                }
            } else {
                killFeedMessage.eventType = source;
            }

            this.game.killFeedMessages.push(killFeedMessage);
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
        return !player.downed &&
            this.downed &&
            !this.beingRevivedBy &&
            this !== player &&
            this.teamID === player.teamID;
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

        const oldAttackState = this.attacking;
        const attackState = packet.attacking;

        this.attacking = attackState;
        this.startedAttacking ||= !oldAttackState && attackState;
        this.stoppedAttacking ||= oldAttackState && !attackState;

        this.turning = packet.turning;
        if (this.turning) {
            this.rotation = packet.rotation;
            if (!this.isMobile) this.distanceToMouse = packet.distanceToMouse;
        }

        const inventory = this.inventory;
        for (const action of packet.actions) {
            switch (action.type) {
                case InputActions.UseItem: {
                    inventory.useItem(action.item);
                    break;
                }
                case InputActions.EquipLastItem:
                case InputActions.EquipItem: {
                    const target = action.type === InputActions.EquipItem
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
                            (object instanceof Loot) &&
                            object.hitbox.collidesWith(detectionHitbox)
                        ) {
                            const dist = Geometry.distanceSquared(object.position, this.position);
                            if (
                                object instanceof Loot &&
                                dist < uninteractable.minDist &&
                                object.canInteract(this)
                            ) {
                                uninteractable.minDist = dist;
                                uninteractable.object = object;
                            }
                        }
                    }
                    if (uninteractable.object) {
                        uninteractable.object?.interact(this, false);
                    }

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
                            ((object.type === ObjectCategory.Obstacle || object.type === ObjectCategory.Player) && object.canInteract(this)) &&
                            object.hitbox.collidesWith(detectionHitbox)
                        ) {
                            const dist = Geometry.distanceSquared(object.position, this.position);
                            if ((object.type === ObjectCategory.Obstacle || object.type === ObjectCategory.Player) && dist < interactable.minDist) {
                                interactable.minDist = dist;
                                interactable.object = object;
                            }
                        }
                    }

                    if (interactable.object) {
                        interactable.object.interact(this);

                        if (interactable.object.type === ObjectCategory.Obstacle && interactable.object.isDoor) {
                            // If the closest object is a door, interact with other doors within range
                            for (const object of nearObjects) {
                                if (
                                    object.type === ObjectCategory.Obstacle &&
                                    object.isDoor &&
                                    !object.door?.locked &&
                                    object !== interactable.object &&
                                    object.hitbox.collidesWith(detectionHitbox)
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
