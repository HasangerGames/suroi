import type { WebSocket } from "uWebSockets.js";
import {
    AnimationType,
    INVENTORY_MAX_WEAPONS,
    KillFeedMessageType,
    MAX_MOUSE_DISTANCE,
    ObjectCategory,
    PLAYER_RADIUS,
    PlayerActions
} from "../../../common/src/constants";
import { Emotes, type EmoteDefinition } from "../../../common/src/definitions/emotes";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { Loots, type LootDefinition } from "../../../common/src/definitions/loots";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { type SkinDefinition } from "../../../common/src/definitions/skins";
import { CircleHitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { FloorTypes } from "../../../common/src/utils/mapUtils";
import { clamp } from "../../../common/src/utils/math";
import { ItemType, type ExtendedWearerAttributes, reifyDefinition } from "../../../common/src/utils/objectDefinitions";
import { ObjectSerializations, type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { v, vAdd, vClone, vEqual, type Vector } from "../../../common/src/utils/vector";
import { Config } from "../config";
import { type Game } from "../game";
import { HealingAction, ReloadAction, type Action } from "../inventory/action";
import { GunItem } from "../inventory/gunItem";
import { Inventory } from "../inventory/inventory";
import { type InventoryItem } from "../inventory/inventoryItem";
import { MeleeItem } from "../inventory/meleeItem";
import { GameOverPacket } from "../packets/sending/gameOverPacket";
import { KillFeedPacket } from "../packets/sending/killFeedPacket";
import { KillPacket } from "../packets/sending/killPacket";
import { type PlayerContainer } from "../server";
import { GameObject } from "../types/gameObject";
import { type SendingPacket } from "../types/sendingPacket";
import { removeFrom } from "../utils/misc";
import { Building } from "./building";
import { DeathMarker } from "./deathMarker";
import { Emote } from "./emote";
import { type Explosion } from "./explosion";
import { Obstacle } from "./obstacle";
import { Scopes } from "../../../common/src/definitions/scopes";
import { ObjectType } from "../../../common/src/utils/objectType";

export class Player extends GameObject {
    readonly type = ObjectCategory.Player;
    readonly hitbox: CircleHitbox;

    override readonly objectType = ObjectType.categoryOnly(ObjectCategory.Player);

    readonly damageable = true;

    name: string;
    readonly ip?: string;

    readonly loadout: {
        skin: SkinDefinition
        readonly emotes: EmoteDefinition[]
    };

    joined = false;
    disconnected = false;

    private _kills = 0;
    get kills(): number { return this._kills; }
    set kills(k: number) {
        this._kills = k;
        this.game.updateKillLeader(this);
    }

    static readonly DEFAULT_MAX_HEALTH = 100;
    private _maxHealth = Player.DEFAULT_MAX_HEALTH;
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

    static readonly DEFAULT_MAX_ADRENALINE = 100;
    private _maxAdrenaline = Player.DEFAULT_MAX_ADRENALINE;
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

    readonly movement = {
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
    readonly dirty = {
        health: true,
        maxMinStats: true,
        adrenaline: true,
        activeWeaponIndex: true,
        weapons: true,
        inventory: true,
        activePlayerID: true,
        zoom: true
    };

    readonly inventory = new Inventory(this);

    get activeItem(): InventoryItem<LootDefinition> {
        return this.inventory.activeWeapon;
    }

    get activeItemIndex(): number {
        return this.inventory.activeWeaponIndex;
    }

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
    /**
     * Objects the player can see with a 1x scope
     */
    nearObjects = new Set<GameObject>();
    /**
     * Objects that need to be partially updated
     */
    readonly partialDirtyObjects = new Set<GameObject>();
    /**
     * Objects that need to be fully updated
     */
    readonly fullDirtyObjects = new Set<GameObject>();
    /**
     * Objects that need to be deleted
     */
    readonly deletedObjects = new Set<GameObject>();
    /**
     * Ticks since last visible objects update
     */
    ticksSinceLastUpdate = 0;

    /**
     * Emotes being sent to the player this tick
     */
    readonly emotes = new Set<Emote>();

    private _zoom!: number;
    xCullDist!: number;
    yCullDist!: number;

    readonly socket: WebSocket<PlayerContainer>;

    fullUpdate = true;

    private _action?: Action | undefined;
    get action(): Action | undefined { return this._action; }
    set action(value: Action | undefined) {
        const wasReload = this._action?.type === PlayerActions.Reload;
        this._action = value;

        // The action slot is now free, meaning our player isn't doing anything
        // Let's try reloading our empty gun then, unless we just cancelled a reload
        if (!wasReload && value === undefined && this.activeItem instanceof GunItem && this.activeItem.ammo <= 0) {
            this._action = new ReloadAction(this, this.activeItem);
        }
    }

    spectating?: Player;
    spectators = new Set<Player>();
    lastSpectateActionTime = 0;

    readonly role?: string;
    readonly isDev: boolean;
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
    effectiveSwitchDelay = 0;

    isInsideBuilding = false;

    floor = "water";

    constructor(game: Game, socket: WebSocket<PlayerContainer>, position: Vector) {
        super(game, position);

        const userData = socket.getUserData();
        this.socket = socket;
        this.name = "Player";
        this.ip = userData.ip;
        this.role = userData.role;
        this.isDev = userData.isDev;
        this.nameColor = userData.nameColor;

        this.loadout = {
            skin: Loots.getByIDString<SkinDefinition>("forest_camo"),
            emotes: [
                Emotes.getByIDString("happy_face"),
                Emotes.getByIDString("thumbs_up"),
                Emotes.getByIDString("suroi_logo"),
                Emotes.getByIDString("sad_face")
            ]
        };

        this.rotation = 0;

        this.joinTime = game.now;

        this.hitbox = new CircleHitbox(PLAYER_RADIUS, position);

        this.inventory.addOrReplaceWeapon(2, "fists");

        this.inventory.scope = reifyDefinition("1x_scope", Scopes);
        //this.inventory.items["15x_scope"] = 1;
        //this.inventory.scope = reifyDefinition("15x_scope", Scopes);

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

        /*const giveWeapon = (idString: string, index: number): void => {
            this.inventory.addOrReplaceWeapon(index, idString);
            const primaryItem = this.inventory.getWeapon(index) as GunItem;
            const primaryDefinition = primaryItem.definition;
            primaryItem.ammo = primaryDefinition.capacity;
            this.inventory.items[primaryDefinition.ammoType] = Infinity;
        };*/

        this.updateAndApplyModifiers();
        this.dirty.activeWeaponIndex = true;
    }

    get position(): Vector {
        return this.hitbox.position;
    }

    set position(position: Vector) {
        this.hitbox.position = position;
    }

    get zoom(): number {
        return this._zoom;
    }

    set zoom(zoom: number) {
        if (this._zoom === zoom) return;

        this._zoom = zoom;
        this.xCullDist = this._zoom * 1.8;
        this.yCullDist = this._zoom * 1.35;
        this.dirty.zoom = true;
        this.updateVisibleObjects();
    }

    get activeItemDefinition(): MeleeDefinition | GunDefinition {
        return this.activeItem.definition as MeleeDefinition | GunDefinition;
    }

    give(idString: string): void {
        this.inventory.appendWeapon(idString);
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

    spectate(spectating?: Player): void {
        if (spectating === undefined) {
            this.game.removePlayer(this);
            return;
        }

        this.spectating?.spectators.delete(this);
        this.spectating = spectating;
        spectating.spectators.add(this);

        // Add all visible objects to full dirty objects
        for (const object of spectating.visibleObjects) {
            spectating.fullDirtyObjects.add(object);
        }

        // Add objects that are no longer visible to deleted objects
        for (const object of this.visibleObjects) {
            if (!spectating.visibleObjects.has(object)) spectating.deletedObjects.add(object);
        }

        spectating.fullDirtyObjects.add(spectating);
        if (spectating.partialDirtyObjects.size) spectating.partialDirtyObjects.clear();
        spectating.fullUpdate = true;
    }

    disableInvulnerability(): void {
        if (this.invulnerable) {
            this.invulnerable = false;
            this.fullDirtyObjects.add(this);
            this.game.fullDirtyObjects.add(this);
        }
    }

    updateVisibleObjects(): void {
        this.ticksSinceLastUpdate = 0;

        const newVisibleObjects = this.game.grid.intersectsHitbox(
            RectangleHitbox.fromRect(
                2 * this.xCullDist,
                2 * this.yCullDist,
                this.position
            )
        );

        for (const object of this.visibleObjects) {
            if (!newVisibleObjects.has(object)) {
                this.visibleObjects.delete(object);
                this.deletedObjects.add(object);
            }
        }

        for (const object of newVisibleObjects) {
            if (!this.visibleObjects.has(object)) {
                this.visibleObjects.add(object);
                this.fullDirtyObjects.add(object);
            }
        }
    }

    sendPacket(packet: SendingPacket): void {
        const stream = SuroiBitStream.alloc(packet.allocBytes);
        packet.serialize(stream);
        const buffer = stream.buffer.slice(0, Math.ceil(stream.index / 8));
        this.sendData(buffer);
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
        this.maxHealth = Player.DEFAULT_MAX_HEALTH * this._modifiers.maxHealth;
        this.maxAdrenaline = Player.DEFAULT_MAX_ADRENALINE * this._modifiers.maxAdrenaline;
        this.minAdrenaline = this.modifiers.minAdrenaline;
    }

    // dies of death
    die(source?: GameObject | "gas", weaponUsed?: GunItem | MeleeItem | Explosion): void {
        // Remove player from kill leader
        if (this === this.game.killLeader) {
            this.game.killLeaderDead();
        }

        // Death logic
        if (this.health > 0 || this.dead) return;

        this.health = 0;
        this.dead = true;

        // Send kill packets
        if (source instanceof Player) {
            this.killedBy = source;
            if (source !== this) source.kills++;
            source.sendPacket(new KillPacket(source, this, weaponUsed));
        }

        if (source instanceof Player || source === "gas") {
            this.game.killFeedMessages.add(new KillFeedPacket(this, KillFeedMessageType.Kill, {
                killedBy: source === this ? undefined : source,
                weaponUsed,
                kills: (weaponUsed instanceof GunItem || weaponUsed instanceof MeleeItem) && weaponUsed.definition.killstreak === true ? weaponUsed.stats.kills : 0
            }));
        }

        // Destroy physics body; reset movement and attacking variables
        this.movement.up = false;
        this.movement.down = false;
        this.movement.left = false;
        this.movement.right = false;
        this.attacking = false;
        this.game.aliveCountDirty = true;
        this.adrenaline = 0;
        this.dirty.inventory = true;
        this.action?.cancel();

        this.game.livingPlayers.delete(this);
        removeFrom(this.game.spectatablePlayers, this);
        this.game.removeObject(this);

        //
        // Drop loot
        //

        // Drop weapons
        for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
            this.inventory.dropWeapon(i);
        }

        // Drop inventory items
        for (const item in this.inventory.items) {
            const count = this.inventory.items[item];
            const def = Loots.getByIDString(item);

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
        if (this.inventory.helmet && this.inventory.helmet.noDrop !== true) {
            this.game.addLoot(
                this.inventory.helmet,
                this.position
            );
        }

        if (this.inventory.vest && this.inventory.vest.noDrop !== true) {
            this.game.addLoot(
                this.inventory.vest,
                this.position
            );
        }

        if (this.inventory.backpack && this.inventory.backpack?.noDrop !== true) {
            this.game.addLoot(
                this.inventory.backpack,
                this.position
            );
        }

        if (this.loadout.skin.notInLoadout) {
            this.game.addLoot(
                this.loadout.skin,
                this.position
            );
        }

        this.inventory.helmet = this.inventory.vest = this.inventory.backpack = undefined;

        // Create death marker
        const deathMarker = new DeathMarker(this);
        this.game.grid.addObject(deathMarker);

        // Send game over to dead player
        if (!this.disconnected) {
            this.sendPacket(new GameOverPacket(this, false));
        }
    }

    executeAction(action: Action): void {
        this.action?.cancel();
        this.action = action;
    }

    override serializePartial(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Player].serializeFull(stream, {
            position: this.position,
            rotation: this.rotation,
            animation: this.animation,
            fullUpdate: false
        });
    }

    override serializeFull(stream: SuroiBitStream): void {
        const data: ObjectsNetData[ObjectCategory.Player] = {
            position: this.position,
            rotation: this.rotation,
            animation: this.animation,
            fullUpdate: true,
            invulnerable: this.invulnerable,
            helmet: this.inventory.helmet?.level ?? 0,
            vest: this.inventory.vest?.level ?? 0,
            backpack: this.inventory.backpack?.level ?? 0,
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
        };

        ObjectSerializations[ObjectCategory.Player].serializeFull(stream, data);
    }
}
