import type { WebSocket } from "uWebSockets.js";

import { GameObject } from "../types/gameObject";
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
    PLAYER_ACTIONS_BITS,
    PLAYER_RADIUS,
    PlayerActions
} from "../../../common/src/constants";
import { DeathMarker } from "./deathMarker";
import { GameOverPacket } from "../packets/sending/gameOverPacket";
import { KillPacket } from "../packets/sending/killPacket";
import { CircleHitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { Inventory } from "../inventory/inventory";
import { type InventoryItem } from "../inventory/inventoryItem";
import { KillFeedPacket } from "../packets/sending/killFeedPacket";
import { KillKillFeedMessage } from "../types/killFeedMessage";
import { type HealingAction, type Action } from "../inventory/action";
import { type LootDefinition } from "../../../common/src/definitions/loots";
import { GunItem } from "../inventory/gunItem";
import { Config } from "../config";
import { MeleeItem } from "../inventory/meleeItem";
import { Emote } from "./emote";
import { type SkinDefinition } from "../../../common/src/definitions/skins";
import { type EmoteDefinition } from "../../../common/src/definitions/emotes";
import { type ExtendedWearerAttributes } from "../../../common/src/utils/objectDefinitions";
import { removeFrom } from "../utils/misc";
import { v, vAdd, type Vector } from "../../../common/src/utils/vector";
import { Obstacle } from "./obstacle";
import { clamp } from "../../../common/src/utils/math";
import { Building } from "./building";

export class Player extends GameObject {
    hitbox: CircleHitbox;

    readonly damageable = true;

    name: string;
    ip: string | undefined;

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

    constructor(game: Game, socket: WebSocket<PlayerContainer>, position: Vector) {
        super(game, ObjectType.categoryOnly(ObjectCategory.Player), position);

        const userData = socket.getUserData();
        this.socket = socket;
        this.name = userData.name;
        this.ip = userData.ip;
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

        this.hitbox = new CircleHitbox(PLAYER_RADIUS, position);

        this.inventory.addOrReplaceWeapon(2, "fists");
        this.inventory.scope = ObjectType.fromString(ObjectCategory.Loot, "1x_scope");

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
            this.inventory.scope = ObjectType.fromString(ObjectCategory.Loot, "4x_scope");
        }

        /*this.inventory.addOrReplaceWeapon(0, "mosin");
        (this.inventory.getWeapon(0) as GunItem).ammo = 5;
        this.inventory.items["762mm"] = Infinity;

        this.inventory.addOrReplaceWeapon(1, "m37");
        (this.inventory.getWeapon(1) as GunItem).ammo = 5;
        this.inventory.items["12g"] = Infinity;*/

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
        return this.activeItem.type.definition as MeleeDefinition | GunDefinition;
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

        if (movement.x !== 0 || movement.y !== 0) {
            this.movesSinceLastUpdate++;
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
        const speed = Config.movementSpeed *            // Base speed
            recoilMultiplier *                          // Recoil from items
            (this.action?.speedMultiplier ?? 1) *       // Speed modifier from performing actions
            (1 + (this.adrenaline / 1000)) *            // Linear speed boost from adrenaline
            this.activeItemDefinition.speedMultiplier * // Active item speed modifier
            this.modifiers.baseSpeed;                   // Current on-wearer modifier

        this.game.grid.removeObject(this);
        this.position = vAdd(this.position, v(movement.x * speed, movement.y * speed));
        this.game.grid.addObject(this);

        // Find and resolve collisions
        const collidableObjects = this.game.grid.intersectsRect(this.hitbox.toRectangle());
        for (const potential of collidableObjects) {
            if (
                potential instanceof Obstacle &&
                potential.collidable &&
                potential.hitbox !== undefined &&
                this.hitbox.collidesWith(potential.hitbox) // TODO Make an array of collidable objects
            ) {
                this.hitbox.resolveCollision(potential.hitbox);
            }
        }

        // World boundaries
        this.position.x = clamp(this.position.x, this.hitbox.radius, this.game.map.width - this.hitbox.radius);
        this.position.y = clamp(this.position.y, this.hitbox.radius, this.game.map.height - this.hitbox.radius);

        // Disable invulnerability if the player moves or turns
        if (this.isMoving || this.turning) {
            this.disableInvulnerability();
            this.game.partialDirtyObjects.add(this);
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
        for (const object of collidableObjects) {
            if (object instanceof Building && !object.dead) {
                if (object.scopeHitbox.collidesWith(this.hitbox)) {
                    isInsideBuilding = true;
                    break;
                }
            }
        }
        if (isInsideBuilding && !this.isInsideBuilding) {
            this.zoom = 48;
        } else if (!this.isInsideBuilding) {
            this.zoom = this.inventory.scope.definition.zoomLevel;
        }
        this.isInsideBuilding = isInsideBuilding;

        this.turning = false;
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

        const minX = this.position.x - this.xCullDist;
        const minY = this.position.y - this.yCullDist;
        const maxX = this.position.x + this.xCullDist;
        const maxY = this.position.y + this.yCullDist;

        this.nearObjects = this.game.grid.intersectsRect(new RectangleHitbox(v(minX, minY), v(maxX, maxY)));

        const newVisibleObjects = this.nearObjects;

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
            (this.inventory.helmet?.definition.damageReduction ?? 0) + (this.inventory.vest?.definition.damageReduction ?? 0)
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
                if (source !== this) {
                    source.damageDone += amount;
                }
            }
        }

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
        this.game.grid.addObject(deathMarker);
        this.game.updateObjects = true;

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
    }

    override serializeFull(stream: SuroiBitStream): void {
        stream.writeBoolean(this.invulnerable);
        stream.writeObjectTypeNoCategory(this.activeItem.type);
        stream.writeObjectTypeNoCategory(this.loadout.skin);
        stream.writeBits(this.inventory.helmet?.definition.level ?? 0, 2);
        stream.writeBits(this.inventory.vest?.definition.level ?? 0, 2);
        stream.writeBits(this.inventory.backpack.definition.level, 2);

        stream.writeBoolean(this.dirty.action);
        if (this.dirty.action) {
            stream.writeBits(this.action ? this.action.type : PlayerActions.None, PLAYER_ACTIONS_BITS);

            if (this.action?.type === PlayerActions.UseItem) {
                stream.writeObjectTypeNoCategory((this.action as HealingAction).item);
            }
        }
    }
}
