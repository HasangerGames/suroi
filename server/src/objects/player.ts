import { type WebSocket } from "uWebSockets.js";
import {
    AnimationType,
    DEFAULT_HEALTH,
    DEFAULT_USERNAME,
    InputActions,
    INVENTORY_MAX_WEAPONS,
    KillFeedMessageType,
    MAX_ADRENALINE,
    MAX_MOUSE_DISTANCE,
    ObjectCategory,
    PLAYER_RADIUS,
    PlayerActions,
    SpectateActions
} from "../../../common/src/constants";
import { type EmoteDefinition, Emotes } from "../../../common/src/definitions/emotes";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { Loots } from "../../../common/src/definitions/loots";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { type SkinDefinition } from "../../../common/src/definitions/skins";
import { CircleHitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { FloorTypes } from "../../../common/src/utils/mapUtils";
import { clamp, distanceSquared, lineIntersectsRect2 } from "../../../common/src/utils/math";
import { type ExtendedWearerAttributes, ItemType } from "../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { v, vAdd, vClone, type Vector, vEqual } from "../../../common/src/utils/vector";
import { type KillFeedMessage, type PlayerData, UpdatePacket } from "../../../common/src/packets/updatePacket";
import { Config } from "../config";
import { type Game } from "../game";
import { type Action, HealingAction, ReloadAction } from "../inventory/action";
import { GunItem } from "../inventory/gunItem";
import { Inventory } from "../inventory/inventory";
import { type InventoryItem } from "../inventory/inventoryItem";
import { MeleeItem } from "../inventory/meleeItem";
import { type PlayerContainer } from "../server";
import { GameObject } from "../types/gameObject";
import { removeFrom } from "../utils/misc";
import { Building } from "./building";
import { DeathMarker } from "./deathMarker";
import { Emote } from "./emote";
import { type Explosion } from "./explosion";
import { Obstacle } from "./obstacle";
import { type InputPacket } from "../../../common/src/packets/inputPacket";
import { Loot } from "./loot";
import { type Packet } from "../../../common/src/packets/packet";
import { GameOverPacket } from "../../../common/src/packets/gameOverPacket";
import { type SpectatePacket } from "../../../common/src/packets/spectatePacket";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { ReportPacket } from "../../../common/src/packets/reportPacket";
import { pickRandomInArray } from "../../../common/src/utils/random";

export class Player extends GameObject<ObjectCategory.Player> {
    override readonly type = ObjectCategory.Player;
    override readonly damageable = true;

    readonly hitbox: CircleHitbox;

    name: string;
    readonly ip?: string;

    readonly loadout: {
        skin: SkinDefinition
        emotes: EmoteDefinition[]
    };

    joined = false;
    disconnected = false;

    private _kills = 0;
    get kills(): number { return this._kills; }
    set kills(k: number) {
        this._kills = k;
        this.game.updateKillLeader(this);
    }

    private _maxHealth = DEFAULT_HEALTH;
    get maxHealth(): number { return this._maxHealth; }
    set maxHealth(maxHealth: number) {
        this._maxHealth = maxHealth;
        this.dirty.maxMinStats = true;
        this.health = this._health;
    }

    private _health = this._maxHealth;
    get health(): number { return this._health; }
    set health(health: number) {
        this._health = Math.min(health, this._maxHealth);

        this.dirty.health = true;
    }

    private _maxAdrenaline = MAX_ADRENALINE;
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
        this._adrenaline = Math.min(Math.max(adrenaline, this._minAdrenaline), this._maxAdrenaline);

        this.dirty.adrenaline = true;
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

    damageDone = 0;
    damageTaken = 0;
    readonly joinTime: number;

    lastInteractionTime = Date.now();

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
     * Whether the player is turning as of last update
     */
    turning = false;

    /**
     * The distance from the player position to the player mouse in game units
     */
    distanceToMouse = MAX_MOUSE_DISTANCE;

    /**
     * Keeps track of various fields which are "dirty"
     * and therefore need to be sent to the client for
     * updating
     */
    readonly dirty: PlayerData["dirty"] = {
        id: true,
        health: true,
        maxMinStats: true,
        adrenaline: true,
        weapons: true,
        items: true,
        zoom: true
    };

    // save current tick dirty status to send to spectators
    thisTickdirty!: this["dirty"];

    readonly inventory = new Inventory(this);

    get activeItemIndex(): number {
        return this.inventory.activeWeaponIndex;
    }

    get activeItem(): InventoryItem {
        return this.inventory.activeWeapon;
    }

    get activeItemDefinition(): MeleeDefinition | GunDefinition {
        return this.activeItem.definition;
    }

    bufferedAttack?: ReturnType<typeof setTimeout>;

    readonly animation = {
        type: AnimationType.None,
        // This boolean is flipped when an animation plays
        // when its changed the client plays the animation
        seq: false
    };

    actionSeq = 0;

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

    private _zoom!: number;
    get zoom(): number { return this._zoom; }
    set zoom(zoom: number) {
        if (this._zoom === zoom) return;

        this._zoom = zoom;
        this.xCullDist = this._zoom * 1.8;
        this.yCullDist = this._zoom * 1.35;
        this.dirty.zoom = true;
        this.updateObjects = true;
    }

    xCullDist!: number;
    yCullDist!: number;

    readonly socket: WebSocket<PlayerContainer>;

    private _action?: Action | undefined;
    get action(): Action | undefined { return this._action; }
    set action(value: Action | undefined) {
        const wasReload = this._action?.type === PlayerActions.Reload;
        this._action = value;

        // The action slot is now free, meaning our player isn't doing anything
        // Let's try reloading our empty gun then, unless we just cancelled a reload
        if (
            !wasReload &&
            value === undefined &&
            this.activeItem instanceof GunItem &&
            this.activeItem.ammo <= 0 &&
            this.inventory.items[(this.activeItemDefinition as GunDefinition).ammoType] !== 0
        ) {
            this._action = new ReloadAction(this, this.activeItem);
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
    readonly nameColor: string;

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

    get position(): Vector {
        return this.hitbox.position;
    }

    set position(position: Vector) {
        this.hitbox.position = position;
    }

    constructor(game: Game, socket: WebSocket<PlayerContainer>, position: Vector) {
        super(game, position);

        const userData = socket.getUserData();
        this.socket = socket;
        this.name = DEFAULT_USERNAME;
        this.ip = userData.ip;
        this.role = userData.role;
        this.isDev = userData.isDev;
        this.nameColor = userData.nameColor;
        this.hasColor = userData.nameColor !== undefined && (userData.nameColor.trim().length > 2) && userData.nameColor !== "none";

        this.loadout = {
            skin: Loots.fromString("hazel_jumpsuit"),
            emotes: [
                Emotes.fromString("happy_face"),
                Emotes.fromString("thumbs_up"),
                Emotes.fromString("suroi_logo"),
                Emotes.fromString("sad_face")
            ]
        };

        this.rotation = 0;

        this.joinTime = game.now;

        this.hitbox = new CircleHitbox(PLAYER_RADIUS, position);

        this.inventory.addOrReplaceWeapon(2, "fists");

        this.inventory.scope = "1x_scope";
        // this.inventory.items["15x_scope"] = 1;
        // this.inventory.scope = "15x_scope";

        // Inventory preset
        if (this.isDev && userData.lobbyClearing && !Config.disableLobbyClearing) {
            this.inventory.addOrReplaceWeapon(0, "deathray");
            (this.inventory.getWeapon(0) as GunItem).ammo = 1;

            this.inventory.addOrReplaceWeapon(1, "revitalizer");
            (this.inventory.getWeapon(1) as GunItem).ammo = 5;
            this.inventory.items["12g"] = 15;

            this.inventory.addOrReplaceWeapon(2, "heap_sword");

            this.inventory.items["2x_scope"] = 1;
            this.inventory.items["4x_scope"] = 1;
            this.inventory.scope = "4x_scope";
        }

        /*
        const giveWeapon = (idString: ReferenceTo<GunDefinition>, index: number): void => {
            this.inventory.addOrReplaceWeapon(index, idString);
            const primaryItem = this.inventory.getWeapon(index) as GunItem;
            const primaryDefinition = primaryItem.definition;
            primaryItem.ammo = primaryDefinition.capacity;
            this.inventory.items[primaryDefinition.ammoType] = Infinity;
        };
        */

        this.updateAndApplyModifiers();
        this.dirty.weapons = true;
    }

    emote(slot: number): void {
        this.game.emotes.add(new Emote(this.loadout.emotes[slot], this));
    }

    update(): void {
        // This system allows opposite movement keys to cancel each other out.
        const movement = v(0, 0);

        if (this.isMobile && this.movement.moving) {
            movement.x = Math.cos(this.movement.angle) * 1.45;
            movement.y = Math.sin(this.movement.angle) * 1.45;
        } else {
            if (this.movement.up) movement.y--;
            if (this.movement.down) movement.y++;
            if (this.movement.left) movement.x--;
            if (this.movement.right) movement.x++;
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
            this.modifiers.baseSpeed;                       // Current on-wearer modifier

        const oldPosition = vClone(this.position);
        this.position = vAdd(this.position, v(movement.x * speed, movement.y * speed));

        // Find and resolve collisions
        this.nearObjects = this.game.grid.intersectsHitbox(this.hitbox);

        for (let step = 0; step < 10; step++) {
            for (const potential of this.nearObjects) {
                if (
                    potential instanceof Obstacle &&
                    potential.collidable &&
                    this.hitbox.collidesWith(potential.hitbox)
                ) {
                    this.hitbox.resolveCollision(potential.hitbox);
                }
            }
        }

        // World boundaries
        this.position.x = clamp(this.position.x, this.hitbox.radius, this.game.map.width - this.hitbox.radius);
        this.position.y = clamp(this.position.y, this.hitbox.radius, this.game.map.height - this.hitbox.radius);

        this.isMoving = !vEqual(oldPosition, this.position);

        if (this.isMoving) this.game.grid.addObject(this);

        // Disable invulnerability if the player moves or turns
        if (this.isMoving || this.turning) {
            this.disableInvulnerability();
            this.game.partialDirtyObjects.add(this);

            if (this.isMoving) {
                this.floor = this.game.map.terrainGrid.getFloor(this.position);
            }
        }

        // Drain adrenaline
        if (this.adrenaline > 0) {
            this.adrenaline -= 0.015;
        }

        // Regenerate health
        if (this.adrenaline >= 87.5) this.health += 2.75 / this.game.tickDelta;
        else if (this.adrenaline >= 50) this.health += 2.125 / this.game.tickDelta;
        else if (this.adrenaline >= 25) this.health += 1.125 / this.game.tickDelta;
        else if (this.adrenaline > 0) this.health += 0.625 / this.game.tickDelta;

        // Shoot gun/use melee
        if (this.startedAttacking) {
            this.startedAttacking = false;
            this.disableInvulnerability();
            this.activeItem?.useItem();
        }

        // Gas damage
        if (this.game.gas.doDamage && this.game.gas.isInGas(this.position)) {
            this.piercingDamage(this.game.gas.dps, "gas");
        }

        let isInsideBuilding = false;
        for (const object of this.nearObjects) {
            if (object instanceof Building && !object.dead) {
                if (object.scopeHitbox?.collidesWith(this.hitbox)) {
                    isInsideBuilding = true;
                    break;
                }
            }
        }

        if (isInsideBuilding && !this.isInsideBuilding) {
            this.zoom = 48;
        } else if (!this.isInsideBuilding) {
            this.zoom = this.inventory.scope.zoomLevel;
        }
        this.isInsideBuilding = isInsideBuilding;

        this.turning = false;
    }

    private _firstPacket = true;

    /**
     * Calculate visible objects and send packets
     */
    secondUpdate(): void {
        const packet = new UpdatePacket();

        const player = this.spectating ?? this;

        // Calculate visible objects
        this.ticksSinceLastUpdate++;
        if (this.ticksSinceLastUpdate > 8 || this.game.updateObjects || this.updateObjects) {
            this.ticksSinceLastUpdate = 0;
            this.updateObjects = false;

            this.screenHitbox = RectangleHitbox.fromRect(
                2 * player.xCullDist,
                2 * player.yCullDist,
                player.position
            );

            const newVisibleObjects = this.game.grid.intersectsHitbox(this.screenHitbox);

            for (const object of this.visibleObjects) {
                if (!newVisibleObjects.has(object)) {
                    this.visibleObjects.delete(object);
                    packet.deletedObjects.add(object.id);
                }
            }

            for (const object of newVisibleObjects) {
                if (!this.visibleObjects.has(object)) {
                    this.visibleObjects.add(object);
                    packet.fullDirtyObjects.add(object);
                }
            }
        }

        for (const object of this.game.fullDirtyObjects) {
            if (this.visibleObjects.has(object)) {
                packet.fullDirtyObjects.add(object);
            }
        }

        for (const object of this.game.partialDirtyObjects) {
            if (this.visibleObjects.has(object) && !packet.fullDirtyObjects.has(object)) {
                packet.partialDirtyObjects.add(object);
            }
        }

        // player data
        packet.playerData = {
            health: player.health,
            adrenaline: player.adrenaline,
            maxHealth: player.maxHealth,
            minAdrenaline: player.minAdrenaline,
            maxAdrenaline: player.maxAdrenaline,
            zoom: player.zoom,
            id: player.id,
            spectating: this.spectating !== undefined,
            dirty: JSON.parse(JSON.stringify(player.thisTickdirty)),
            inventory: player.inventory
        };

        if (this.startedSpectating && this.spectating) {
            for (const key in packet.playerData.dirty) {
                packet.playerData.dirty[key as keyof PlayerData["dirty"]] = true;
            }
            packet.fullDirtyObjects.add(this.spectating);
            this.startedSpectating = false;
        }

        // Cull bullets
        for (const bullet of this.game.newBullets) {
            if (lineIntersectsRect2(bullet.initialPosition,
                bullet.finalPosition,
                this.screenHitbox.min,
                this.screenHitbox.max)) {
                packet.bullets.add(bullet);
            }
        }

        // Cull explosions
        for (const explosion of this.game.explosions) {
            if (this.screenHitbox.isPointInside(explosion.position) ||
                distanceSquared(explosion.position, this.position) < 16384) {
                packet.explosions.add(explosion);
            }
        }

        // Emotes
        for (const emote of this.game.emotes) {
            if (this.visibleObjects.has(emote.player)) {
                packet.emotes.add(emote);
            }
        }

        // gas
        packet.gas = {
            ...this.game.gas,
            dirty: this.game.gas.dirty || this._firstPacket
        };

        packet.gasPercentage = {
            dirty: this.game.gas.percentageDirty || this._firstPacket,
            value: this.game.gas.percentage
        };

        // new and deleted players
        if (this._firstPacket) packet.newPlayers = this.game.players;
        else packet.newPlayers = this.game.newPlayers;

        packet.deletedPlayers = this.game.deletedPlayers;

        // alive count
        packet.aliveCount = this.game.aliveCount;
        packet.aliveCountDirty = this.game.aliveCountDirty || this._firstPacket;

        // kill feed messages
        packet.killFeedMessages = this.game.killFeedMessages;
        const killLeader = this.game.killLeader;

        if (this._firstPacket && killLeader) {
            packet.killFeedMessages.add({
                messageType: KillFeedMessageType.KillLeaderAssigned,
                playerID: killLeader.id,
                kills: killLeader.kills,
                hideInKillFeed: true
            });
        }

        // serialize and send update packet
        this.sendPacket(packet);

        // reset stuff
        this._firstPacket = false;
        for (const key in this.dirty) {
            this.dirty[key as keyof PlayerData["dirty"]] = false;
        }
    }

    spectate(packet: SpectatePacket): void {
        if (!this.dead) return;
        const game = this.game;
        if (game.now - this.lastSpectateActionTime < 200) return;
        this.lastSpectateActionTime = game.now;

        let toSpectate: Player | undefined;

        const spectablePlayers = game.spectablePlayers;
        switch (packet.spectateAction) {
            case SpectateActions.BeginSpectating: {
                if (this.killedBy !== undefined && !this.killedBy.dead) toSpectate = this.killedBy;
                else if (spectablePlayers.length > 1) toSpectate = pickRandomInArray(spectablePlayers);
                break;
            }
            case SpectateActions.SpectatePrevious:
                if (this.spectating !== undefined) {
                    let index: number = spectablePlayers.indexOf(this.spectating) - 1;
                    if (index < 0) index = spectablePlayers.length - 1;
                    toSpectate = spectablePlayers[index];
                }
                break;
            case SpectateActions.SpectateNext:
                if (this.spectating !== undefined) {
                    let index: number = spectablePlayers.indexOf(this.spectating) + 1;
                    if (index >= spectablePlayers.length) index = 0;
                    toSpectate = spectablePlayers[index];
                }
                break;
            case SpectateActions.SpectateSpecific: {
                toSpectate = spectablePlayers.find(player => player.id === packet.playerID);
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
            this.game.fullDirtyObjects.add(this);
        }
    }

    screenHitbox = RectangleHitbox.fromRect(1, 1);

    sendPacket(packet: Packet): void {
        packet.serialize();
        this.sendData(packet.getBuffer());
    }

    sendData(buffer: ArrayBuffer): void {
        try {
            this.socket.send(buffer, true, true);
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

    override damage(amount: number, source?: GameObject, weaponUsed?: GunItem | MeleeItem | Explosion): void {
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
    piercingDamage(amount: number, source?: GameObject | "gas", weaponUsed?: GunItem | MeleeItem | Explosion): void {
        if (this.invulnerable) return;

        amount = this._clampDamageAmount(amount);

        const canTrackStats = weaponUsed instanceof GunItem || weaponUsed instanceof MeleeItem;
        const attributes = canTrackStats ? weaponUsed.definition.wearerAttributes?.on : undefined;
        const applyPlayerFX = (modifiers: ExtendedWearerAttributes): void => {
            if (source instanceof Player) {
                source.health += modifiers.healthRestored ?? 0;
                source.adrenaline += modifiers.adrenalineRestored ?? 0;
            }
        };

        // Decrease health; update damage done and damage taken
        this.health -= amount;
        if (amount > 0) {
            this.damageTaken += amount;

            if (canTrackStats && !this.dead) {
                const damageDealt = weaponUsed.stats.damage += amount;

                for (const entry of attributes?.damageDealt ?? []) {
                    if (damageDealt < (entry.limit ?? Infinity)) {
                        applyPlayerFX(entry);
                    }
                }
            }

            if (source instanceof Player) {
                if (source !== this) {
                    source.damageDone += amount;
                }
            }
        }

        if (this.health <= 0 && !this.dead) {
            if (canTrackStats) {
                const kills = ++weaponUsed.stats.kills;

                for (const entry of attributes?.kill ?? []) {
                    if (kills < (entry.limit ?? Infinity)) {
                        applyPlayerFX(entry);
                    }
                }
            }

            this.die(source, weaponUsed);
        }
    }

    updateAndApplyModifiers(): void {
        const newModifiers: this["modifiers"] = {
            maxHealth: 1,
            maxAdrenaline: 1,
            baseSpeed: 1,
            minAdrenaline: 0
        };

        for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
            const weapon = this.inventory.getWeapon(i);

            if (weapon === undefined) continue;

            newModifiers.maxAdrenaline *= weapon._modifiers.maxAdrenaline;
            newModifiers.maxHealth *= weapon._modifiers.maxHealth;
            newModifiers.baseSpeed *= weapon._modifiers.baseSpeed;
            newModifiers.minAdrenaline += weapon._modifiers.minAdrenaline;
        }

        this._modifiers = newModifiers;
        this.maxHealth = DEFAULT_HEALTH * this._modifiers.maxHealth;
        this.maxAdrenaline = MAX_ADRENALINE * this._modifiers.maxAdrenaline;
        this.minAdrenaline = this.modifiers.minAdrenaline;
    }

    // dies of death
    die(source?: GameObject | "gas", weaponUsed?: GunItem | MeleeItem | Explosion): void {
        // Death logic
        if (this.health > 0 || this.dead) return;

        this.health = 0;
        this.dead = true;
        this.canDespawn = false;

        // Send kill packets
        if (source instanceof Player) {
            this.killedBy = source;
            if (source !== this) source.kills++;

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

        if (source instanceof Player || source === "gas") {
            const killFeedMessage: KillFeedMessage = {
                messageType: KillFeedMessageType.Kill,
                playerID: this.id,
                weaponUsed: weaponUsed?.definition
            };
            if (source instanceof Player && source !== this) {
                killFeedMessage.killerID = source.id;
                killFeedMessage.kills = source.kills;
            } else if (source === "gas") {
                killFeedMessage.gasKill = true;
            }
            this.game.killFeedMessages.add(killFeedMessage);
        }

        // Destroy physics body; reset movement and attacking variables
        this.movement.up = false;
        this.movement.down = false;
        this.movement.left = false;
        this.movement.right = false;
        this.attacking = false;
        this.game.aliveCountDirty = true;
        this.adrenaline = 0;
        this.dirty.items = true;
        this.action?.cancel();

        this.game.livingPlayers.delete(this);
        this.game.removeObject(this);
        removeFrom(this.game.spectablePlayers, this);

        //
        // Drop loot
        //

        // Drop weapons
        this.inventory.dropWeapons();

        // Drop inventory items
        for (const item in this.inventory.items) {
            const count = this.inventory.items[item];
            const def = Loots.fromString(item);

            if (count > 0) {
                if (
                    def.noDrop === true ||
                    ("ephemeral" in def && def.ephemeral)
                ) continue;

                if (def.itemType === ItemType.Ammo && count !== Infinity) {
                    const maxCountPerPacket = 60;

                    let left = count;
                    let subtractAmount = 0;

                    do {
                        left -= subtractAmount = Math.min(left, maxCountPerPacket);
                        this.game.addLoot(item, this.position, subtractAmount);
                    } while (left > 0);

                    continue;
                }

                this.game.addLoot(item, this.position, count);
                this.inventory.items[item] = 0;
            }
        }

        // Drop equipment

        for (const itemType of ["helmet", "vest", "backpack"] as const) {
            const item = this.inventory[itemType];
            if (item && item.noDrop !== true) {
                this.game.addLoot(item, this.position);
            }
        }

        if (this.loadout.skin.notInLoadout && this.loadout.skin.noDrop !== true) {
            this.game.addLoot(
                this.loadout.skin,
                this.position
            );
        }

        this.inventory.helmet = this.inventory.vest = undefined;

        // Create death marker
        const deathMarker = new DeathMarker(this);
        this.game.grid.addObject(deathMarker);

        // Send game over to dead player
        if (!this.disconnected) {
            this.sendGameOverPacket();
        }

        // Remove player from kill leader
        if (this === this.game.killLeader) {
            this.game.killLeaderDead(source instanceof Player ? source : undefined);
        }
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
        packet.serialize();
        const buffer = packet.getBuffer();
        this.sendData(buffer);
        for (const spectator of this.spectators) {
            spectator.sendData(buffer);
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
        if (!oldAttackState && attackState) this.startedAttacking = true;

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
                    if (this.action?.type !== PlayerActions.Reload || target !== this.activeItemIndex) {
                        this.action?.cancel();
                    }

                    inventory.setActiveWeaponIndex(target);
                    break;
                }
                case InputActions.DropItem: {
                    this.action?.cancel();
                    inventory.dropWeapon(action.slot);
                    break;
                }
                case InputActions.SwapGunSlots: {
                    inventory.swapGunSlots();
                    break;
                }
                case InputActions.Interact: {
                    if (this.game.now - this.lastInteractionTime < 120) return;
                    this.lastInteractionTime = this.game.now;

                    interface CloseObject { object: Loot | Obstacle | undefined, minDist: number }
                    const interactable: CloseObject = {
                        object: undefined,
                        minDist: Number.MAX_VALUE
                    };
                    const uninteractable: CloseObject = {
                        object: undefined,
                        minDist: Number.MAX_VALUE
                    };
                    const detectionHitbox = new CircleHitbox(3, this.position);
                    const nearObjects = this.game.grid.intersectsHitbox(detectionHitbox);

                    for (const object of nearObjects) {
                        if (
                            (object instanceof Loot || (object instanceof Obstacle && object.canInteract(this))) &&
                            object.hitbox.collidesWith(detectionHitbox)
                        ) {
                            const dist = distanceSquared(object.position, this.position);
                            if ((object instanceof Obstacle || object.canInteract(this)) && dist < interactable.minDist) {
                                interactable.minDist = dist;
                                interactable.object = object;
                            } else if (
                                object instanceof Loot &&
                                object.definition.itemType !== ItemType.Gun &&
                                dist < uninteractable.minDist
                            ) {
                                uninteractable.minDist = dist;
                                uninteractable.object = object;
                            }
                        }
                    }

                    if (interactable.object) {
                        interactable.object.interact(this);

                        if ((interactable.object as Obstacle).isDoor) {
                            // If the closest object is a door, interact with other doors within range
                            for (const object of nearObjects) {
                                if (
                                    object instanceof Obstacle &&
                                    object.isDoor &&
                                    !object.door?.locked &&
                                    object !== interactable.object &&
                                    object.hitbox.collidesWith(detectionHitbox)
                                ) {
                                    object.interact(this);
                                }
                            }
                        }
                    } else if (uninteractable.object) {
                        uninteractable.object?.interact(this, true);
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
                case InputActions.TopEmoteSlot:
                    this.emote(0);
                    break;
                case InputActions.RightEmoteSlot:
                    this.emote(1);
                    break;
                case InputActions.BottomEmoteSlot:
                    this.emote(2);
                    break;
                case InputActions.LeftEmoteSlot:
                    this.emote(3);
                    break;
            }
        }
    }

    executeAction(action: Action): void {
        this.action?.cancel();
        this.action = action;
    }

    override get data(): Required<ObjectsNetData[ObjectCategory.Player]> {
        return {
            position: this.position,
            rotation: this.rotation,
            animation: this.animation,
            full: {
                invulnerable: this.invulnerable,
                helmet: this.inventory.helmet,
                vest: this.inventory.vest,
                backpack: this.inventory.backpack,
                skin: this.loadout.skin,
                activeItem: this.activeItem.definition,
                action: {
                    seq: this.actionSeq,
                    ...(() => {
                        return this.action instanceof HealingAction
                            ? { type: PlayerActions.UseItem, item: this.action.item }
                            : { type: (this.action?.type ?? PlayerActions.None) as Exclude<PlayerActions, PlayerActions.UseItem> };
                    })()
                }
            }
        };
    }
}
