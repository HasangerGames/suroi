import { INVENTORY_MAX_WEAPONS, ObjectCategory } from "../../../common/src/constants";
import { ObjectType } from "../../../common/src/utils/objectType";
import { GunItem } from "./gunItem";
import { MeleeItem } from "./meleeItem";
import { type ItemDefinition, ItemType } from "../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Player } from "../objects/player";
import { type InventoryItem } from "./inventoryItem";
import { v, vAdd } from "../../../common/src/utils/vector";
import { Vec2 } from "planck";
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

    private _reloadTimeoutID: NodeJS.Timeout | undefined;

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

        if (this._reloadTimeoutID !== undefined) {
            clearTimeout(this._reloadTimeoutID);
            this._reloadTimeoutID = undefined;
        }

        // todo switch penalties, other stuff that should happen when switching items
        // (started)
        const oldItem = this._weapons[old];
        const item = this._weapons[slot];
        if (item !== undefined) {
            item._switchDate = this.owner.game.now;
            if (
                item instanceof GunItem &&
                oldItem instanceof GunItem &&
                oldItem.definition.canQuickswitch
            ) {
                item.ignoreSwitchCooldown = true;
            }
            if (item instanceof GunItem && item.ammo <= 0) {
                this._reloadTimeoutID = setTimeout(() => { item.reload(); }, 450);
            }
        }

        this.owner.attacking = false;
        this.owner.recoil.active = false; // allows for quickswitching

        if (slot !== old) {
            this.owner.dirty.activeWeaponIndex = true;
            this.owner.game.fullDirtyObjects.add(this.owner);
        }

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
     * Swaps the items in the gun slots
     */
    swapGunSlots(): void {
        [this._weapons[0], this._weapons[1]] =
        [this._weapons[1], this._weapons[0]];
        if (this.activeWeaponIndex === 0) this.setActiveWeaponIndex(1);
        else if (this.activeWeaponIndex === 1) this.setActiveWeaponIndex(0);
        this.owner.dirty.inventory = true;
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

        if (oldItem === undefined || oldItem.definition.noDrop) return;
        const invertedAngle = (this.owner.rotation + Math.PI) % (2 * Math.PI);

        this.owner.game.addLoot(oldItem.type, vAdd(this.owner.position, v(0.4 * Math.cos(invertedAngle), 0.4 * Math.sin(invertedAngle))));
        this.setActiveWeaponIndex(this._activeWeaponIndex);
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
     * Drops a weapon from this inventory
     * @param slot The slot to drop
     * @returns The item that was dropped, if any
     */
    dropWeapon(slot: number): GunItem | MeleeItem | undefined {
        const item = this._weapons[slot];

        if (item === undefined || item.definition.noDrop) return undefined;

        const loot = this.owner.game.addLoot(item.type, this.owner.position);
        loot.body.setLinearVelocity(Vec2(Math.cos(this.owner.rotation), -Math.sin(this.owner.rotation)).mul(-0.02));

        this.removeWeapon(slot);

        if (this.activeWeaponIndex === slot) {
            // Switch to last weapon if it exists, fallback to melee slot if it doesn't
            if (this.hasWeapon(this._lastWeaponIndex)) this.setActiveWeaponIndex(this._lastWeaponIndex);
            else this.setActiveWeaponIndex(2);
        }

        this.owner.game.fullDirtyObjects.add(this.owner);

        return item;
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
        return this._weapons.some(weapon => weapon?.type.idString === item);
    }

    /**
     * Gets the weapon at a given index
     * @param index The weapon index
     * @returns The weapon at the given index, undefined if empty
     */
    getWeapon(index: number): GunItem | MeleeItem | undefined {
        return this._weapons[index];
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

        this._weapons[slot] = item;

        this.owner.dirty.inventory = true;

        if (slot === 2 && item === undefined) {
            this._weapons[slot] = new MeleeItem("fists", this.owner);
        }

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
            stream.writeBits(this.activeWeaponIndex, 2);
        }

        stream.writeBoolean(this.owner.dirty.inventory);
        if (this.owner.dirty.inventory) {
            this.owner.dirty.inventory = false;
            for (const item of this._weapons) {
                stream.writeBoolean(item !== undefined);
                if (item !== undefined) {
                    stream.writeObjectTypeNoCategory(item.type);
                    if (item instanceof GunItem) {
                        // TODO: find a better place to send the ammo instead of sending it with the inventory guns
                        stream.writeUint8(item.ammo);
                    }
                }
            }
        }
    }
}
