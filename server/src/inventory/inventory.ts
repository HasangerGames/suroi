import { DEFAULT_INVENTORY, GameConstants } from "../../../common/src/constants.js";
import { Ammos, type AmmoDefinition } from "../../../common/src/definitions/ammos.js";
import { type ArmorDefinition } from "../../../common/src/definitions/armors.js";
import { type BackpackDefinition } from "../../../common/src/definitions/backpacks.js";
import { type GunDefinition } from "../../../common/src/definitions/guns.js";
import { HealType, type HealingItemDefinition, HealingItems } from "../../../common/src/definitions/healingItems.js";
import { Loots, type WeaponDefinition } from "../../../common/src/definitions/loots.js";
import { type MeleeDefinition } from "../../../common/src/definitions/melees.js";
import { Scopes, type ScopeDefinition } from "../../../common/src/definitions/scopes.js";
import { absMod } from "../../../common/src/utils/math.js";
import { type Timeout } from "../../../common/src/utils/misc.js";
import { ItemType, type ReifiableDef } from "../../../common/src/utils/objectDefinitions.js";
import { type Player } from "../objects/player.js";
import { HealingAction } from "./action.js";
import { GunItem } from "./gunItem.js";
import { type InventoryItem } from "./inventoryItem.js";
import { MeleeItem } from "./meleeItem.js";

type ReifiableItem = GunItem | MeleeItem | ReifiableDef<GunDefinition> | ReifiableDef<MeleeDefinition>;

const InventoryItemMapping = {
    [ItemType.Gun]: GunItem,
    [ItemType.Melee]: MeleeItem
};

/**
 * A class representing a player's inventory
 */
export class Inventory {
    /**
     * The player that this inventory belongs to
     */
    readonly owner: Player;

    readonly items = JSON.parse(JSON.stringify(DEFAULT_INVENTORY));

    helmet?: ArmorDefinition;
    vest?: ArmorDefinition;
    backpack: BackpackDefinition = Loots.fromString("bag");

    private _scope!: ScopeDefinition;

    get scope(): ScopeDefinition {
        return this._scope;
    }

    set scope(scope: ReifiableDef<ScopeDefinition>) {
        this._scope = Loots.reify<ScopeDefinition>(scope);
        this.owner.dirty.items = true;
    }

    /**
     * An internal array storing weapons
     */
    readonly weapons = new Array<InventoryItem | undefined>(GameConstants.player.maxWeapons);

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
     * A reference to the timeout object responsible for scheduling the action
     * of reloading, kept here in case said action needs to be cancelled
     */
    private _reloadTimeout?: Timeout;

    /**
     * Returns the index pointing to the active weapon
     */
    get activeWeaponIndex(): number { return this._activeWeaponIndex; }

    /**
     * Sets the index pointing to the active item, if it is valid. Passing an invalid index throws a `RangeError`
     * If the assignment is successful, `Player#dirty.activeWeaponIndex` is automatically set to `true` if the active item index changes
     * @param slot The new slot
     * @returns Whether the swap was done successfully
     */
    setActiveWeaponIndex(slot: number): boolean {
        if (!Inventory.isValidWeaponSlot(slot)) throw new RangeError(`Attempted to set active index to invalid slot '${slot}'`);
        if (!this.hasWeapon(slot) || slot === this._activeWeaponIndex) return false;
        const old = this._activeWeaponIndex;
        this._activeWeaponIndex = slot;

        // todo switch penalties, other stuff that should happen when switching items
        // (started)
        const item = this.weapons[slot];
        const owner = this.owner;

        this._lastWeaponIndex = old;

        this._reloadTimeout?.kill();
        if (this.activeWeapon.category === ItemType.Gun) {
            (this.activeWeapon as GunItem).cancelAllTimers();
        }
        owner.bufferedAttack?.kill();

        if (item !== undefined) {
            const oldItem = this.weapons[old];
            if (oldItem) oldItem.isActive = false;

            item.isActive = true;

            const now = owner.game.now;

            let effectiveSwitchDelay: number;

            if (
                item.definition.itemType !== ItemType.Gun || (
                    now - owner.lastFreeSwitch >= 1000 &&
                    !item.definition.noQuickswitch
                )
            ) {
                effectiveSwitchDelay = 250;
                owner.lastFreeSwitch = now;
            } else {
                effectiveSwitchDelay = item.definition.switchDelay;
            }
            owner.effectiveSwitchDelay = effectiveSwitchDelay;

            owner.lastSwitch = item.switchDate = now;

            if (item instanceof GunItem && item.ammo <= 0) {
                this._reloadTimeout = this.owner.game.addTimeout(
                    item.reload.bind(item),
                    owner.effectiveSwitchDelay
                );
            }
        }

        owner.attacking = false;
        owner.recoil.active = false;

        if (slot !== old) {
            owner.dirty.weapons = true;
            owner.game.fullDirtyObjects.add(this.owner);
        }
        owner.updateAndApplyModifiers();

        return true;
    }

    /**
     * Returns this inventory's active weapon
     * It will never be undefined since the only place that sets the active weapon has an undefined check
     */
    get activeWeapon(): InventoryItem<WeaponDefinition> {
        return this.weapons[this._activeWeaponIndex]!;
    }

    /**
     * @return The number of weapons in this inventory
     */
    get weaponCount(): number { return this.weapons.reduce((acc, item) => acc + +(item !== undefined), 0); }

    /**
     * Creates a new inventory.
     * @param owner The player this inventory belongs to
     */
    constructor(owner: Player) {
        this.owner = owner;

        for (const item of [...HealingItems, ...Ammos, ...Scopes]) {
            let amount = 0;

            if (item.itemType === ItemType.Ammo && item.ephemeral) {
                amount = Infinity;
            }

            if (item.itemType === ItemType.Scope && item.giveByDefault) {
                amount = 1;
                this.scope ??= item.idString;
            }

            this.items[item.idString] = amount;
        }

        if (this.scope === undefined) {
            this.scope = Scopes.definitions[0].idString;
        }
    }

    /**
     * Determines whether a given index is valid. For an index to be valid, it must be an integer between 0 and `Inventory.MAX_SIZE - 1` (inclusive)
     * @param slot The number to test
     * @returns Whether the number is a valid slot
     */
    static isValidWeaponSlot(slot: number): boolean {
        return slot % 0 !== 0 || // If it's not an integer
            slot < 0 || // Or it's negative
            slot > GameConstants.player.maxWeapons - 1; // Or it's beyond the max slot number
    }

    /**
     * Internal method used to convert a string to the `InventoryItem` whose `idString` matches it
     * @param item The item to convert
     * @returns The corresponding `InventoryItem` subclass
     */
    private _reifyItem(item: ReifiableItem): InventoryItem | undefined {
        if (item instanceof GunItem || item instanceof MeleeItem) return item;
        const definition = Loots.reify<WeaponDefinition>(item);

        return new InventoryItemMapping[definition.itemType](definition.idString, this.owner);
    }

    /**
     * Tests whether a weapon exists in a certain slot
     * @param slot The slot to test
     * @returns Whether or not there exists an item in the given slot
     * @throws {RangeError} If `slot` isn't a valid slot number
     */
    hasWeapon(slot: number): boolean {
        if (!Inventory.isValidWeaponSlot(slot)) throw new RangeError(`Attempted to test for item in invalid slot '${slot}'`);

        return this.weapons[slot] !== undefined;
    }

    /**
     * Swaps the items in the gun slots
     */
    swapGunSlots(): void {
        [this.weapons[0], this.weapons[1]] =
            [this.weapons[1], this.weapons[0]];

        if (this._activeWeaponIndex < 2) this.setActiveWeaponIndex(1 - this._activeWeaponIndex);
        this.owner.dirty.weapons = true;
    }

    /**
     * Puts a weapon in a certain slot, replacing the old weapon if one was there. If an item is replaced, it is dropped into the game world
     * @param slot The slot in which to insert the item
     * @param item The item to add
     * @throws {RangeError} If `slot` isn't a valid slot number
     */
    addOrReplaceWeapon(slot: number, item: ReifiableItem): void {
        this.owner.game.fullDirtyObjects.add(this.owner);

        /**
         * `dropWeapon` changes the active item index to something potentially undesirable,
         * so this variable keeps track of what to switch it back to
         */
        let index: number | undefined;

        if (
            // If the active weapon is being replaced, then we want to swap to the new item when done
            (slot === this._activeWeaponIndex && this.weapons[slot]?.definition.noDrop !== true) ||

            // Only melee in inventory, swap to new item's slot
            this.weaponCount === 1
        ) {
            index = slot;
        }

        // Drop old item into the game world and set the new item
        this.dropWeapon(slot, -5);
        this._setWeapon(slot, this._reifyItem(item));

        if (index !== undefined) {
            this.setActiveWeaponIndex(index);
        }
    }

    /**
     * Attempts to add a weapon into the first free slot in this inventory. This method does not throw if it cannot add the item
     * @param item The item to add
     * @returns The slot in which the item was added, or `-1` if it could not be added
     */
    appendWeapon(item: ReifiableItem): number {
        for (let slot = 0; slot < GameConstants.player.maxWeapons; slot++) {
            if (this.weapons[slot] === undefined) {
                this._setWeapon(slot, this._reifyItem(item));
                return slot;
            }
        }

        return -1;
    }

    /**
     * Drops a weapon from this inventory
     * @param slot The slot to drop
     * @param pushForce The velocity to push the loot, defaults to -10
     * @returns The item that was dropped, if any
     */
    dropWeapon(slot: number, pushForce = -10): InventoryItem | undefined {
        const item = this.weapons[slot];

        if (item === undefined || item.definition.noDrop) return undefined;

        this.owner.game
            .addLoot(item.definition, this.owner.position)
            .push(this.owner.rotation, pushForce);

        if (item instanceof GunItem && item.dual) {
            this.owner.game
                .addLoot(item.definition, this.owner.position)
                .push(this.owner.rotation, pushForce);
        }

        if (item instanceof GunItem && item.ammo > 0) {
            // Put the ammo in the gun back in the inventory
            const ammoType = item.definition.ammoType;
            this.items[ammoType] += item.ammo;

            /*
                If the new amount is more than the inventory can hold, drop the extra
                unless the owner is dead; in that case, we ignore the limit

                When players die, they drop equipable items (firearms and melees) before
                dropping stackable items (ammos, consumable). Therefore, if a player has a gun
                and their ammo reserve for that gun's ammo is full, the gun and its stored ammo will
                be dropped, and the the reserve will be dropped, which potentially creates more
                blocks of ammo than required.

                For example, consider a 5-round shotgun with a 15-round reserve. Combined, this is 20
                rounds, well below the limit of 60 per block. However, because the gun is dropped with its
                5 ammo, and then the 15 ammo in reserve is dropped afterwards, we get two blocks instead of
                one.

                To solve this, we just ignore capacity limits when the player is dead.
            */
            const overAmount = Loots.reify<AmmoDefinition>(ammoType).ephemeral ?? this.owner.dead
                ? 0
                : this.items[ammoType] - (this.backpack?.maxCapacity[ammoType] ?? 0);

            if (overAmount > 0) {
                this.items[ammoType] -= overAmount;

                this.owner.game
                    .addLoot(ammoType, this.owner.position, overAmount)
                    .push(this.owner.rotation, pushForce);
            }

            this.owner.dirty.items = true;
        }

        this.removeWeapon(slot);
        this.owner.game.fullDirtyObjects.add(this.owner);

        return item;
    }

    /*
     * Drops all weapons from this inventory
     */
    dropWeapons(): void {
        for (let i = 0; i < this.weapons.length; i++) {
            this.dropWeapon(i);
        }
    }

    /**
     * Removes a weapon from this inventory, without dropping it into the game world
     * @param slot The slot from which to remove an item
     * @returns The item that was removed, if any
     * @throws {RangeError} If `slot` isn't a valid slot number
     * @throws {Error} If performing this operation would leave the inventory empty
     */
    removeWeapon(slot: number): InventoryItem | undefined {
        return this._setWeapon(slot, undefined);
    }

    /**
     * Checks if the inventory has the given weapon.
     * @param item The item id string
     * @returns Whether the item exists on the inventory
     */
    checkIfWeaponExists(item: string): boolean {
        return this.weapons.some(weapon => weapon?.definition.idString === item);
    }

    /**
     * Gets the weapon at a given index
     * @param index The weapon index
     * @returns The weapon at the given index, undefined if empty
     */
    getWeapon(index: number): InventoryItem | undefined {
        return this.weapons[index];
    }

    /**
     * Forcefully sets a weapon in a given slot. Note that this operation will never leave the inventory empty:
     * in the case of the attempted removal of this inventory's only item, the operation will be cancelled, and fists will be put in
     * the melee slot
     *
     * If the only item was fists and an item is added in slots 0 or 1, it will be swapped to
     * @param slot The slot to place the item in
     * @param item The item to place there. Omitting this parameter removes the item at the given slot
     * @returns The item that was previously located in the slot, if any
     * @throws {RangeError} If `slot` isn't a valid slot number
     */
    private _setWeapon(slot: number, item?: InventoryItem): InventoryItem | undefined {
        if (!Inventory.isValidWeaponSlot(slot)) throw new RangeError(`Attempted to set weapon in invalid slot '${slot}'`);

        const old = this.weapons[slot];
        this.weapons[slot] = item;
        this.owner.dirty.weapons = true;
        const removal = item === undefined;

        if (removal) {
            if (slot === 2) {
                this.weapons[slot] = new MeleeItem("fists", this.owner);
            } else if (slot === this._activeWeaponIndex) {
                let target = this._activeWeaponIndex;
                while (!this.hasWeapon(target)) {
                    target = absMod(target + 1, this.weapons.length);
                }
                this.setActiveWeaponIndex(target);
            }
        }

        /*
            This is a bit of a weird one, but the short explanation is that
            we wanna avoid having last = current unless we have no other option
        */
        let target = this._lastWeaponIndex === this._activeWeaponIndex && !removal
            ? 0
            : this._lastWeaponIndex;
        while (!this.hasWeapon(target)) {
            target = absMod(target - 1, this.weapons.length);
        }
        this._lastWeaponIndex = target;

        item?.refreshModifiers();
        this.owner.updateAndApplyModifiers();

        return old;
    }

    /**
     * Attempts to use a consumable item or a scope with the given `idString`
     * @param itemString The `idString` of the consumable or scope to use
     */
    useItem(itemString: ReifiableDef<HealingItemDefinition | ScopeDefinition>): void {
        const definition = Loots.reify(itemString);

        if (!this.items[definition.idString]) return;

        switch (definition.itemType) {
            case ItemType.Healing: {
                // Already consuming something else
                if (this.owner.action instanceof HealingAction) return;

                if (definition.healType === HealType.Health &&
                    this.owner.health >= this.owner.maxHealth) return;
                if (definition.healType === HealType.Adrenaline &&
                    this.owner.adrenaline >= this.owner.maxAdrenaline) return;

                this.owner.executeAction(new HealingAction(this.owner, definition.idString));
                break;
            }
            case ItemType.Scope: {
                this.scope = definition.idString;
                break;
            }
        }
    }
}
