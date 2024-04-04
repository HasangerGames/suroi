import { DEFAULT_INVENTORY, GameConstants } from "../../../common/src/constants";
import { Ammos, type AmmoDefinition } from "../../../common/src/definitions/ammos";
import { ArmorType, type ArmorDefinition } from "../../../common/src/definitions/armors";
import { type BackpackDefinition } from "../../../common/src/definitions/backpacks";
import { type DualGunNarrowing, type GunDefinition } from "../../../common/src/definitions/guns";
import { HealType, HealingItems, type HealingItemDefinition } from "../../../common/src/definitions/healingItems";
import { Loots, type LootDefinition, type WeaponDefinition } from "../../../common/src/definitions/loots";
import { Scopes, type ScopeDefinition } from "../../../common/src/definitions/scopes";
import { Throwables, type ThrowableDefinition } from "../../../common/src/definitions/throwables";
import { Numeric } from "../../../common/src/utils/math";
import { type Timeout } from "../../../common/src/utils/misc";
import { ItemType, type ReferenceTo, type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { type Vector } from "../../../common/src/utils/vector";
import { type Player } from "../objects/player";
import { HealingAction } from "./action";
import { GunItem } from "./gunItem";
import { InventoryItem } from "./inventoryItem";
import { MeleeItem } from "./meleeItem";
import { ThrowableItem } from "./throwableItem";

type ReifiableItem =
    GunItem |
    MeleeItem |
    ThrowableItem |
    ReifiableDef<WeaponDefinition>;

export const InventoryItemMapping = {
    [ItemType.Gun]: GunItem,
    [ItemType.Melee]: MeleeItem,
    [ItemType.Throwable]: ThrowableItem
};

/* eslint-disable @typescript-eslint/indent */
// eslint try not to be braindamaged challenge (impossible)

/**
 * A class representing a player's inventory
 */
export class Inventory {
    /**
     * The player that this inventory belongs to
     */
    readonly owner: Player;

    readonly items = new ItemCollection(Object.entries(DEFAULT_INVENTORY));

    helmet?: ArmorDefinition;
    vest?: ArmorDefinition;
    backpack: BackpackDefinition = Loots.fromString("bag");

    private _scope!: ScopeDefinition;
    get scope(): ScopeDefinition { return this._scope; }
    set scope(scope: ReifiableDef<ScopeDefinition>) {
        this._scope = Loots.reify<ScopeDefinition>(scope);
        this.owner.dirty.items = true;
    }

    private _throwable?: ThrowableDefinition;
    get throwable(): ThrowableDefinition | undefined { return this._throwable; }
    set throwable(throwable: ReifiableDef<ThrowableDefinition>) {
        this._throwable = Loots.reify<ThrowableDefinition>(throwable);
    }

    /**
     * Each ThrowableItem instance represents a *type* of throwable, and they need to be
     * cycled through. It'd be wasteful to re-instantiate them every time the user swaps
     * throwables, so we cache them here
     */
    readonly throwableItemMap = (() => {
        return new (class <K, V> extends Map<K, V> {
            getAndSetIfAbsent(key: K, fallback: () => V): V {
                return (
                    this.has(key)
                        ? this
                        : this.set(key, fallback())
                ).get(key)!;
            }
        })<ReferenceTo<ThrowableDefinition>, ThrowableItem>();
    })();

    /**
     * An internal array storing weapons
     */
    readonly weapons: Array<InventoryItem | undefined> = Array.from(
        { length: GameConstants.player.maxWeapons },
        () => undefined
    );

    readonly slotsByItemType = Object.freeze(
        GameConstants.player.inventorySlotTypings.reduce(
            (acc, cur, i) => {
                (acc[cur] ??= []).push(i);
                return acc;
            },
            // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter, @typescript-eslint/consistent-type-assertions
            {} as Record<ItemType, undefined | number[]>
        )
    );

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
     * A reference to the timeout object responsible for scheduling the action
     * of reloading, kept here in case said action needs to be cancelled
     */
    private _reloadTimeout?: Timeout;

    /**
     * Sets the index pointing to the active item, if it is valid. Passing an invalid index throws a `RangeError`
     * If the assignment is successful, `Player#dirty.activeWeaponIndex` is automatically set to `true` if the active item index changes
     * @param slot The new slot
     * @returns Whether the swap was done successfully
     */
    setActiveWeaponIndex(slot: number): boolean {
        if (!Inventory.isValidWeaponSlot(slot)) throw new RangeError(`Attempted to set active index to invalid slot '${slot}'`);
        if (!this.hasWeapon(slot) || slot === this._activeWeaponIndex) return false;

        // todo switch penalties, other stuff that should happen when switching items
        // (started)

        const old = this._activeWeaponIndex;
        this._activeWeaponIndex = slot;

        this._lastWeaponIndex = old;

        const oldItem = this.weapons[old];
        if (oldItem) {
            oldItem.isActive = false;
            oldItem.stopUse();
        }

        const item = this.weapons[slot]!;
        // nna is fine cuz of the hasWeapon call above
        const owner = this.owner;

        this._reloadTimeout?.kill();
        if (this.activeWeapon.category === ItemType.Gun) {
            (this.activeWeapon as GunItem).cancelAllTimers();
        }
        owner.bufferedAttack?.kill();

        item.isActive = true;

        const now = owner.game.now;

        let effectiveSwitchDelay: number;

        if (item.definition.itemType !== ItemType.Gun || (
            now - owner.lastFreeSwitch >= 1000 &&
            !item.definition.noQuickswitch
        )) {
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

        owner.attacking = false;
        owner.recoil.active = false;
        owner.dirty.weapons = true;
        this.owner.setDirty();

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

            this.items.setItem(item.idString, amount);
        }

        this.scope ??= Scopes.definitions[0].idString;
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
    private _reifyItem<Def extends WeaponDefinition>(item: ReifiableDef<Def> | InstanceType<(typeof InventoryItemMapping)[Def["itemType"]]>): InstanceType<(typeof InventoryItemMapping)[Def["itemType"]]> {
        if (item instanceof InventoryItem) return item;
        type Item = InstanceType<(typeof InventoryItemMapping)[Def["itemType"]]>;
        const definition = Loots.reify<WeaponDefinition>(item);

        return new InventoryItemMapping[definition.itemType](definition.idString, this.owner) as Item;
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
        if (!Inventory.isValidWeaponSlot(slot)) throw new RangeError(`Attempted to set item in invalid slot '${slot}'`);
        this.owner.setDirty();

        /**
         * `dropWeapon` changes the active item index to something potentially undesirable,
         * so this variable keeps track of what to switch it back to
         */
        let index: number | undefined;

        const slotObj = this.weapons[slot];
        if (
            // If the active weapon is being replaced, then we want to swap to the new item when done
            (slot === this._activeWeaponIndex && slotObj?.definition.noDrop !== true) ||

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
        }
    }

    /**
     * Attempts to add a weapon into the first free slot in this inventory which matches this item type.
     * This method does not throw if it cannot add the item.
     * @param item The item to add
     * @returns The slot in which the item was added, or `-1` if it could not be added
     */
    appendWeapon(item: ReifiableItem): number {
        item = this._reifyItem(item);

        const maxWeapons = GameConstants.player.maxWeapons;
        const itemType = item.definition.itemType;

        for (let slot = 0; slot < maxWeapons; slot++) {
            if (
                this.weapons[slot] === undefined &&
                GameConstants.player.inventorySlotTypings[slot] === itemType
            ) {
                this._setWeapon(slot, item);
                return slot;
            }
        }

        return -1;
    }

    private _dropItem(toDrop: ReifiableDef<LootDefinition>, options?: { readonly position?: Vector, readonly count?: number, readonly pushForce?: number }): void {
        this.owner.game
            .addLoot(toDrop, options?.position ?? this.owner.position, options?.count ?? 1)
            .push(this.owner.rotation, options?.pushForce ?? -0.03);
    }

    removeThrowable(type: ReifiableDef<ThrowableDefinition>, drop = true, removalCount?: number): void {
        const definition = Loots.reify(type);

        if (!this.items.hasItem(definition.idString)) return;

        const itemAmount = this.items.getItem(definition.idString);
        const removalAmount = Math.min(itemAmount, removalCount ?? Math.ceil(itemAmount / 2));

        if (drop) {
            this._dropItem(definition, { count: removalAmount });
        }
        this.items.decrementItem(definition.idString, removalAmount);

        if (itemAmount === removalAmount) { // Everything's been dropped, we need to a) discard the ThrowableItem instance b) equip a new one, if any
            this.throwableItemMap.delete(definition.idString);

            // now we gotta find a new throwable to equip
            let found = false;
            for (const def of Throwables) {
                if (this.items.getItem(def.idString) > 0) {
                    found = true;
                    this.useItem(def);
                    break;
                }
            }

            if (!found) {
                // welp, time to swap to another slot
                this.weapons[this.slotsByItemType[ItemType.Throwable]![0]] = undefined;
                this.setActiveWeaponIndex(this._findNextPopulatedSlot());
            }
        } else {
            this.throwableItemMap.get(definition.idString)!.count -= removalAmount;
        }

        this.owner.dirty.throwable = true;
    }

    /**
     * Drops a weapon from this inventory
     * @param slot The slot to drop
     * @param pushForce The velocity to push the loot, defaults to -0.03
     * @returns The item that was dropped, if any
     */
    dropWeapon(slot: number, pushForce = -0.03): InventoryItem | undefined {
        const item = this.weapons[slot];

        if (item === undefined || item.definition.noDrop) return undefined;
        const definition = item.definition;

        if (GameConstants.player.inventorySlotTypings[slot] === ItemType.Throwable) {
            this.removeThrowable(definition as ThrowableDefinition, true);
        } else {
            if (item instanceof GunItem && (definition as DualGunNarrowing).isDual) {
                this._dropItem((definition as DualGunNarrowing).singleVariant, { pushForce });
                this._dropItem((definition as DualGunNarrowing).singleVariant, { pushForce });
            } else {
                this._dropItem(definition, { pushForce });
            }

            this._setWeapon(slot, undefined);

            if (item instanceof GunItem && item.ammo > 0) {
                // Put the ammo in the gun back in the inventory
                const ammoType = (definition as GunDefinition).ammoType;
                this.items.incrementItem(ammoType, item.ammo);

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
                    : this.items.getItem(ammoType) - (this.backpack?.maxCapacity[ammoType] ?? 0);

                if (overAmount > 0) {
                    this.items.decrementItem(ammoType, overAmount);

                    this._dropItem(ammoType, { count: overAmount, pushForce });
                }
            }
        }

        this.owner.setDirty();
        this.owner.dirty.items = true;
        this.owner.dirty.weapons = true;

        return item;
    }

    /**
     * Attempts to drop a item with given `idString`
     * @param itemString The `idString` of the item;
     */
    dropItem(itemString: ReifiableDef<LootDefinition>, pushForce = -0.03): void {
        const definition = Loots.reify(itemString);
        const { idString } = definition;

        if (
            (
                !this.items.hasItem(idString) &&
                definition.itemType !== ItemType.Armor &&
                definition.itemType !== ItemType.Backpack
            ) ||
            definition.noDrop
        ) return;

        switch (definition.itemType) {
            case ItemType.Healing:
            case ItemType.Ammo: {
                const itemAmount = this.items.getItem(idString);
                const removalAmount = Math.min(itemAmount, Math.ceil(itemAmount / 2));

                this._dropItem(definition, { pushForce, count: removalAmount });
                this.items.decrementItem(idString, removalAmount);
                break;
            }
            case ItemType.Scope: {
                this._dropItem(definition, { pushForce });
                this.items.setItem(idString, 0);

                if (this.scope.idString !== idString) break;

                // Switch to next highest scope
                for (let i = Scopes.definitions.length - 1; i >= 0; i--) {
                    const scope = Scopes.definitions[i];
                    if (this.items.hasItem(scope.idString)) {
                        this.scope = this.owner.effectiveScope = scope;
                        break;
                    }
                }
                break;
            }
            case ItemType.Throwable: {
                this.removeThrowable(definition, true);
                break;
            }
            case ItemType.Armor: {
                switch (definition.armorType) {
                    case ArmorType.Helmet: {
                        if (!this.helmet) return;
                        this.helmet = undefined;
                        break;
                    }
                    case ArmorType.Vest: {
                        if (!this.vest) return;
                        this.vest = undefined;
                        break;
                    }
                }
                this._dropItem(definition, { pushForce });
                break;
            }
            case ItemType.Backpack: {
                return;
            }
        }

        this.owner.setDirty();
        this.owner.dirty.items = true;
    }

    /**
     * Drops all weapons from this inventory
     */
    dropWeapons(): void {
        const weaponLength = this.weapons.length;
        for (let i = 0; i < weaponLength; i++) {
            this.dropWeapon(i);
        }
    }

    /**
     * Checks if the inventory has the given weapon
     * @param item The item's `idString`
     * @returns Whether the item exists on the inventory
     */
    checkIfWeaponExists(item: ReferenceTo<WeaponDefinition>): boolean {
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

    upgradeToDual(slot: number): boolean {
        if (!Inventory.isValidWeaponSlot(slot)) throw new RangeError(`Attempted to upgrade to dual weapon in invalid slot '${slot}'`);
        if (!this.hasWeapon(slot) || !(this.weapons[slot] instanceof GunItem)) return false;

        const gun = this.weapons[slot] as GunItem;
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (gun.definition.isDual || gun.definition.dualVariant === undefined) return false;

        const dualGun = this._reifyItem(gun.definition.dualVariant) as GunItem;
        this._setWeapon(slot, dualGun);
        dualGun.ammo = gun.ammo;

        return true;
    }

    private _findNextPopulatedSlot(): number {
        let target = this._activeWeaponIndex;
        while (!this.hasWeapon(target)) {
            target = Numeric.absMod(target + 1, this.weapons.length);
        }
        return target;
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

        const itemType = item?.definition.itemType;
        const permittedType = GameConstants.player.inventorySlotTypings[slot];
        if (item !== undefined && permittedType !== itemType) {
            throw new Error(`Tried to put an item of type '${ItemType[itemType!]}' in slot ${slot} (configured to only accept items of type '${ItemType[permittedType]}')`);
        }

        this.weapons[slot] = item;
        this.owner.dirty.weapons = true;
        const removal = item === undefined;

        if (removal) {
            if (slot === 2) {
                this.weapons[slot] = new MeleeItem("fists", this.owner);
            } else if (slot === this._activeWeaponIndex) {
                this.setActiveWeaponIndex(this._findNextPopulatedSlot());
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
            target = Numeric.absMod(target - 1, this.weapons.length);
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
    useItem(itemString: ReifiableDef<HealingItemDefinition | ScopeDefinition | ThrowableDefinition | ArmorDefinition | AmmoDefinition | BackpackDefinition | AmmoDefinition>): void {
        const definition = Loots.reify(itemString);
        const idString = definition.idString;

        if (!this.items.hasItem(idString) || this.owner.downed) return;

        switch (definition.itemType) {
            case ItemType.Healing: {
                if (
                    // Already consuming something else
                    this.owner.action instanceof HealingAction ||
                    (
                        definition.healType === HealType.Health &&
                        this.owner.health >= this.owner.maxHealth
                    ) || (
                        definition.healType === HealType.Adrenaline &&
                        this.owner.adrenaline >= this.owner.maxAdrenaline
                    )
                ) return;

                this.owner.executeAction(new HealingAction(this.owner, idString));
                break;
            }
            case ItemType.Scope: {
                this.scope = idString;
                break;
            }
            case ItemType.Throwable: {
                this.throwable = idString;
                this.owner.setDirty();
                this.owner.dirty.weapons = true;
                const slot = this.slotsByItemType[ItemType.Throwable]?.[0];
                // Let's hope there's only one throwable slot…

                if (slot !== undefined) {
                    const old = this.weapons[slot];
                    if (old) {
                        old.isActive = false;
                        old.stopUse();
                    }

                    const item = this.throwableItemMap.getAndSetIfAbsent(
                        idString,
                        () => new ThrowableItem(definition, this.owner, this.items.getItem(idString))
                    );
                    item.isActive = true;
                    this.weapons[slot] = item;
                }
            }
        }
    }
}

export class ItemCollection<ItemDef extends LootDefinition> {
    private readonly _internal: Map<ReferenceTo<ItemDef>, number>;

    // private readonly _listenerSet = new Set<(key: ReferenceTo<ItemDef>, oldValue: number, newValue: number) => void>();

    constructor(entries?: ReadonlyArray<[ReferenceTo<ItemDef>, number]>) {
        this._internal = new Map<ReferenceTo<ItemDef>, number>(entries);
    }

    private _recordCache?: Record<ReferenceTo<ItemDef>, number>;

    asRecord(): Record<ReferenceTo<ItemDef>, number> {
        // eslint-disable-next-line no-return-assign
        return this._recordCache ??= [...this._internal.entries()]
            .reduce(
                (acc, [item, count]) => {
                    acc[item] = count;
                    return acc;
                },
                // can someone remove the "prefer-reduce-type-parameter" one ffs
                // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter, @typescript-eslint/consistent-type-assertions
                {} as Record<ReferenceTo<ItemDef>, number>
            );
    }

    getItem(key: ReferenceTo<ItemDef>): number {
        return this._internal.get(key)!;
    }

    hasItem(key: ReferenceTo<ItemDef>): boolean {
        return this.getItem(key) > 0;
    }

    setItem(key: ReferenceTo<ItemDef>, amount: number): void {
        const old = this.getItem(key);

        this._internal.set(key, amount);

        if (amount !== old) {
            this._recordCache = undefined;
            // this._listenerSet.forEach(fn => fn(key, old, amount));
        }
    }

    incrementItem(key: ReferenceTo<ItemDef>, amount = 1): void {
        this.setItem(key, this.getItem(key) + amount);
    }

    decrementItem(key: ReferenceTo<ItemDef>, amount = 1): void {
        this.setItem(key, Math.max(this.getItem(key) - amount, 0));
    }

    // addChangeListener(listener: (key: ReferenceTo<ItemDef>, oldValue: number, newValue: number) => void): void {
    //     this._listenerSet.add(listener);
    // }

    // removeChangeListener(listener: (key: ReferenceTo<ItemDef>, oldValue: number, newValue: number) => void): void {
    //     this._listenerSet.delete(listener);
    // }
}
