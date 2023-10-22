/**
 * A class representing the definitions for some object type
 * @template T The specific type of `ObjectDefinition` this class holds
 */
export class ObjectDefinitions<T extends ObjectDefinition = ObjectDefinition> {
    readonly bitCount: number;
    readonly definitions: T[] = [];
    readonly idStringToNumber: Record<string, number> = {};

    constructor(definitions: T[]) {
        this.bitCount = Math.ceil(Math.log2(definitions.length));

        for (let i = 0, l = definitions.length; i < l; i++) {
            this.idStringToNumber[(this.definitions[i] = definitions[i]).idString] = i;
        }
    }

    getByIDString<U extends T = T>(id: ReferenceTo<T>): U {
        return this.definitions[this.idStringToNumber[id]] as U;
    }
}

export interface ObjectDefinition {
    readonly idString: string
    readonly name: string
}

/**
 * Semantically equivalent to `string`, this type is more to convey an intent
 */
export type ReferenceTo<T extends ObjectDefinition = ObjectDefinition> = T["idString"];

export function reifyDefinition<T extends ObjectDefinition, U extends T = T>(definition: U | ReferenceTo<U>, collection: ObjectDefinitions<T> | T[]): U {
    if (typeof definition !== "string") return definition;
    else if (Array.isArray(collection)) return collection.find(def => def.idString === definition) as U;
    else return collection.getByIDString<U>(definition);
    /*switch (true) {
        case typeof definition !== "string": return definition;
        case Array.isArray(collection): return collection.find(def => def.idString === definition) as U;
        default: return collection.getByIDString<U>(definition);
    }*/
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

export enum ObstacleSpecialRoles {
    Door,
    Wall,
    Window,
    Activatable
}

export const LootRadius: Record<ItemType, number> = {
    [ItemType.Gun]: 3.4,
    [ItemType.Ammo]: 2,
    [ItemType.Melee]: 3,
    [ItemType.Healing]: 2.5,
    [ItemType.Armor]: 3,
    [ItemType.Backpack]: 3,
    [ItemType.Scope]: 3,
    [ItemType.Skin]: 3
};

export interface BulletDefinition {
    readonly damage: number
    readonly obstacleMultiplier: number
    readonly speed: number
    readonly maxDistance: number
    readonly penetration?: {
        readonly players?: boolean
        readonly obstacles?: boolean
    }
    readonly tracerOpacity?: number
    readonly tracerWidth?: number
    readonly tracerLength?: number
    readonly tracerColor?: number
    readonly tracerImage?: string
    readonly variance?: number
    readonly shrapnel?: boolean
    readonly onHitExplosion?: string
    readonly clipDistance?: boolean
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
            readonly kill?: Array<{
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
            } & WearerAttributes>
            /**
             * These attributs are applied whenever the player deals damage
             */
            readonly damageDealt?: Array<{
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
            } & WearerAttributes>
        }
    }
}
