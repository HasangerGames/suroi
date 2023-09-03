/**
 * A class representing the definitions for some object type
 * @template T The specific type of `ObjectDefinition` this class holds
 */
export class ObjectDefinitions<T extends ObjectDefinition = ObjectDefinition> {
    readonly bitCount: number;
    readonly definitions: T[];
    readonly idStringToNumber: Record<string, number> = {};

    constructor(definitions: T[]) {
        this.bitCount = Math.ceil(Math.log2(definitions.length));
        this.definitions = definitions;

        for (let i = 0; i < definitions.length; i++) {
            this.idStringToNumber[definitions[i].idString] = i;
        }
    }
}

export interface ObjectDefinition {
    readonly idString: string
    readonly name: string
}

// expand this as needed
export enum ItemType {
    Gun,
    Ammo,
    Melee,
    Healing,
    Armor,
    Backpack,
    Scope,
    Skin
}

export interface WearerAttributes {
    /**
     * A number by which the player's maximum health will be multiplied
     */
    readonly maxHealth?: number
    /**
     * A number by which the player's maximum adrenaline will be multiplied
     */
    readonly maxAdrenaline?: number
    /**
     * A number that will be added to the player's minimum adrenaline. As the name implies,
     * this dictates the point at which adrenaline will stop decaying
     */
    readonly minAdrenaline?: number
    /**
     * A number by which the player's base speed will be multiplied
     */
    readonly speedBoost?: number
}

export interface ExtendedWearerAttributes extends WearerAttributes {
    /**
     *The upper limit after which this effect is no longer reapplied
     */
    readonly limit?: number
    /**
     * A fixed amount of HP restored
     */
    readonly healthRestored?: number
    /**
     * A fixed amount of adrenaline restored
     */
    readonly adrenalineRestored?: number
}

export interface ItemDefinition extends ObjectDefinition {
    readonly itemType: ItemType
    readonly noDrop?: boolean
    /**
     * A set of attributes to modify the player this item belongs to
     * All attributes stack, and all of them are removed as soon as
     * the item is dropped
     */
    readonly wearerAttributes?: {
        /**
         * These attributes are applied when the item is in the player's
         * inventory
         */
        readonly passive?: WearerAttributes
        /**
         * These attributes are applied when the item is the active item, and
         * stack on top of the passive ones
         */
        readonly active?: WearerAttributes
        /**
         * These attributes are applied or removed when certain events occur
         */
        readonly on?: {
            /**
             * These attributes are applied whenever the player gets a kill
             */
            readonly kill?: {
                /**
                 * The upper limit after which this effect is no longer reapplied
                 */
                readonly limit?: number
                /**
                 * A fixed amount of HP restored
                 */
                readonly healthRestored?: number
                /**
                 * A fixed amount of adrenaline restored
                 */
                readonly adrenalineRestored?: number
            } & WearerAttributes
            /**
             * These attributs are applied whenever the player deals damage
             */
            readonly damageDealt?: {
                /**
                 * The upper limit after which this effect is no longer reapplied
                 */
                readonly limit?: number
                /**
                 * A fixed amount of HP restored
                 */
                readonly healthRestored?: number
                /**
                 * A fixed amount of adrenaline restored
                 */
                readonly adrenalineRestored?: number
            } & WearerAttributes
        }
    }
}
