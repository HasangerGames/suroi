import { type ExplosionDefinition } from "../definitions/explosions";
import { type SuroiBitStream } from "./suroiBitStream";
import { type Vector } from "./vector";

/**
 * A class representing a list of definitions
 * @template T The specific type of `ObjectDefinition` this class holds
 */
export class ObjectDefinitions<T extends ObjectDefinition = ObjectDefinition> {
    readonly bitCount: number;
    readonly definitions: T[];
    readonly idStringToNumber: Record<string, number> = {};

    constructor(definitions: T[]) {
        this.bitCount = Math.ceil(Math.log2(definitions.length));

        this.definitions = definitions;

        for (let i = 0, defLength = definitions.length; i < defLength; i++) {
            const idString = definitions[i].idString;
            if (this.idStringToNumber[idString] !== undefined) {
                throw new Error(`Duplicated idString: ${idString}`);
            }
            this.idStringToNumber[idString] = i;
        }
    }

    reify<U extends T = T>(type: ReifiableDef<T>): U {
        return typeof type === "string"
            ? this.fromString<U>(type)
            : type as U;
    }

    fromString<U extends T = T>(idString: ReferenceTo<U>): U {
        const id = this.idStringToNumber[idString];
        if (id === undefined) throw new Error(`Unknown idString: ${idString}`);
        return this.definitions[id] as U;
    }

    writeToStream(stream: SuroiBitStream, type: ReifiableDef<T>): void {
        stream.writeBits(
            this.idStringToNumber[
                typeof type === "string" ? type : type.idString
            ],
            this.bitCount
        );
    }

    readFromStream<U extends T = T>(stream: SuroiBitStream): U {
        const id = stream.readBits(this.bitCount);
        if (id >= this.definitions.length) {
            console.warn(`ID out of range: ${id} (max: ${this.definitions.length - 1})`);
        }

        return this.definitions[id] as U;
    }

    [Symbol.iterator](): Iterator<T> {
        return this.definitions[Symbol.iterator]();
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

export type ReifiableDef<T extends ObjectDefinition> = ReferenceTo<T> | T;

// expand this as needed
export enum ItemType {
    Gun,
    Ammo,
    Melee,
    Throwable,
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

export enum MapObjectSpawnMode {
    Grass,
    /**
     * Grass, beach and river banks.
     */
    GrassAndSand,
    RiverBank,
    River,
    Beach
}

export const LootRadius: Record<ItemType, number> = {
    [ItemType.Gun]: 3.4,
    [ItemType.Ammo]: 2,
    [ItemType.Melee]: 3,
    [ItemType.Throwable]: 3,
    [ItemType.Healing]: 2.5,
    [ItemType.Armor]: 3,
    [ItemType.Backpack]: 3,
    [ItemType.Scope]: 3,
    [ItemType.Skin]: 3
};

export interface BaseBulletDefinition {
    readonly damage: number
    readonly obstacleMultiplier: number
    readonly speed: number
    readonly range: number
    readonly penetration?: {
        readonly players?: boolean
        readonly obstacles?: boolean
    }

    readonly tracer?: {
        readonly opacity?: number
        readonly width?: number
        readonly length?: number
        readonly color?: number
        readonly image?: string
        // used by the radio bullet
        // this will make it scale and fade in and out
        readonly particle?: boolean
        readonly zIndex?: number
    }

    readonly rangeVariance?: number
    readonly shrapnel?: boolean
    readonly onHitExplosion?: ReferenceTo<ExplosionDefinition>
    readonly allowRangeOverride?: boolean
    readonly lastShotFX?: boolean
    readonly noCollision?: boolean
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
}

export interface InventoryItemDefinition extends ItemDefinition {
    readonly fists?: {
        readonly left: Vector
        readonly right: Vector
    }
    readonly killstreak?: boolean
    readonly speedMultiplier: number
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
