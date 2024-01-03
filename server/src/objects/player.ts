import { randomBytes } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { type WebSocket } from "uWebSockets.js";
import { AnimationType, GameConstants, InputActions, KillFeedMessageType, KillType, ObjectCategory, PlayerActions, SpectateActions } from "../../../common/src/constants";
import { Emotes, type EmoteDefinition } from "../../../common/src/definitions/emotes";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { Loots, type WeaponDefinition } from "../../../common/src/definitions/loots";
import { type SkinDefinition } from "../../../common/src/definitions/skins";
import { GameOverPacket } from "../../../common/src/packets/gameOverPacket";
import { type InputPacket } from "../../../common/src/packets/inputPacket";
import { type Packet } from "../../../common/src/packets/packet";
import { ReportPacket } from "../../../common/src/packets/reportPacket";
import { type SpectatePacket } from "../../../common/src/packets/spectatePacket";
import { UpdatePacket, type KillFeedMessage, type PlayerData } from "../../../common/src/packets/updatePacket";
import { CircleHitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { Collision, Geometry, Numeric } from "../../../common/src/utils/math";
import { type Timeout } from "../../../common/src/utils/misc";
import { ItemType, type ExtendedWearerAttributes, type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { pickRandomInArray } from "../../../common/src/utils/random";
import { FloorTypes } from "../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { Config } from "../config";
import { type Game } from "../game";
import { HealingAction, ReloadAction, type Action } from "../inventory/action";
import { GunItem } from "../inventory/gunItem";
import { Inventory } from "../inventory/inventory";
import { CountableInventoryItem, type InventoryItem } from "../inventory/inventoryItem";
import { MeleeItem } from "../inventory/meleeItem";
import { ThrowableItem } from "../inventory/throwableItem";
import { type PlayerContainer } from "../server";
import { removeFrom } from "../utils/misc";
import { Building } from "./building";
import { DeathMarker } from "./deathMarker";
import { Emote } from "./emote";
import { type Explosion } from "./explosion";
import { BaseGameObject, type GameObject } from "./gameObject";
import { Loot } from "./loot";
import { Obstacle } from "./obstacle";

export class Player extends BaseGameObject<ObjectCategory.Player> {
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

    private _maxHealth = GameConstants.player.defaultHealth;
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

    private _maxAdrenaline = GameConstants.player.maxAdrenaline;
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
        health: true,
        maxMinStats: true,
        adrenaline: true,
        weapons: true,
        items: true,
        throwable: true,
        zoom: true
    };

    // save current tick dirty status to send to spectators
    thisTickDirty?: this["dirty"];

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

    readonly animation = {
        type: AnimationType.None,
        // This boolean is flipped when an animation plays
        // when it's changed, the client plays the animation
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
            this.inventory.items.hasItem((this.activeItemDefinition as GunDefinition).ammoType)
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

    get position(): Vector {
        return this.hitbox.position;
    }

    set position(position: Vector) {
        this.hitbox.position = position;
    }

    private _movementVector = Vec.create(0, 0);
    get movementVector(): Vector { return Vec.clone(this._movementVector); }

    //objectToPlace: GameObject & { position: Vector, definition: ObjectDefinition };

    constructor(game: Game, socket: WebSocket<PlayerContainer>, position: Vector) {
        super(game, position);

        const userData = socket.getUserData();
        this.socket = socket;
        this.name = GameConstants.player.defaultName;
        this.ip = userData.ip;
        this.role = userData.role;
        this.isDev = userData.isDev;
        this.nameColor = userData.nameColor ?? 0;
        this.hasColor = userData.nameColor !== undefined;

        /* Object placing code start //
        this.objectToPlace = new Obstacle(game, "regular_crate", position);
        game.grid.addObject(this.objectToPlace);
        // Object placing code end */

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

        this.hitbox = new CircleHitbox(GameConstants.player.radius, position);

        this.inventory.addOrReplaceWeapon(2, "fists");

        this.inventory.scope = "1x_scope";

        // Inventory preset
        if (this.isDev && userData.lobbyClearing && !Config.disableLobbyClearing) {
            this.inventory.addOrReplaceWeapon(0, "deathray");
            (this.inventory.getWeapon(0) as GunItem).ammo = 1;

            this.inventory.addOrReplaceWeapon(1, "revitalizer");
            (this.inventory.getWeapon(1) as GunItem).ammo = 5;
            this.inventory.items.setItem("12g", 15);

            this.inventory.addOrReplaceWeapon(2, "heap_sword");

            this.inventory.items.setItem("2x_scope", 1);
            this.inventory.items.setItem("4x_scope", 1);
            this.inventory.scope = "4x_scope";
        }

        this.updateAndApplyModifiers();
        this.dirty.weapons = true;
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

    emote(slot: number): void {
        this.game.emotes.add(new Emote(this.loadout.emotes[slot], this));
    }

    update(): void {
        const dt = GameConstants.msPerTick;

        // This system allows opposite movement keys to cancel each other out.
        const movement = Vec.create(0, 0);

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

        const oldPosition = Vec.clone(this.position);
        const movementVector = Vec.scale(movement, speed);
        this._movementVector = movementVector;
        this.position = Vec.add(
            this.position,
            Vec.scale(movementVector, dt)
        );

        /* Object placing code start //
        const position = Vec.add(
            this.position,
            Vec.create(Math.cos(this.rotation) * this.distanceToMouse, Math.sin(this.rotation) * this.distanceToMouse)
        );
        const obj = this.objectToPlace;
        obj.position = position;
        if (this.game.emotes.size > 0) {
            obj.rotation += 1;
            obj.rotation %= 4;
        }
        this.game.fullDirtyObjects.add(this.objectToPlace);
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
                    potential instanceof Obstacle &&
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
            this.game.partialDirtyObjects.add(this);

            if (this.isMoving) {
                this.floor = this.game.map.terrain.getFloor(this.position);
            }
        }

        // Drain adrenaline
        if (this.adrenaline > 0) {
            this.adrenaline -= 0.0005 * dt;
        }

        // Regenerate health
        if (this.adrenaline >= 87.5) this.health += dt * 2.75 / (30 ** 2);
        else if (this.adrenaline >= 50) this.health += dt * 2.125 / (30 ** 2);
        else if (this.adrenaline >= 25) this.health += dt * 1.125 / (30 ** 2);
        else if (this.adrenaline > 0) this.health += dt * 0.625 / (30 ** 2);

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

        // Gas damage
        if (this.game.gas.doDamage && this.game.gas.isInGas(this.position)) {
            this.piercingDamage(this.game.gas.dps, KillType.Gas);
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
        const game = this.game;

        // Calculate visible objects
        this.ticksSinceLastUpdate++;
        if (this.ticksSinceLastUpdate > 8 || game.updateObjects || this.updateObjects) {
            this.ticksSinceLastUpdate = 0;
            this.updateObjects = false;

            this.screenHitbox = RectangleHitbox.fromRect(
                2 * player.xCullDist,
                2 * player.yCullDist,
                player.position
            );

            const newVisibleObjects = game.grid.intersectsHitbox(this.screenHitbox);

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

        for (const object of game.fullDirtyObjects) {
            if (this.visibleObjects.has(object)) {
                packet.fullDirtyObjects.add(object);
            }
        }

        for (const object of game.partialDirtyObjects) {
            if (this.visibleObjects.has(object) && !packet.fullDirtyObjects.has(object)) {
                packet.partialDirtyObjects.add(object);
            }
        }

        const inventory = player.inventory;
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
            dirty: JSON.parse(JSON.stringify(player.thisTickDirty)),
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
            packet.fullDirtyObjects.add(this.spectating);
            this.startedSpectating = false;
        }

        // Cull bullets
        for (const bullet of game.newBullets) {
            if (Collision.lineIntersectsRectTest(bullet.initialPosition,
                bullet.finalPosition,
                this.screenHitbox.min,
                this.screenHitbox.max)) {
                packet.bullets.add(bullet);
            }
        }

        // Cull explosions
        for (const explosion of game.explosions) {
            if (this.screenHitbox.isPointInside(explosion.position) ||
                Geometry.distanceSquared(explosion.position, this.position) < 128 ** 2) {
                packet.explosions.add(explosion);
            }
        }

        // Emotes
        for (const emote of game.emotes) {
            if (this.visibleObjects.has(emote.player)) {
                packet.emotes.add(emote);
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
            ? game.grid.pool.getCategory(ObjectCategory.Player)
            : game.newPlayers;

        packet.deletedPlayers = game.deletedPlayers;

        // alive count
        packet.aliveCount = game.aliveCount;
        packet.aliveCountDirty = game.aliveCountDirty || this._firstPacket;

        // kill feed messages
        packet.killFeedMessages = game.killFeedMessages;
        const killLeader = game.killLeader;

        if (this._firstPacket && killLeader) {
            packet.killFeedMessages.add({
                messageType: KillFeedMessageType.KillLeaderAssigned,
                playerID: killLeader.id,
                kills: killLeader.kills,
                hideInKillfeed: true
            });
        }

        packet.planes = game.planes;
        packet.mapPings = game.mapPings;

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

        const spectatablePlayers = game.spectatablePlayers;
        switch (packet.spectateAction) {
            case SpectateActions.BeginSpectating: {
                if (this.killedBy !== undefined && !this.killedBy.dead) toSpectate = this.killedBy;
                else if (spectatablePlayers.length > 1) toSpectate = pickRandomInArray(spectatablePlayers);
                break;
            }
            case SpectateActions.SpectatePrevious:
                if (this.spectating !== undefined) {
                    toSpectate = spectatablePlayers[
                        Math.max(
                            0,
                            spectatablePlayers.indexOf(this.spectating) - 1
                        )
                    ];
                }
                break;
            case SpectateActions.SpectateNext:
                if (this.spectating !== undefined) {
                    toSpectate = spectatablePlayers[
                        Math.min(
                            spectatablePlayers.length,
                            spectatablePlayers.indexOf(this.spectating) + 1
                        )
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
            this.game.fullDirtyObjects.add(this);
        }
    }

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
    piercingDamage(amount: number, source?: GameObject | KillType.Gas | KillType.Airdrop, weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion): void {
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
    die(source?: GameObject | KillType.Gas | KillType.Airdrop, weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion): void {
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

        if (source instanceof Player || source === KillType.Gas || source === KillType.Airdrop) {
            const killFeedMessage: KillFeedMessage = {
                messageType: KillFeedMessageType.Kill,
                playerID: this.id,
                weaponUsed: weaponUsed?.definition
            };

            if (source instanceof Player) {
                if (source !== this) {
                    killFeedMessage.killType = KillType.TwoPartyInteraction;
                    killFeedMessage.killerID = source.id;
                    killFeedMessage.kills = source.kills;

                    if (source.activeItem.definition.killstreak) {
                        killFeedMessage.killstreak = source.activeItem.stats.kills;
                    }
                }
            } else {
                killFeedMessage.killType = source;
            }

            this.game.killFeedMessages.add(killFeedMessage);
        }

        // Destroy physics body; reset movement and attacking variables
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

        this.game.livingPlayers.delete(this);
        this.game.fullDirtyObjects.add(this);
        removeFrom(this.game.spectatablePlayers, this);

        if (this.activeItem instanceof ThrowableItem) {
            this.activeItem.stopUse();
        }

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
                    def.noDrop === true ||
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
        this.game.grid.addObject(new DeathMarker(this));

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

                    interface CloseObject {
                        object: Loot | Obstacle | undefined
                        minDist: number
                    }

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
                            const dist = Geometry.distanceSquared(object.position, this.position);
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

    override get data(): FullData<ObjectCategory.Player> {
        return {
            position: this.position,
            rotation: this.rotation,
            animation: this.animation,
            full: {
                dead: this.dead,
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
