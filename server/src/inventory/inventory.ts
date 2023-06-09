import {
    INVENTORY_MAX_WEAPONS,
    ObjectCategory,
    PlayerActions
} from "../../../common/src/constants";
import { ObjectType } from "../../../common/src/utils/objectType";
import { GunItem } from "./gunItem";
import { MeleeItem } from "./meleeItem";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Player } from "../objects/player";
import { type InventoryItem } from "./inventoryItem";
import { HealingAction } from "./action";
import { HealType, type HealingItemDefinition } from "../../../common/src/definitions/healingItems";
import { type LootDefinition } from "../../../common/src/definitions/loots";
import { type BackpackDefinition } from "../../../common/src/definitions/backpacks";
import { type ScopeDefinition } from "../../../common/src/definitions/scopes";
import { type ArmorDefinition } from "../../../common/src/definitions/armors";

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
        tablets: 0,
        "12g": 0,
        "556mm": 0,
        "762mm": 0,
        "9mm": 0,
        "1x_scope": 1,
        "2x_scope": 0,
        "4x_scope": 0,
        "8x_scope": 0,
        "15x_scope": 0
    };

    helmet: ObjectType<ObjectCategory.Loot, ArmorDefinition> | undefined;
    vest: ObjectType<ObjectCategory.Loot, ArmorDefinition> | undefined;
    backpack: ObjectType<ObjectCategory.Loot, BackpackDefinition> = ObjectType.fromString(ObjectCategory.Loot, "bag");

    private _scope!: ObjectType<ObjectCategory.Loot, ScopeDefinition>;

    get scope(): ObjectType<ObjectCategory.Loot, ScopeDefinition> {
        return this._scope;
    }

    set scope(scope: ObjectType<ObjectCategory.Loot, ScopeDefinition>) {
        this._scope = scope;
        this.owner.zoom = scope.definition.zoomLevel;
        this.owner.dirty.inventory = true;
    }

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
     * If the assignment is successful, `Player#dirty.activeWeaponIndex` is automatically set to `true` if the active item index changes
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

        clearTimeout(this._reloadTimeoutID);

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
     * @return The number of weapons in this inventory
     */
    get weaponCount(): number { return this._weapons.reduce((acc, item) => acc + +(item !== undefined), 0); }

    /**
     * Creates a new inventory.
     * @param owner The player this inventory belongs to
     */
    constructor(owner: Player) {
        this.owner = owner;
    }

    /**
     * Determines whether a given index is valid. For an index to be valid, it must be an integer between 0 and `Inventory.MAX_SIZE - 1` (inclusive)
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

        switch (ObjectType.fromString<ObjectCategory.Loot, LootDefinition>(ObjectCategory.Loot, item).definition.itemType) {
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
        if (this._activeWeaponIndex < 2) this.setActiveWeaponIndex(1 - this._activeWeaponIndex);
        this.owner.dirty.weapons = true;
    }

    /**
     * Puts a weapon in a certain slot, replacing the old weapon if one was there. If an item is replaced, it is dropped into the game world
     * @param slot The slot in which to insert the item
     * @param item The item to add
     * @throws {RangeError} If `slot` isn't a valid slot number
     */
    addOrReplaceWeapon(slot: number, item: GunItem | MeleeItem | string): void {
        this.owner.game.fullDirtyObjects.add(this.owner);

        /**
         * `dropWeapon` changes the active item index to something potentially undesirable,
         * so this variable keeps track of what to switch it back to
         */
        let index: number | undefined;

        if (
            // If the active weapon is being replaced, then we want to swap to the new item when done
            (slot === this._activeWeaponIndex && this._weapons[slot]?.definition.noDrop !== true) ||

            // Only melee in inventory, swap to new item's slot
            this.weaponCount === 1
        ) {
            index = slot;
        }

        // Drop old item into the game world and set the new item
        this.dropWeapon(slot, -0.01);
        this._setWeapon(slot, this._reifyItem(item));

        if (index !== undefined) {
            this.setActiveWeaponIndex(index);
            this.owner.dirty.activeWeaponIndex = false;
        }
    }

    /**
     * Attempts to add a weapon into the first free slot in this inventory. This method does not throw if it cannot add the item
     * @param item The item to add
     * @returns The slot in which the item was added, or `-1` if it could not be added
     */
    appendWeapon(item: GunItem | MeleeItem | string): number {
        for (let slot = 0; slot < INVENTORY_MAX_WEAPONS; slot++) {
            if (this._weapons[slot] === undefined) {
                this._setWeapon(slot, this._reifyItem(item));
                return slot;
            }
        }
        return -1;
    }

    /**
     * Drops a weapon from this inventory
     * @param slot The slot to drop
     * @param pushForce The velocity to push the loot, defaults to -0.02
     * @returns The item that was dropped, if any
     */
    dropWeapon(slot: number, pushForce = -0.02): GunItem | MeleeItem | undefined {
        const item = this._weapons[slot];

        if (item === undefined || item.definition.noDrop) return undefined;

        const loot = this.owner.game.addLoot(item.type, this.owner.position);
        loot.push(this.owner.rotation, pushForce);

        if (item instanceof GunItem && item.ammo > 0) {
            // Put the ammo in the gun back in the inventory
            const ammoType = item.definition.ammoType;
            this.items[ammoType] += item.ammo;

            // If the new amount is more than the inventory can hold, drop the extra
            const overAmount = this.items[ammoType] - this.backpack.definition.maxCapacity[ammoType];
            if (overAmount > 0) {
                /*const splitUpLoot = (player: Player, item: string, amount: number): void => {
                    const dropCount = Math.floor(amount / 60);
                    for (let i = 0; i < dropCount; i++) {
                        const loot = this.owner.game.addLoot(ObjectType.fromString(ObjectCategory.Loot, item), player.position, 60);
                        pushLoot(loot);
                    }

                    if (amount % 60 !== 0) {
                        const loot = this.owner.game.addLoot(ObjectType.fromString(ObjectCategory.Loot, item), player.position, amount % 60);
                        pushLoot(loot);
                    }
                };

                splitUpLoot(this.owner, ammoType, overAmount);*/
                this.items[ammoType] -= overAmount;
                const loot = this.owner.game.addLoot(ObjectType.fromString(ObjectCategory.Loot, ammoType), this.owner.position, overAmount);
                loot.push(this.owner.rotation, pushForce);
            }

            this.owner.dirty.inventory = true;
        }

        this.removeWeapon(slot);

        if (this._activeWeaponIndex === slot && this._activeWeaponIndex < 2) {
            const otherSlot = 1 - this._activeWeaponIndex;

            this.setActiveWeaponIndex(this.hasWeapon(otherSlot) ? otherSlot : 2);
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
     * in the case of the attempted removal of this inventory's only item, the operation will be cancelled, and fists will be put in
     * the melee slot
     *
     * If the only item was fists and an item is added in slots 0 or 1, it will be swapped to
     * @param slot The slot to place the item in
     * @param item The item to place there
     * @returns The item that was previously located in the slot, if any
     * @throws {RangeError} If `slot` isn't a valid slot number
     */
    private _setWeapon(slot: number, item: GunItem | MeleeItem | undefined): GunItem | MeleeItem | undefined {
        if (!Inventory.isValidWeaponSlot(slot)) throw new RangeError(`Attempted to set weapon in invalid slot '${slot}'`);

        const old = this._weapons[slot];
        this._weapons[slot] = item;
        this.owner.dirty.weapons = true;

        if (slot === 2 && item === undefined) {
            this._weapons[slot] = new MeleeItem("fists", this.owner);
        }

        if (slot < 2 && this.weaponCount === 2) {
            this.setActiveWeaponIndex(slot);
        }

        return old;
    }

    useItem(itemString: string): void {
        if (!this.items[itemString]) return;

        const item = ObjectType.fromString(ObjectCategory.Loot, itemString);
        const definition = item.definition as LootDefinition;

        switch (definition.itemType) {
            case ItemType.Healing: {
                if (this.owner.action && this.owner.action.type === PlayerActions.UseItem &&
                    (this.owner.action as HealingAction).item.idNumber === item.idNumber) return;

                const definition = item.definition as HealingItemDefinition;

                if (definition.healType === HealType.Health && this.owner.health >= 100) return;
                if (definition.healType === HealType.Adrenaline && this.owner.adrenaline >= 100) return;

                this.owner.executeAction(new HealingAction(this.owner, item));
                break;
            }
            case ItemType.Scope: {
                this.scope = item as ObjectType<ObjectCategory.Loot, ScopeDefinition>;
                break;
            }
        }
    }

    setScope(scope: ObjectType<ObjectCategory.Loot, ScopeDefinition>): void {
        this.scope = scope;
        this.owner.zoom = scope.definition.zoomLevel;
        this.owner.dirty.zoom = true;
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

        stream.writeBoolean(this.owner.dirty.weapons);
        if (this.owner.dirty.weapons) {
            this.owner.dirty.weapons = false;
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

        stream.writeBoolean(this.owner.dirty.inventory);
        if (this.owner.dirty.inventory) {
            this.owner.dirty.inventory = false;
            stream.writeBits(this.backpack.definition.level, 2);
            for (const count of Object.values(this.items)) {
                stream.writeBoolean(count > 0); // Has item
                if (count > 0) stream.writeBits(count, 9);
            }
            stream.writeObjectTypeNoCategory(this.scope);
        }
    }
}
