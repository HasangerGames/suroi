import { ObjectCategory } from "../../../common/src/constants";
import { Loots } from "../../../common/src/definitions/loots";
import { type ReferenceTo, type ItemDefinition, type ItemType, type WearerAttributes, reifyDefinition } from "../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../common/src/utils/objectType";
import { type Player } from "../objects/player";

/**
 * Represents some item in the player's inventory *that can be equipped*
 * @abstract
 */
export abstract class InventoryItem<Def extends ItemDefinition = ItemDefinition> {
    /**
     * The category of item this is, either melee or gun
     */
    readonly category: ItemType;
    /**
     * The `ObjectType` instance associated with this item
     */
    readonly definition: Def;
    /**
     * The player this item belongs to
     */
    readonly owner: Player;
    createObjectType(): ObjectType<ObjectCategory.Loot, Def> {
        return ObjectType.fromString(ObjectCategory.Loot, this.definition.idString);
    }

    readonly _modifiers = {
        // Multiplicative
        maxHealth: 1,
        maxAdrenaline: 1,
        baseSpeed: 1,

        // Additive
        minAdrenaline: 0
    };

    private _isActive = false;

    get isActive(): boolean { return this._isActive; }
    set isActive(isActive: boolean) {
        this._isActive = isActive;
        this.refreshModifiers();
    }

    private readonly _stats = (() => {
        let kills = 0;
        let damage = 0;

        /*
            "Assigning a variable to this instead of properly using arrow lambdas
            may be a symptom of pre-ES6 practices or not managing scope well."

            Object literals are a thing btw
        */
        // eslint-disable-next-line @typescript-eslint/no-this-alias
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
    // shut the up
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/lines-between-class-members
    get stats() { return this._stats; }

    _lastUse = 0;
    get lastUse(): number { return this._lastUse; }

    _switchDate = 0;

    /**
     * Creates a new `InventoryItem` given a string and a player
     * @param definition The definition of an item in the item schema
     * that will be represented by this instance
     * @param owner The `Player` this item belongs to
     */
    protected constructor(definition: ReferenceTo<Def>, owner: Player) {
        this.category = (this.definition = reifyDefinition<ItemDefinition, Def>(definition, Loots)).itemType;
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

    refreshModifiers(): void {
        const definition = this.definition;
        if (!definition.wearerAttributes) return;

        const { active, passive, on } = definition.wearerAttributes;
        const newModifiers: this["_modifiers"] = {
            maxHealth: 1,
            maxAdrenaline: 1,
            baseSpeed: 1,
            minAdrenaline: 0
        };
        const applyModifiers = (modifiers: WearerAttributes): void => {
            newModifiers.maxHealth *= modifiers.maxHealth ?? 1;
            newModifiers.maxAdrenaline *= modifiers.maxAdrenaline ?? 1;
            newModifiers.baseSpeed *= modifiers.speedBoost ?? 1;
            newModifiers.minAdrenaline += modifiers.minAdrenaline ?? 0;
        };

        if (passive) applyModifiers(passive);
        if (active && this.isActive) applyModifiers(active);

        if (on) {
            const { damageDealt, kill } = on;

            if (kill) {
                for (const entry of kill ?? []) {
                    for (let i = 0, limit = Math.min(this._stats.kills, entry.limit ?? Infinity); i < limit; i++) {
                        applyModifiers(entry);
                    }
                }
            }

            if (damageDealt) {
                for (const entry of damageDealt ?? []) {
                    for (let i = 0, limit = Math.min(this._stats.damage, entry.limit ?? Infinity); i < limit; i++) {
                        applyModifiers(entry);
                    }
                }
            }

            this._modifiers.maxHealth = newModifiers.maxHealth;
            this._modifiers.maxAdrenaline = newModifiers.maxAdrenaline;
            this._modifiers.minAdrenaline = newModifiers.minAdrenaline;
            this._modifiers.baseSpeed = newModifiers.baseSpeed;
            this.owner.updateAndApplyModifiers();
        }
    }
}
