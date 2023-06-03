import { InventoryItem } from "./inventoryItem";
import { ObjectCategory } from "../../../common/src/constants";
import { ObjectType } from "../../../common/src/utils/objectType";
import { GunItem } from "./gunItem";
import { MeleeItem } from "./meleeItem";
import { type ItemDefinition } from "../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Player } from "../objects/player";

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
    private _lastItemIndex = 0;

    /**
     * Returns the index pointing to the last active item
     */
    get lastItemIndex(): number { return this._lastItemIndex; }

    /**
     * Private variable storing the index pointing to the active item
     */
    private _activeItemIndex = 2;

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
            case "gun": return new GunItem(item, this.owner);
            case "melee": return new MeleeItem(item, this.owner);
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
     * Checks if a given item exists on the inventory
     * @param item The item id string
     * @returns Whether the item exists on the inventory
     */
    checkIfItemExists(item: string): boolean {
        for (let i = 0; i < Inventory.MAX_SIZE; i++) {
            if (item === this._items[i]?.type.idString) { return true; }
        }
        return false;
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
        this.owner.dirty.inventory = true;

        return old;
    }

    /**
     * Serializes the inventory to send to the client
     * @param stream The bit stream to write the inventory
    */
    serializeInventory(stream: SuroiBitStream): void {
        stream.writeBoolean(this.owner.dirty.activeItemIndex);
        if (this.owner.dirty.activeItemIndex) {
            this.owner.dirty.activeItemIndex = false;
            stream.writeUint8(this.activeItemIndex);
        }
        stream.writeBoolean(this.owner.dirty.inventory);
        if (this.owner.dirty.inventory) {
            this.owner.dirty.inventory = false;
            stream.writeUint8(this._items.length);
            for (const item of this._items) {
                stream.writeBoolean(item !== undefined);
                if (item !== undefined) {
                    stream.writeObjectTypeNoCategory(item.type);
                }
            }
        }
    }
}
