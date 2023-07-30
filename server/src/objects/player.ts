import { type Body, Circle, Vec2 } from "planck";
import type { WebSocket } from "uWebSockets.js";

import { type CollisionFilter, GameObject } from "../types/gameObject";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type PlayerContainer } from "../server";
import { type SendingPacket } from "../types/sendingPacket";

import { ObjectType } from "../../../common/src/utils/objectType";
import {
    ANIMATION_TYPE_BITS,
    AnimationType,
    INVENTORY_MAX_WEAPONS,
    ObjectCategory,
    PLAYER_RADIUS,
    SERVER_GRID_SIZE
} from "../../../common/src/constants";
import { DeathMarker } from "./deathMarker";
import { GameOverPacket } from "../packets/sending/gameOverPacket";
import { KillPacket } from "../packets/sending/killPacket";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { Inventory } from "../inventory/inventory";
import { type InventoryItem } from "../inventory/inventoryItem";
import { KillFeedPacket } from "../packets/sending/killFeedPacket";
import { KillKillFeedMessage } from "../types/killFeedMessage";
import { type Action } from "../inventory/action";
import { type LootDefinition } from "../../../common/src/definitions/loots";
import { GunItem } from "../inventory/gunItem";
import { Config } from "../config";
import { MeleeItem } from "../inventory/meleeItem";
import { Emote } from "./emote";
import { type SkinDefinition } from "../../../common/src/definitions/skins";
import { type EmoteDefinition } from "../../../common/src/definitions/emotes";
import { type ExtendedWearerAttributes } from "../../../common/src/utils/objectDefinitions";
import { removeFrom } from "../utils/misc";

export class Player extends GameObject {
    override readonly is: CollisionFilter = {
        player: true,
        obstacle: false,
        bullet: false,
        loot: false
    };

    override readonly collidesWith: CollisionFilter = {
        player: false,
        obstacle: true,
        bullet: true,
        loot: false
    };

    //fast = false;

    hitbox: CircleHitbox;

    readonly damageable = true;

    name: string;

    readonly loadout: {
        skin: ObjectType<ObjectCategory.Loot, SkinDefinition>
        readonly emotes: Array<ObjectType<ObjectCategory.Emote, EmoteDefinition>>
    };

    joined = false;
    disconnected = false;

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
        this._minAdrenaline = minAdrenaline;
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

    kills = 0;
    damageDone = 0;
    damageTaken = 0;
    joinTime: number;

    lastInteractionTime = Date.now();

    readonly recoil = {
        active: false,
        time: 0,
        multiplier: 1
    };

    get isMoving(): boolean {
        return this.movement.up ||
            this.movement.down ||
            this.movement.left ||
            this.movement.right ||
            this.movement.moving;
    }

    movesSinceLastUpdate = 0;

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
     * The position this player died at, if applicable
     */
    deathPosition?: Vec2;

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
        zoom: true,
        action: false
    };

    readonly inventory = new Inventory(this);

    get activeItem(): InventoryItem {
        return this.inventory.activeWeapon;
    }

    get activeItemIndex(): number {
        return this.inventory.activeWeaponIndex;
    }

    hitEffect = false;

    animation = {
        type: AnimationType.None,
        // This boolean is flipped when an animation plays
        // when its changed the client plays the animation
        seq: false
    };

    /**
     * Objects the player can see
     */
    visibleObjects = new Set<GameObject>();
    /**
     * Objects the player can see with a 1x scope
     */
    nearObjects = new Set<GameObject>();
    /**
     * Objects that need to be partially updated
     */
    partialDirtyObjects = new Set<GameObject>();
    /**
     * Objects that need to be fully updated
     */
    fullDirtyObjects = new Set<GameObject>();
    /**
     * Objects that need to be deleted
     */
    deletedObjects = new Set<GameObject>();
    /**
     * Emotes being sent to the player this tick
     */
    emotes = new Set<Emote>();

    private _zoom!: number;
    xCullDist!: number;
    yCullDist!: number;

    socket: WebSocket<PlayerContainer>;

    fullUpdate = true;

    body: Body;

    action: Action | undefined;

    spectating?: Player;
    spectators = new Set<Player>();
    lastSpectateActionTime = 0;

    role: string | undefined;
    isDev: boolean;
    nameColor: string;

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

    constructor(game: Game, socket: WebSocket<PlayerContainer>, position: Vec2) {
        super(game, ObjectType.categoryOnly(ObjectCategory.Player), position);

        const userData = socket.getUserData();
        this.socket = socket;
        this.name = userData.name;
        this.role = userData.role;
        this.isDev = userData.isDev;
        this.nameColor = userData.nameColor;

        this.loadout = {
            skin: ObjectType.fromString(ObjectCategory.Loot, "forest_camo"),
            emotes: [
                ObjectType.fromString(ObjectCategory.Emote, "happy_face"),
                ObjectType.fromString(ObjectCategory.Emote, "thumbs_up"),
                ObjectType.fromString(ObjectCategory.Emote, "suroi_logo"),
                ObjectType.fromString(ObjectCategory.Emote, "sad_face")
            ]
        };

        this.rotation = 0;

        this.joinTime = game.now;

        // Init body
        this.body = game.world.createBody({
            type: "dynamic",
            position,
            fixedRotation: true
        });

        this.body.createFixture({
            shape: Circle(PLAYER_RADIUS),
            friction: 0.0,
            density: 1000.0,
            restitution: 0.0,
            userData: this
        });

        this.hitbox = new CircleHitbox(PLAYER_RADIUS, this.position);

        this.inventory.addOrReplaceWeapon(2, "fists");
        this.inventory.scope = ObjectType.fromString(ObjectCategory.Loot, "1x_scope");

        // Inventory preset
        if (this.isDev && userData.lobbyClearing && !Config.disableLobbyClearing) {
            this.inventory.addOrReplaceWeapon(0, "deathray");
            (this.inventory.getWeapon(0) as GunItem).ammo = 1;

            this.inventory.addOrReplaceWeapon(1, "revitalizer");
            (this.inventory.getWeapon(1) as GunItem).ammo = 5;
            this.inventory.items["12g"] = 15;

            this.inventory.addOrReplaceWeapon(2, "lasersword");

            this.inventory.items["2x_scope"] = 1;
            this.inventory.items["4x_scope"] = 1;
            this.inventory.scope = ObjectType.fromString(ObjectCategory.Loot, "4x_scope");
        }

        this.updateAndApplyModifiers();
        this.dirty.activeWeaponIndex = true;
    }

    calculateSpeed(): number {
        let recoilMultiplier = 1;
        if (this.recoil.active) {
            if (this.recoil.time < this.game.now) {
                this.recoil.active = false;
            } else {
                recoilMultiplier = this.recoil.multiplier;
            }
        }

        // shove it
        /* eslint-disable no-multi-spaces */
        return Config.movementSpeed *                    // Base speed
            recoilMultiplier *                           // Recoil from items
            (this.action?.speedMultiplier ?? 1) *        // Speed modifier from performing actions
            (1 + (this.adrenaline / 1000)) *             // Linear speed boost from adrenaline
            this.activeItemDefinition.speedMultiplier *  // Active item speed modifier
            this._modifiers.baseSpeed;                   // Current on-wearer modifier
    }

    setVelocity(xVelocity: number, yVelocity: number): void {
        this.body.setLinearVelocity(Vec2(xVelocity, yVelocity));
        if (xVelocity !== 0 || yVelocity !== 0) {
            this.movesSinceLastUpdate++;
        }
    }

    get position(): Vec2 {
        return this.deathPosition ?? this.body.getPosition();
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
        return this.activeItem.type.definition as MeleeDefinition | GunDefinition;
    }

    give(idString: string): void {
        this.inventory.appendWeapon(idString);
    }

    emote(slot: number): void {
        this.game.emotes.add(new Emote(this.loadout.emotes[slot], this));
    }

    spectate(spectating?: Player): void {
        if (spectating === undefined) {
            this.game.removePlayer(this);
            return;
        }
        if (this.spectating !== undefined) {
            this.spectating.spectators.delete(this);
        }
        this.spectating = spectating;
        spectating.spectators.add(this);
        spectating.updateVisibleObjects();

        // Add all visible objects to full dirty objects
        for (const object of spectating.visibleObjects) {
            spectating.fullDirtyObjects.add(object);
        }

        // Add objects that are no longer visible to deleted objects
        for (const object of this.visibleObjects) {
            if (!spectating.visibleObjects.has(object)) spectating.deletedObjects.add(object);
        }

        spectating.fullDirtyObjects.add(spectating);
        if (spectating.partialDirtyObjects.size) spectating.partialDirtyObjects = new Set<GameObject>();
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
        this.movesSinceLastUpdate = 0;

        const approximateX = Math.round(this.position.x / SERVER_GRID_SIZE) * SERVER_GRID_SIZE;
        const approximateY = Math.round(this.position.y / SERVER_GRID_SIZE) * SERVER_GRID_SIZE;
        this.nearObjects = this.game.getVisibleObjects(this.position);
        const visibleAtZoom = this.game.visibleObjects[this.zoom];

        const newVisibleObjects = new Set<GameObject>(visibleAtZoom !== undefined ? visibleAtZoom[approximateX][approximateY] : this.nearObjects);

        const minX = this.position.x - this.xCullDist;
        const minY = this.position.y - this.yCullDist;
        const maxX = this.position.x + this.xCullDist;
        const maxY = this.position.y + this.yCullDist;

        for (const object of this.game.dynamicObjects) {
            if (
                object.position.x > minX &&
                object.position.x < maxX &&
                object.position.y > minY &&
                object.position.y < maxY
            ) {
                newVisibleObjects.add(object);
                if (!this.visibleObjects.has(object)) {
                    this.fullDirtyObjects.add(object);
                }
                // make sure this player is added to other players visible objects
                if (!this.dead && object instanceof Player && !object.visibleObjects.has(this)) {
                    object.visibleObjects.add(this);
                    object.fullDirtyObjects.add(this);
                }
            } else if (this.visibleObjects.has(object)) {
                this.deletedObjects.add(object);
            }
        }

        for (const object of newVisibleObjects) {
            if (!this.visibleObjects.has(object)) {
                this.fullDirtyObjects.add(object);
            }
        }

        for (const object of this.visibleObjects) {
            if (!newVisibleObjects.has(object)) {
                this.deletedObjects.add(object);
            }
        }

        this.visibleObjects = newVisibleObjects;
    }

    sendPacket(packet: SendingPacket): void {
        const stream = SuroiBitStream.alloc(packet.allocBytes);
        try {
            packet.serialize(stream);
        } catch (e) {
            console.error("Error serializing packet. Details:", e);
        }

        this.sendData(stream);
    }

    sendData(stream: SuroiBitStream): void {
        try {
            this.socket.send(stream.buffer.slice(0, Math.ceil(stream.index / 8)), true, true);
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

    override damage(amount: number, source?: GameObject, weaponUsed?: GunItem | MeleeItem | ObjectType): void {
        if (this.invulnerable) return;

        // Reductions are merged additively
        amount *= 1 - (
            (this.inventory.helmet?.definition.damageReductionPercentage ?? 0) + (this.inventory.vest?.definition.damageReductionPercentage ?? 0)
        );

        amount = this._clampDamageAmount(amount);

        this.piercingDamage(amount, source, weaponUsed);
    }

    /**
     * Deals damage whilst ignoring protective modifiers but not invulnerability
     */
    piercingDamage(amount: number, source?: GameObject | "gas", weaponUsed?: GunItem | MeleeItem | ObjectType): void {
        if (this.invulnerable) return;

        /* eslint-disable @typescript-eslint/restrict-plus-operands */
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

        amount = this._clampDamageAmount(amount);

        /* eslint-disable @typescript-eslint/restrict-plus-operands */

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
                if ((weaponUsed.stats.damage += amount) <= ((attributes?.damageDealt ?? { limit: -Infinity }).limit ?? Infinity)) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-unnecessary-type-assertion
                    applyPlayerFX(attributes!.damageDealt!);
                }
            }

            if (source instanceof Player) {
                this.hitEffect = true;

                if (source !== this) {
                    source.damageDone += amount;
                }
            }
        }

        this.partialDirtyObjects.add(this);
        this.game.partialDirtyObjects.add(this);

        if (this.health <= 0 && !this.dead) {
            if (canTrackStats) {
                if (weaponUsed.stats.kills++ <= ((attributes?.kill ?? { limit: -Infinity }).limit ?? Infinity)) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-unnecessary-type-assertion
                    applyPlayerFX(attributes!.kill!);
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
    die(source?: GameObject | "gas", weaponUsed?: GunItem | MeleeItem | ObjectType): void {
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
            this.game.killFeedMessages.add(
                new KillFeedPacket(
                    this,
                    new KillKillFeedMessage(
                        this,
                        source === this ? undefined : source,
                        weaponUsed
                    )
                )
            );
        }

        // Destroy physics body; reset movement and attacking variables
        this.movement.up = false;
        this.movement.down = false;
        this.movement.left = false;
        this.movement.right = false;
        this.attacking = false;
        this.deathPosition = this.position.clone();
        try {
            this.game.world.destroyBody(this.body);
        } catch (e) {
            console.error("Error destroying player body. Details: ", e);
        }
        this.game.aliveCountDirty = true;
        this.adrenaline = 0;
        this.dirty.inventory = true;
        this.action?.cancel();

        this.game.livingPlayers.delete(this);
        removeFrom(this.game.spectatablePlayers, this);
        this.game.dynamicObjects.delete(this);
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

            if (count > 0) {
                const itemType = ObjectType.fromString<ObjectCategory.Loot, LootDefinition>(ObjectCategory.Loot, item);
                if (
                    itemType.definition.noDrop === true ||
                    ("ephemeral" in itemType.definition && itemType.definition.ephemeral)
                ) continue;

                this.game.addLoot(itemType, this.position, count);
                this.inventory.items[item] = 0;
            }
        }

        // Drop equipment
        if (this.inventory.helmet && this.inventory.helmet.definition.noDrop !== true) this.game.addLoot(this.inventory.helmet, this.position);
        if (this.inventory.vest && this.inventory.vest.definition.noDrop !== true) this.game.addLoot(this.inventory.vest, this.position);
        if (!this.inventory.backpack.definition.noDrop) this.game.addLoot(this.inventory.backpack, this.position);
        if (this.loadout.skin.definition.notInLoadout) this.game.addLoot(this.loadout.skin, this.position);

        this.inventory.helmet = this.inventory.vest = undefined;
        this.inventory.backpack = ObjectType.fromString(ObjectCategory.Loot, "bag");

        // Create death marker
        const deathMarker = new DeathMarker(this);
        this.game.dynamicObjects.add(deathMarker);
        this.game.fullDirtyObjects.add(deathMarker);

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
        stream.writePosition(this.position);
        stream.writeRotation(this.rotation, 16);
        stream.writeBits(this.animation.type, ANIMATION_TYPE_BITS);
        stream.writeBoolean(this.animation.seq);
        stream.writeBoolean(this.hitEffect);
    }

    override serializeFull(stream: SuroiBitStream): void {
        stream.writeBoolean(this.invulnerable);
        stream.writeObjectTypeNoCategory(this.activeItem.type);
        stream.writeObjectTypeNoCategory(this.loadout.skin);
        stream.writeBits(this.inventory.helmet?.definition.level ?? 0, 2);
        stream.writeBits(this.inventory.vest?.definition.level ?? 0, 2);
        stream.writeBits(this.inventory.backpack.definition.level, 2);
    }
}
