import { INVENTORY_MAX_WEAPONS, ObjectCategory } from "../../../common/src/constants";
import { ObjectType } from "../../../common/src/utils/objectType";
import { GunItem } from "./gunItem";
import { MeleeItem } from "./meleeItem";
import { type ItemDefinition, ItemType } from "../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Player } from "../objects/player";
import { type InventoryItem } from "./inventoryItem";
import { Loot } from "../objects/loot";
import { v, vAdd } from "../../../common/src/utils/vector";

/**
 * A class representing a player's inventory
 */
export class Inventory {
    /**
     * The player that this inventory belongs to
     */
    readonly owner: Player;

    readonly items: Record<string, number> = {
        gauze: 0,
        medikit: 0,
        cola: 0,
        tablets: 0
    };

    /**
     * An internal array storing weapons
     */
    private readonly _weapons: Array<GunItem | MeleeItem | undefined> = new Array<GunItem | MeleeItem | undefined>(INVENTORY_MAX_WEAPONS);

    /**
     * Private variable storing the index pointing to the last active weapon
     */
    private _lastWeaponIndex = 0;

    /**
     * Returns the index pointing to the last active weapon
     */
    get lastWeaponIndex(): number { return this._lastWeaponIndex; }

    /**
     * Private variable storing the index pointing to the active weapon
     */
    private _activeWeaponIndex = 2;

    /**
     * Returns the index pointing to the active weapon
     */
    get activeWeaponIndex(): number { return this._activeWeaponIndex; }

    /**
     * Sets the index pointing to the active item, if it is valid. Passing an invalid index throws a `RangeError`
     * If the assignment is successful, `Player#activeItemIndexDirty` is automatically set to `true` if the active item index changes
     * @param slot The new slot
     */
    setActiveWeaponIndex(slot: number): boolean {
        if (!Inventory.isValidWeaponSlot(slot)) throw new RangeError(`Attempted to set active index to invalid slot '${slot}'`);
        if (!this.hasWeapon(slot)) return false;

        const old = this._activeWeaponIndex;
        this._activeWeaponIndex = slot;

        if (slot !== old) {
            this._lastWeaponIndex = old;
        }

        // todo switch penalties, other stuff that should happen when switching items
        // (started)
        const item = this._weapons[slot];
        if (item !== undefined) item._switchDate = this.owner.game.now;

        this.owner.attacking = false;
        this.owner.dirty.activeWeaponIndex = true;
        this.owner.recoil.active = false; // allows for quickswitching
        this.owner.game.fullDirtyObjects.add(this.owner);
        this.owner.fullDirtyObjects.add(this.owner);

        return true;
    }

    /**
     * Returns this inventory's active weapon
     * It will never be undefined since the only place that sets the active weapon has an undefined check
     */
    get activeWeapon(): InventoryItem {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this._weapons[this._activeWeaponIndex]!;
    }

    /**
     * The number of weapons in this inventory
     */
    private _weaponCount = 0;

    /**
     * @return The number of weapons in this inventory
     */
    get weaponCount(): number { return this._weaponCount; }

    /**
     * Creates a new inventory.
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
    static isValidWeaponSlot(slot: number): boolean {
        return slot % 0 !== 0 || // If it's not an integer
            slot < 0 || // Or it's negative
            slot > INVENTORY_MAX_WEAPONS - 1; // Or it's beyond the max slot number
    }

    /**
     * Internal method used to convert a string to the `InventoryItem` whose `idString` matches it
     * @param item The item to convert
     * @returns The corresponding `InventoryItem` subclass
     */
    private _reifyItem(item: GunItem | MeleeItem | string): GunItem | MeleeItem | undefined {
        if (item instanceof GunItem || item instanceof MeleeItem) return item;

        switch ((ObjectType.fromString(ObjectCategory.Loot, item).definition as ItemDefinition).itemType) {
            case ItemType.Gun: return new GunItem(item, this.owner);
            case ItemType.Melee: return new MeleeItem(item, this.owner);
        }
    }

    /**
     * Tests whether a weapon exists in a certain slot
     * @param slot The slot to test
     * @returns Whether or not there exists an item in the given slot
     * @throws {RangeError} If `slot` isn't a valid slot number
     */
    hasWeapon(slot: number): boolean {
        if (!Inventory.isValidWeaponSlot(slot)) throw new RangeError(`Attempted to test for item in invalid slot '${slot}'`);

        return this._weapons[slot] !== undefined;
    }

    /**
     * Swaps the items in two weapon slots, without checking if there are actually items in those slots
     * @param slotA The first slot
     * @param slotB The second slot
     * @throws {RangeError} If either slot is invalid
     */
    swapItems(slotA: number, slotB: number): void {
        if (!Inventory.isValidWeaponSlot(slotA) || !Inventory.isValidWeaponSlot(slotB)) throw new RangeError(`Attempted to swap items where one or both of the slots were invalid (slotA: ${slotA}, slotB: ${slotB})`);

        [this._weapons[slotA], this._weapons[slotB]] =
            [this._weapons[slotB], this._weapons[slotA]];
    }

    /**
     * Puts a weapon in a certain slot, replacing the old weapon if one was there. If an item is replaced, it is dropped into the game world
     * @param slot The slot in which to insert the item
     * @param item The item to add
     * @throws {RangeError} If `slot` isn't a valid slot number
     */
    addOrReplaceWeapon(slot: number, item: GunItem | MeleeItem | string): void {
        this.owner.dirty.inventory = true;
        this.owner.game.fullDirtyObjects.add(this.owner);
        this.owner.fullDirtyObjects.add(this.owner);
        // Drop old item into the game world
        const oldItem: GunItem | MeleeItem | undefined = this._setWeapon(slot, this._reifyItem(item));
        if (oldItem === undefined) return;
        const invertedAngle = (this.owner.rotation + Math.PI) % (2 * Math.PI);
        /* eslint-disable-next-line no-new */
        new Loot(this.owner.game, oldItem.type, vAdd(this.owner.position, v(0.4 * Math.cos(invertedAngle), 0.4 * Math.sin(invertedAngle))));
    }

    /**
     * Attempts to add a weapon into the first free slot in this inventory. This method does not throw if it cannot add the item
     * @param item The item to add
     * @returns The slot in which the item was added, or `-1` if it could not be added
     */
    appendWeapon(item: GunItem | MeleeItem | string): number {
        for (let slot = 0; slot < INVENTORY_MAX_WEAPONS; slot++) {
            if (this._weapons[slot] === undefined) {
                this._weapons[slot] = this._reifyItem(item);
                this.owner.dirty.inventory = true;
                this.setActiveWeaponIndex(slot);
                return slot;
            }
        }
        return -1;
    }

    /**
     * Removes a weapon from this inventory, without dropping it into the game world
     * @param slot The slot from which to remove an item
     * @returns The item that was removed, if any
     * @throws {RangeError} If `slot` isn't a valid slot number
     * @throws {Error} If performing this operation would leave the inventory empty
     */
    removeWeapon(slot: number): GunItem | MeleeItem | undefined {
        return this._setWeapon(slot, undefined);
    }

    /**
     * Checks if the inventory has the given weapon.
     * @param item The item id string
     * @returns Whether the item exists on the inventory
     */
    checkIfWeaponExists(item: string): boolean {
        for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
            if (item === this._weapons[i]?.type.idString) { return true; }
        }
        return false;
    }

    /**
     * Forcefully sets a weapon in a given slot. Note that this operation will never leave the inventory empty:
     * in the case of the attempted removal of this inventory's only item, the operation will be cancelled, and an error will be thrown.
     * @param slot The slot to place the item in
     * @param item The item to place there
     * @returns The item that was previously located in the slot, if any
     * @throws {RangeError} If `slot` isn't a valid slot number
     * @throws {Error} If performing this operation would leave the inventory empty
     */
    private _setWeapon(slot: number, item: GunItem | MeleeItem | undefined): GunItem | MeleeItem | undefined {
        if (!Inventory.isValidWeaponSlot(slot)) throw new RangeError(`Attempted to set weapon in invalid slot '${slot}'`);

        const old = this._weapons[slot];

        const wasEmpty = old === undefined;
        const isEmpty = item === undefined;

        this._weapons[slot] = item;

        if (wasEmpty !== isEmpty) {
            isEmpty ? --this._weaponCount : ++this._weaponCount;
        }

        if (this._weaponCount === 0) {
            // revert changes in case of error-handling
            this._weapons[slot] = old;
            this._weaponCount = 1;
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
        stream.writeBoolean(this.owner.dirty.activeWeaponIndex);
        if (this.owner.dirty.activeWeaponIndex) {
            this.owner.dirty.activeWeaponIndex = false;
            stream.writeUint8(this.activeWeaponIndex);
        }
        stream.writeBoolean(this.owner.dirty.inventory);
        if (this.owner.dirty.inventory) {
            this.owner.dirty.inventory = false;
            for (const item of this._weapons) {
                stream.writeBoolean(item !== undefined);
                if (item !== undefined) {
                    stream.writeObjectTypeNoCategory(item.type);
                }
            }
        }
    }
}
