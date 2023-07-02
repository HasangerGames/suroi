import { type ItemDefinition, type ItemType } from "../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../common/src/utils/objectType";
import { type Player } from "../objects/player";
import { ObjectCategory } from "../../../common/src/constants";
import { type LootDefinition } from "../../../common/src/definitions/loots";

/**
 * Represents some item in the player's inventory *that can be equipped*
 * @abstract
 */
export abstract class InventoryItem {
    /**
     * The category of item this is, either melee or gun
     */
    readonly category: ItemType;
    /**
     * The `ObjectType` instance associated with this item
     */
    readonly type: ObjectType<ObjectCategory.Loot, LootDefinition>;
    /**
     * The player this item belongs to
     */
    readonly owner: Player;

    _lastUse = 0;
    get lastUse(): number { return this._lastUse; }

    _switchDate = 0;

    /**
     * Creates a new `InventoryItem` given a string and a player
     * @param idString The `idString` of an item in the item schema that will be represented by this instance
     * @param owner The `Player` this item belongs to
     */
    constructor(idString: string, owner: Player) {
        this.type = ObjectType.fromString(ObjectCategory.Loot, idString);
        // todo maybe change the ObjectType class to better infer definition's type so that this cast doesn't need to be done
        this.category = (this.type.definition as ItemDefinition).itemType;
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
