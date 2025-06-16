import { GameConstants } from "@common/constants";
import { Loots, type LootDefForType, type LootDefinition, type WeaponTypes } from "@common/definitions/loots";
import { Numeric } from "@common/utils/math";
import type { AbstractConstructor, Constructor, PredicateFor } from "@common/utils/misc";
import { ItemType, type ReifiableDef, type WearerAttributes } from "@common/utils/objectDefinitions";
import { type ItemData } from "../objects/loot";
import { type Player } from "../objects/player";
import type { InventoryItem, WeaponItemTypeMap } from "./inventory";

type PredicateForItem<Type extends WeaponTypes> = {
    readonly category: Type
    readonly definition: LootDefForType<Type>
} & PredicateFor<WeaponItemTypeMap, Type>;

type LoosePredicateFor<Type extends WeaponTypes = WeaponTypes> = {
    readonly category: Type
    readonly definition: LootDefForType<Type>
} & {
    // if Type === WeaponTypes, then they should all be boolean | undefined; if not, narrow as appropriate
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    readonly [K in (keyof WeaponItemTypeMap & string) as `is${K}`]: WeaponTypes extends Type
        ? boolean | undefined
        : WeaponItemTypeMap[K] extends Type
            ? true
            : false | undefined
};

/**
 * Represents some item in the player's inventory *that can be equipped*
 * @abstract
 */
export abstract class InventoryItemBase<Type extends WeaponTypes = WeaponTypes> extends (() => {
    type RealType<Type extends WeaponTypes = WeaponTypes> = typeof InventoryItemBase<Type> & AbstractConstructor<LoosePredicateFor<Type>>;

    abstract class InventoryItemBase<Type extends WeaponTypes = WeaponTypes> {
        /**
         * The category of item this is, either melee, gun or throwable
         */
        abstract readonly category: Type;
        /**
         * The `WeaponDefinition` instance associated with this item
         */
        abstract readonly definition: LootDefForType<Type>;
        /**
         * The player this item belongs to
         */
        readonly owner: Player;

        private readonly _modifiers = GameConstants.player.defaultModifiers();

        /**
         * Returns a clone
         */
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        get modifiers() { return { ...this._modifiers }; }

        private _isActive = false;

        get isActive(): boolean { return this._isActive; }
        set isActive(isActive: boolean) {
            if (this._isActive !== isActive) {
                this.owner.game.pluginManager.emit(
                    isActive
                        ? "inv_item_equip"
                        : "inv_item_unequip",
                    this as unknown as InventoryItem
                );
            }

            this._isActive = isActive;
            this.refreshModifiers();
        }

        private readonly _stats = (() => {
            let kills = 0;
            let damage = 0;

            const T = this;

            return {
                get kills() { return kills; },
                set kills(_kills: number) {
                    kills = _kills;
                    T.owner.dirty.weapons = true;
                    T.refreshModifiers();
                },

                get damage() { return damage; },
                set damage(_damage: number) {
                    damage = _damage;
                    T.owner.dirty.weapons = true;
                    T.refreshModifiers();
                }
            };
        })();

        /**
         * Returns referentially equal to internal
         */
        // shut the up
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        get stats() { return this._stats; }

        lastUse = 0;

        switchDate = 0;

        private static readonly _subclasses: { [K in WeaponTypes]?: Constructor<InventoryItemBase<K> & PredicateForItem<K>> } = {};

        static derive<
            This extends AbstractConstructor,
            Type extends WeaponTypes = WeaponTypes
        >(this: This, itemType: Type): new (...args: ConstructorParameters<This>) => InstanceType<This> & PredicateForItem<Type> {
            if (itemType in InventoryItemBase._subclasses) {
                throw new Error(`Subclass for category '${ItemType[itemType]}' already registered`);
            }

            // @ts-expect-error i don't know
            return InventoryItemBase._subclasses[itemType] = class extends (this as RealType<Type>) {
                override readonly category = itemType;
                override readonly definition: LootDefForType<Type>;

                constructor(...args: [definition: ReifiableDef<LootDefForType<Type>>, owner: Player, ...ConstructorParameters<This>]) {
                    // @ts-expect-error this has type This (no way)
                    super(...args);

                    this.definition = Loots.reify(args[0]);

                    if (this.definition.itemType !== itemType) {
                        throw new TypeError(
                            `Attempted to create a '${new.target.name}' object based on a definition with a mismatching item type (expected '${ItemType[itemType]}', got '${ItemType[this.definition.itemType]}')`
                        );
                    }

                    // @ts-expect-error it's easier this way lol
                    this[`is${ItemType[itemType]}`] = true;
                }
            };
        }

        /**
         * Creates a new `InventoryItem` given a string and a player
         * @param definition The definition of an item in the item schema
         * that will be represented by this instance
         * @param owner The `Player` this item belongs to
         */
        constructor(definition: ReifiableDef<LootDefinition>, owner: Player) {
            if (
                !Object.values(InventoryItemBase._subclasses).some(cls => new.target.prototype instanceof cls)
            ) {
                throw new Error(`Illegal subclass of BaseGameObject '${new.target.name}'; subclasses must be obtained by calling BaseGameObject.derive, or must be a subclass thereof`);
            }

            this.owner = owner;
        }

        /**
         * A method which will be called whenever the player owning this item attempts to use the item.
         *
         * It is this method's responsibility to ensure that the player is in a position to use the item, as well
         * as take care of any side-effects such usage may entail (spawning objects, modifying state, etc). It is
         * also this method's responsibility to take care of any scheduling of events, such as scheduling reloads,
         * refire (ex. automatic weapons) or attempts to fire (input buffering)
         * @abstract
         */
        abstract useItem(): void;

        /**
         * Generates the item data for this item
         */
        abstract itemData(): ItemData<LootDefForType<Type>>;

        /**
         * A method which *does nothing*, but that can be overridden by subclasses if desired. This method is called
         * whenever the player stops attacking while having this weapon equipped _or_ when the user starts attacking
         * with a weapon and switches off of it. In the latter case, this method will always be called _after_ the switch
         * has been done (so `this.owner.activeItem !== this` and `this.isActive === false`). Subclasses can use these facts
         * to differentiate the two cases.
         *
         * It is usually the case that subclasses overriding this method are interested in the cases where a player starts
         * attacking with this item and then stops attacking; for example, a throwable would show the cooking animation and start
         * the fuse in the `useItem` method and would then launch the projectile in this one. Properly managing and sharing state
         * between these two methods is thus quite important. As with the `useItem` method, subclasses' overrides are fully responsible
         * for taking care of any side-effects such as spawning objects and modifying state.
         */
        stopUse(): void { /* see doc comment */ }

        refreshModifiers(): void {
            const wearerAttributes = this.definition.wearerAttributes;
            if (!wearerAttributes) return;

            const { active, passive, on } = wearerAttributes;
            const newModifiers = GameConstants.player.defaultModifiers();

            const applyModifiers = (modifiers: WearerAttributes): void => {
                newModifiers.maxHealth *= modifiers.maxHealth ?? 1;
                newModifiers.maxAdrenaline *= modifiers.maxAdrenaline ?? 1;
                newModifiers.baseSpeed *= modifiers.speedBoost ?? 1;
                newModifiers.size *= modifiers.sizeMod ?? 1;
                newModifiers.adrenDrain *= modifiers.adrenDrain ?? 1;

                newModifiers.minAdrenaline += modifiers.minAdrenaline ?? 0;
                newModifiers.hpRegen += modifiers.hpRegen ?? 0;
            };

            if (passive) applyModifiers(passive);
            if (active && this._isActive) applyModifiers(active);

            if (on) {
                const { damageDealt, kill } = on;
                for (
                    const { modifiers, count } of [
                        { modifiers: damageDealt, count: this._stats.damage },
                        { modifiers: kill, count: this._stats.kills }
                    ]
                ) {
                    for (const entry of modifiers ?? []) {
                        for (
                            let i = 0, limit = Numeric.min(count, entry.limit ?? Infinity);
                            i < limit;
                            i++
                        ) applyModifiers(entry);
                    }
                }
            }

            const diff = {
                maxHealth: this._modifiers.maxHealth !== newModifiers.maxHealth,
                maxAdrenaline: this._modifiers.maxAdrenaline !== newModifiers.maxAdrenaline,
                minAdrenaline: this._modifiers.minAdrenaline !== newModifiers.minAdrenaline,
                size: this._modifiers.size !== newModifiers.size,
                adrenDrain: this._modifiers.adrenDrain !== newModifiers.adrenDrain,

                baseSpeed: this._modifiers.baseSpeed !== newModifiers.baseSpeed,
                hpRegen: this._modifiers.hpRegen !== newModifiers.hpRegen
            };

            if (Object.values(diff).some(v => v)) {
                const old = this.modifiers;

                this._modifiers.maxHealth = newModifiers.maxHealth;
                this._modifiers.maxAdrenaline = newModifiers.maxAdrenaline;
                this._modifiers.minAdrenaline = newModifiers.minAdrenaline;
                this._modifiers.size = newModifiers.size;
                this._modifiers.adrenDrain = newModifiers.adrenDrain;

                this._modifiers.baseSpeed = newModifiers.baseSpeed;
                this._modifiers.hpRegen = newModifiers.hpRegen;

                this.owner.game.pluginManager.emit(
                    "inv_item_modifiers_changed",
                    {
                        item: this as unknown as InventoryItem,
                        oldMods: old,
                        newMods: this.modifiers,
                        diff
                    }
                );
            }

            this.owner.updateAndApplyModifiers();
        }

        protected _bufferAttack(cooldown: number, internalCallback: (this: this) => void): void {
            const owner = this.owner;
            if (owner.downed) return;
            const now = owner.game.now;

            const timeToFire = cooldown - (now - this.lastUse);
            const timeToSwitch = owner.effectiveSwitchDelay - (now - this.switchDate);

            if (
                timeToFire <= 0
                && timeToSwitch <= 0
            ) {
                internalCallback.call(this);
            } else {
                const bufferDuration = Numeric.max(timeToFire, timeToSwitch);

                // We only honor buffered inputs shorter than 200ms
                if (bufferDuration >= 200) return;

                owner.bufferedAttack?.kill();
                owner.bufferedAttack = owner.game.addTimeout(
                    () => {
                        if (
                            owner.activeItem === this as unknown as InventoryItem
                            && owner.attacking
                        ) {
                            owner.bufferedAttack?.kill();
                            this.useItem();
                        }
                    },
                    bufferDuration
                );
            }
        }

        /**
         * A method that *does nothing*, but that may be overridden by subclasses to perform any cleanup
         * when this weapon instance is destroyed
         */
        destroy(): void { /* see doc comment */ }
    }

    return InventoryItemBase as RealType;
})() {
    declare readonly category: Type;
    declare readonly definition: LootDefForType<Type>;
}

export abstract class CountableInventoryItem<Type extends WeaponTypes = WeaponTypes> extends InventoryItemBase<Type> {
    abstract count: number;
}
