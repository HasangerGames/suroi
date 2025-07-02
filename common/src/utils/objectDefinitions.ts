import { ModeName } from "../definitions/modes";
import { type ByteStream } from "./byteStream";
import { ReadonlyRecord } from "./misc";
import { type Vector } from "./vector";

/**
 * A class representing a list of definitions
 * @template Def The specific type of `ObjectDefinition` this class holds
 */
export class ObjectDefinitions<Def extends ObjectDefinition = ObjectDefinition> {
    readonly definitions: readonly Def[];
    readonly idStringToDef = Object.create(null) as ReadonlyRecord<string, Def>;
    readonly idStringToNumber = Object.create(null) as ReadonlyRecord<string, number>;

    /**
     * Whether there are more than 256 definitions in this schema, requiring 2 bytes to serialize
     */
    readonly overLength: boolean;

    constructor(definitions: readonly Def[]) {
        this.definitions = definitions;

        let idx = 0;
        for (const def of definitions) {
            const idString = def.idString;
            if (idString in this.idStringToDef) {
                throw new Error(`Duplicate idString '${idString}' in schema`);
            }

            // casting here is necessary to modify the readonly defs
            (this.idStringToDef as Record<string, Def>)[idString] = def;
            (this.idStringToNumber as Record<string, number>)[idString] = idx++;
        }
        this.overLength = idx > 255;
    }

    reify<U extends Def = Def>(type: ReifiableDef<Def>): U {
        return typeof type === "string"
            ? this.fromString<U>(type)
            : type as U;
    }

    fromString<Spec extends Def = Def>(idString: ReferenceTo<Spec>): Spec {
        const def = this.fromStringSafe(idString);
        if (def === undefined) {
            throw new ReferenceError(`Unknown idString '${idString}' for this schema`);
        }
        return def;
    }

    fromStringSafe<Spec extends Def = Def>(idString: ReferenceTo<Spec>): Spec | undefined {
        return this.idStringToDef[idString] as Spec | undefined;
    }

    hasString(idString: string): boolean {
        return idString in this.idStringToDef;
    }

    writeToStream(stream: ByteStream, def: ReifiableDef<Def>): void {
        const idString = typeof def === "string" ? def : def.idString;
        if (!this.hasString(idString)) {
            throw new Error(`Unknown idString '${idString}' for this schema`);
        }
        const idx = this.idStringToNumber[idString];
        if (this.overLength) {
            stream.writeUint16(idx);
        } else {
            stream.writeUint8(idx);
        }
    }

    readFromStream<Spec extends Def>(stream: ByteStream): Spec {
        const idx = this.overLength ? stream.readUint16() : stream.readUint8();
        const def = this.definitions[idx];
        if (def === undefined) {
            throw new RangeError(`Bad index ${idx} in schema`);
        }
        if (!this.hasString(def.idString)) {
            throw new Error(`Unknown idString '${def.idString}' for this schema`);
        }
        return def as Spec;
    }

    [Symbol.iterator](): Iterator<Def> {
        return this.definitions[Symbol.iterator]();
    }
}

export enum DefinitionType {
    Ammo,
    Armor,
    Backpack,
    Badge,
    Building,
    Bullet,
    Decal,
    Emote,
    Explosion,
    Gun,
    HealingItem,
    MapPing,
    Melee,
    Obstacle,
    Perk,
    Scope,
    Skin,
    SyncedParticle,
    Throwable
}

export interface ObjectDefinition {
    readonly idString: string
    readonly name: string
    readonly defType: DefinitionType
}

/**
 * Used to communicate that no idString matches or is applicable, can be used as a key and value
 */
export const NullString = Symbol("null idString");

/**
 * Semantically equivalent to `string`, this type is more to convey an intent
 */
export type ReferenceTo<T extends ObjectDefinition> = T["idString"];

export type ReferenceOrNull<T extends ObjectDefinition> = ReferenceTo<T> | typeof NullString;

/**
 * Either a normal reference or an object whose keys are random options and whose values are corresponding weights
 */
export type ReferenceOrRandom<T extends ObjectDefinition> = Partial<Record<ReferenceOrNull<T>, number>> | ReferenceTo<T>;

/**
 * Either a definition or an idString referencing a definition
 */
export type ReifiableDef<T extends ObjectDefinition> = ReferenceTo<T> | T;

export interface ItemDefinition extends ObjectDefinition {
    readonly noDrop?: boolean
    readonly noSwap?: boolean
    readonly devItem?: boolean
    readonly reskins?: ModeName[]
}

export interface InventoryItemDefinition extends ItemDefinition {
    readonly fists?: {
        readonly left: Vector
        readonly right: Vector
    }
    readonly killfeedFrame?: string
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
        readonly on?: Partial<EventModifiers>
    }
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
    /**
     * A number by which the player's size will be multiplied
     */
    readonly sizeMod?: number
    /**
     * A number by which the default adrenaline drain will be multiplied
     */
    readonly adrenDrain?: number
    /**
     * A number that will be added to the player's default health regen
     */
    readonly hpRegen?: number
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

export interface EventModifiers {
    /**
     * A set of attributes to applied whenever the player gets a kill
     */
    readonly kill: readonly ExtendedWearerAttributes[]
    /**
     * A set of attributes to applied whenever the player deals damage
     */
    readonly damageDealt: readonly ExtendedWearerAttributes[]
}
