import { Vec2 } from "planck";
import { AnimationType, ObjectCategory } from "../../../common/src/constants";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { type CollisionRecord, degreesToRadians } from "../../../common/src/utils/math";
import { type ItemDefinition, type ItemTypes } from "../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../common/src/utils/objectType";
import { randomFloat } from "../../../common/src/utils/random";
import { vRotate, v } from "../../../common/src/utils/vector";
import { Bullet } from "./bullet";
import { type Player } from "./player";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { type GameObject } from "../types/gameObject";

/**
 * A class representing a player's inventory
 *
 * *Note that for now, this  implementation only considers items that can be equipped;
 * in other words, stackable items like ammo and consumable have **not** been taken into account.*
 */
export class Inventory {
    /**
     * The maximum amount of items that can be held in an inventory
     */
    static readonly MAX_SIZE = 3;

    /**
     * The player that this inventory belongs to
     */
    readonly owner: Player;
    /**
     * An internal array storing the items
     */
    private readonly _items: Array<InventoryItem | undefined> = new Array<InventoryItem | undefined>(Inventory.MAX_SIZE);

    /**
     * Private variable storing the index pointing to the last active item
     */
    private _lastItemIndex = 1;
    /**
     * Returns the index pointing to the last active item
     */
    get lastItemIndex(): number { return this._lastItemIndex; }

    /**
     * Private variable storing the index pointing to the active item
     */
    private _activeItemIndex = 0;
    /**
     * Returns the index pointing to the active item
     */
    get activeItemIndex(): number { return this._activeItemIndex; }
    /**
     * Sets the index pointing to the active item, if it is valid. Passing an invalid index throws a `RangeError`
     * If the assignment is successful, `Player#activeItemIndexDirty` is automatically set to `true` if the active item index changes
     * @param slot The new slot
     */
    setActiveItemIndex(slot: number): boolean {
        if (!Inventory.isValidSlot(slot)) throw new RangeError(`Attempted to set active index to invalid slot '${slot}'`);
        if (!this.hasItem(slot)) return false;

        const old = this._activeItemIndex;
        this._activeItemIndex = slot;

        if (slot !== old) {
            this._lastItemIndex = old;
            this.owner.dirty.activeItemIndex = true;
        }

        //todo switch penalties, other stuff that should happen when switching items
        // (started)
        this.owner.attacking = false;

        return true;
    }

    /**
     * Returns this inventory's active item, if it exists
     */
    get activeItem(): InventoryItem {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this._items[this._activeItemIndex]!;
    }

    /**
     * The amount of items in this inventory
     */
    private _itemCount = 0;
    /**
     * Returns the amount of items in this inventory
     */
    get itemCount(): number { return this._itemCount; }

    /**
     * Creates a new inventory
     * @param owner The player this inventory belongs to
     */
    constructor(owner: Player) {
        this.owner = owner;
    }

    /**
     * Determines whether a given index is valid. For an index to be valid, it must be an integer between 0 and `Inventory.MAX_SIZE` (inclusive)
     * @param slot The number to test
     * @returns Whether the number is a valid slot
     */
    static isValidSlot(slot: number): boolean {
        return slot % 0 !== 0 || // If it's not an integer
            slot < 0 || // Or it's negative
            slot > Inventory.MAX_SIZE; // Or it's beyond the max slot number
    }

    /**
     * Internal method used to convert a string to the `InventoryItem` whose `idString` matches it
     * @param item The item to convert
     * @returns The corresponding `InventoryItem` subclass
     */
    private _reifyItem(item: InventoryItem | string): InventoryItem {
        if (item instanceof InventoryItem) return item;

        switch ((ObjectType.fromString(ObjectCategory.Loot, item).definition as ItemDefinition).type) {
            case "gun": return new Gun(item, this.owner);
            case "melee": return new Melee(item, this.owner);
        }
    }

    /**
     * Tests whether or not an item exists in a certain slot
     * @param slot The slot to test
     * @returns Whether or not there exists an item in the given slot
     * @throws {RangeError} If `slot` isn't a valid slot number
     */
    hasItem(slot: number): boolean {
        if (!Inventory.isValidSlot(slot)) throw new RangeError(`Attempted to test for item in invalid slot '${slot}'`);

        return this._items[slot] !== undefined;
    }

    /**
     * Swaps the items in two slots, without checking if there are actually items in those slots
     * @param slotA The first slot
     * @param slotB The second slot
     * @throws {RangeError} If either slot is invalid
     */
    swapItems(slotA: number, slotB: number): void {
        if (!Inventory.isValidSlot(slotA) || !Inventory.isValidSlot(slotB)) throw new RangeError(`Attempted to swap items where one or both of the slots were invalid (slotA: ${slotA}, slotB: ${slotB})`);

        [this._items[slotA], this._items[slotB]] =
            [this._items[slotB], this._items[slotA]];
    }

    /**
     * Puts an item in a certain slot, replacing the old item if one was there. If an item is replaced, it is dropped into the game world
     * @param slot The slot in which to insert the item
     * @param item The item to add
     * @throws {RangeError} If `slot` isn't a valid slot number
    */
    addOrReplaceItem(slot: number, item: InventoryItem | string): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const old = this._setItem(slot, this._reifyItem(item));

        //todo Drop old item into the game world
    }

    /**
     * Attempts to add an item into the first free slot in this inventory. This method does not throw if it cannot add the item
     * @param item The item to add
     * @returns The slot in which the item was added, or `-1` if it could not be added
     */
    appendItem(item: InventoryItem | string): number {
        for (let slot = 0, l = Inventory.MAX_SIZE; slot < l; slot++) {
            if (this._items[slot] === undefined) {
                this._items[slot] = this._reifyItem(item);
                return slot;
            }
        }

        return -1;
    }

    /**
     * Removes an item from this inventory, without dropping it into the game world
     * @param slot The slot from which to remove an item
     * @returns The item that was removed, if any
     * @throws {RangeError} If `slot` isn't a valid slot number
     * @throws {Error} If performing this operation would leave the inventory empty
     */
    removeItem(slot: number): InventoryItem | undefined {
        return this._setItem(slot, undefined);
    }

    /**
     * Forcefully sets an item in a given slot. Note that this operation will never leave the inventory empty:
     * in the case of the attempted removal of this inventory's only item, the operation will be cancelled, and an error will be thrown.
     * @param slot The slot to place the item in
     * @param item The item to place there
     * @returns The item that was previously located in the slot, if any
     * @throws {RangeError} If `slot` isn't a valid slot number
     * @throws {Error} If performing this operation would leave the inventory empty
     */
    private _setItem(slot: number, item: InventoryItem | undefined): InventoryItem | undefined {
        if (!Inventory.isValidSlot(slot)) throw new RangeError(`Attempted to set item in invalid slot '${slot}'`);

        const old = this._items[slot];

        const wasEmpty = old === undefined;
        const isEmpty = item === undefined;

        this._items[slot] = item;

        if (wasEmpty !== isEmpty) {
            isEmpty ? --this._itemCount : ++this._itemCount;
        }

        if (this._itemCount === 0) {
            // revert changes in case of error-handling
            this._items[slot] = old;
            this._itemCount = 1;
            throw new Error("This operation would leave the inventory empty; inventories cannot be emptied");
        }

        return old;
    }
}
/**
 * Represents some item in the player's inventory *that can be equipped*
 * @abstract
 */
export abstract class InventoryItem {
    /**
     * The category of item this is, either melee or gun
     */
    readonly category: ItemTypes;
    /**
     * The `ObjectType` instance associated with this item
     */
    readonly type: ObjectType<ObjectCategory.Loot>;
    /**
     * The player this item belongs to
     */
    readonly owner: Player;

    _lastUse = 0;
    get lastUse(): number { return this._lastUse; }

    /**
     * Creates a new `InventoryItem` given a string and a player
     * @param idString The `idString` of an item in the item schema that will be represented by this instance
     * @param owner The `Player` this item belongs to
     */
    constructor(idString: string, owner: Player) {
        this.type = ObjectType.fromString(ObjectCategory.Loot, idString);
        //todo maybe change the ObjectType class to better infer definition's type so that this cast doesn't need to be done
        this.category = (this.type.definition as ItemDefinition).type;
        this.owner = owner;
    }

    /**
     * A method which will be called whenever the player owning this item attempts to use the item.
     *
     * It is this method's responsibility to ensure that the player is in a position to use the item, as well
     * as take care of any side-effects such usage may entail (spawning objects, modifying state, etc)
     * @abstract
     */
    abstract useItem(): void;
}

/**
 * A class representing a firearm
 */
export class Gun extends InventoryItem {
    declare readonly category: "gun";

    readonly definition: GunDefinition;

    ammo: number;

    /**
     * Constructs a new gun
     * @param idString The `idString` of a `GunDefinition` in the item schema that this object is to base itself off of
     * @param owner The `Player` that owns this gun
     * @throws {TypeError} If the `idString` given does not point to a definition for a gun
     */
    constructor(idString: string, owner: Player) {
        super(idString, owner);

        if (this.category !== "gun") {
            throw new TypeError(`Attempted to create a Gun object based on a definition for a non-gun object (Received a ${this.category as unknown as string} definition)`);
        }

        this.definition = this.type.definition as GunDefinition;

        this.ammo = this.definition.capacity;
    }

    /**
     * As the name implies, this version does not check whether the firing delay
     * has been respected. Used in conjunction with other time-keeping mechanisms,
     * namely setTimeout
     */
    private _useItemNoDelayCheck(): void {
        const owner = this.owner;
        const definition = this.definition;

        if (
            this.ammo > 0 &&
            owner.attacking &&
            !owner.dead &&
            !owner.disconnected
        ) {
            this.ammo--;
            this._lastUse = Date.now();

            const spread = degreesToRadians(definition.shotSpread);
            const rotated = vRotate(v(3.5, 0), owner.rotation);
            //fixme                   ^^^ mystery constant
            const position = Vec2(owner.position.x + rotated.x, owner.position.y - rotated.y);

            for (let i = 0; i < (definition.bulletCount ?? 1); i++) {
                const angle = owner.rotation + randomFloat(-spread, spread) + Math.PI / 2;
                const bullet = new Bullet(
                    owner.game,
                    position,
                    angle,
                    definition,
                    owner
                );

                owner.game.bullets.add(bullet);
                owner.game.newBullets.add(bullet);
            }

            if (definition.fireMode === "auto") {
                setTimeout(this._useItemNoDelayCheck.bind(this), definition.cooldown);
            }
        }
    }

    override useItem(): void {
        if (Date.now() - this._lastUse > this.definition.cooldown) {
            this._useItemNoDelayCheck();
        }
    }
}

/**
 * A class representing a melee weapon
 */
export class Melee extends InventoryItem {
    declare readonly category: "melee";

    readonly definition: MeleeDefinition;

    /**
     * Constructs a new melee weapon
     * @param idString The `idString` of a `MeleeDefinition` in the item schema that this object is to base itself off of
     * @param owner The `Player` that owns this melee weapon
     * @throws {TypeError} If the `idString` given does not point to a definition for a melee weapon
     */
    constructor(idString: string, owner: Player) {
        super(idString, owner);

        if (this.category !== "melee") {
            throw new TypeError(`Attempted to create a Melee object based on a definition for a non-melee object (Received a ${this.category as unknown as string} definition)`);
        }

        this.definition = this.type.definition as MeleeDefinition;
    }

    /**
     * As the name implies, this version does not check whether the firing delay
     * has been respected. Used in conjunction with other time-keeping mechanisms,
     * namely setTimeout
     */
    private _useItemNoDelayCheck(): void {
        const owner = this.owner;
        const definition = this.definition;

        owner.animation.type = AnimationType.Punch;
        owner.animation.seq = !this.owner.animation.seq;

        setTimeout(() => {
            if (
                this.owner.activeItem === this &&
                owner.attacking &&
                !owner.dead &&
                !owner.disconnected
            ) {
                const rotated = vRotate(definition.offset, owner.rotation);
                const position = Vec2(owner.position.x + rotated.x, owner.position.y - rotated.y);
                const hitbox = new CircleHitbox(definition.radius, position);

                // Damage the closest object
                let minDist = Number.MAX_VALUE;
                let closestObject: GameObject | undefined;

                for (const object of this.owner.visibleObjects) {
                    if (!object.dead && object !== owner) {
                        const record: CollisionRecord | undefined = object.hitbox?.distanceTo(hitbox);

                        if (record?.collided === true && record.distance < minDist) {
                            minDist = record.distance;
                            closestObject = object;
                        }
                    }
                }

                if (closestObject?.dead === false) {
                    closestObject.damage(definition.damage, owner);
                }

                if (definition.fireMode === "auto") {
                    setTimeout(this._useItemNoDelayCheck.bind(this), definition.cooldown);
                }
            }
        }, 50);
    }

    override useItem(): void {
        if (Date.now() - this._lastUse > this.definition.cooldown) {
            this._useItemNoDelayCheck();
        }
    }
}
