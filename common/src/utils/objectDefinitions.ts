import { Ammos } from "../definitions/ammos";
import { Armors } from "../definitions/armors";
import { Backpacks } from "../definitions/backpacks";
import { Badges } from "../definitions/badges";
import { Buildings } from "../definitions/buildings";
import { Bullets } from "../definitions/bullets";
import { Decals } from "../definitions/decals";
import { Emotes } from "../definitions/emotes";
import { Explosions } from "../definitions/explosions";
import { Guns } from "../definitions/guns";
import { HealingItems } from "../definitions/healingItems";
import { Loots } from "../definitions/loots";
import { MapPings } from "../definitions/mapPings";
import { Melees } from "../definitions/melees";
import { Obstacles } from "../definitions/obstacles";
import { Perks } from "../definitions/perks";
import { Scopes } from "../definitions/scopes";
import { Skins } from "../definitions/skins";
import { SyncedParticles } from "../definitions/syncedParticles";
import { Throwables } from "../definitions/throwables";
import { type ByteStream } from "./byteStream";
import { type Vector } from "./vector";

export interface ObjectDefinition {
    readonly idString: string
    readonly name: string
}

/**
 * Used to communicate that no idString matches or is applicable, can be used as a key and value
 */
export const NullString = Symbol("null idString");

/**
 * Semantically equivalent to `string`, this type is more to convey an intent
 */
export type ReferenceTo<T extends ObjectDefinition> = T["idString"];

/**
 * Either a normal reference or an object whose keys are random options and whose values are corresponding weights
 */
export type ReferenceOrRandom<T extends ObjectDefinition> = Partial<Record<ReferenceTo<T> | typeof NullString, number>> | ReferenceTo<T>;

export type ReifiableDef<T extends ObjectDefinition> = ReferenceTo<T> | T;

/**
 * A class representing a list of definitions
 * @template Def The specific type of `ObjectDefinition` this class holds
 */
export class ObjectDefinitions<Def extends ObjectDefinition = ObjectDefinition> {
    readonly definitions: readonly Def[];
    readonly idStringToDef: Readonly<Record<string, Def>>;

    constructor(definitions: readonly Def[]) {
        this.definitions = definitions;

        this.idStringToDef = definitions.reduce((idStringToDef, def) => {
            idStringToDef[def.idString] = def;
            return idStringToDef;
        }, {} as Record<string, Def>);
    }

    reify<U extends Def = Def>(type: ReifiableDef<Def>): U {
        return typeof type === "string"
            ? this.fromString<U>(type)
            : type as U;
    }

    fromString<Spec extends Def = Def>(idString: ReferenceTo<Spec>): Spec {
        const def = this.idStringToDef[idString] as Spec | undefined;
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

    /**
     * Convenience method for clarity purposes—proxy for {@link GlobalRegistrar.writeToStream}
     */
    writeToStream<S extends ByteStream>(stream: S, def: ReifiableDef<Def>): S {
        const idString = typeof def === "string" ? def : def.idString;
        if (!this.hasString(idString)) {
            throw new Error(`Definition with idString '${idString}' does not belong to this schema`);
        }
        return GlobalRegistrar.writeToStream(stream, def);
    }

    /**
     * Convenience method for clarity purposes—proxy for {@link GlobalRegistrar.readFromStream}
     */
    readFromStream<Specific extends Def = Def>(stream: ByteStream): Specific {
        const obj = GlobalRegistrar.readFromStream<Specific>(stream);
        if (!(obj?.idString in this.idStringToDef)) {
            throw new Error(`Definition with idString '${obj?.idString}' does not belong to this schema`);
        }
        return obj;
    }

    [Symbol.iterator](): Iterator<Def> {
        return this.definitions[Symbol.iterator]();
    }
}

export class ItemDefinitions<Def extends ItemDefinition = ItemDefinition> extends ObjectDefinitions {
    constructor(itemType: ItemType, definitions: ReadonlyArray<Omit<Def, "itemType">>) {
        super(definitions.map(def => {
            // @ts-expect-error init code
            def.itemType = itemType;
            return def;
        }));
    }
}

/*
    2 bytes = 16 bits = 65536 item schema entries
    that's a lot
    maybe too many

    ObjectCategory is 3 bits
    16 - 3 = 13 bits = 8192 item schema entries

    hmm
    alright, well we could package the object category with the definition
    as a safety measure
    but who says safety says performance penalty
    so…

    there are also other ways of doing safety checks that don't compromise
    the flow of data
*/

const definitions: ObjectDefinition[] = [];
const idStringToNumber = Object.create(null) as Record<string, number>;

export const strictSchemaReads = true;
export const REGISTRY_MAX_SIZE = 1 << 16;

const schemas: ObjectDefinitions[] = [
    Ammos,
    Armors,
    Backpacks,
    Badges,
    Buildings,
    Bullets,
    Decals,
    Emotes,
    Explosions,
    Guns,
    HealingItems,
    Loots,
    MapPings,
    Melees,
    Obstacles,
    Perks,
    Scopes,
    Skins,
    SyncedParticles,
    Throwables
];
const schemaCount = schemas.length;

let totalLength = 0;
for (let i = 0; i < schemaCount; i++) {
    const { definitions: incoming } = schemas[i];
    for (let j = 0, len = incoming.length; j < len; j++) {
        const def = incoming[j];
        const { idString } = def;
        if (idString in idStringToNumber) {
            throw new Error(`Duplicate idString '${idString}' in registry`);
        }

        definitions.push(def);
        idStringToNumber[idString] = totalLength++;
    }
}

if (totalLength > REGISTRY_MAX_SIZE) {
    throw new RangeError("Global registry too large for 2 bytes.");
}

// console.log("Global registry stats");
// console.log(`Size: ${totalLength} / ${REGISTRY_MAX_SIZE} (${(100 * totalLength / REGISTRY_MAX_SIZE).toFixed(2)}%)`);
// console.log("Breakdown by schema:");
// console.table(
//     Object.fromEntries(
//         schemas.map(schema => [schema.name, schema.definitions.length] as const)
//             .sort(([, sizeA], [, sizeB]) => sizeB - sizeA)
//             .map(([name, size]) => [name, { length: size, percentage: `${(100 * size / totalLength).toFixed(2)}%` }] as const)
//     )
// );

export const GlobalRegistrar = Object.freeze({
    writeToStream<S extends ByteStream>(stream: S, def: ReifiableDef<ObjectDefinition>): S {
        return stream.writeUint16(
            idStringToNumber[typeof def === "string" ? def : def.idString]
        );
    },
    readFromStream<Spec extends ObjectDefinition>(stream: ByteStream): Spec {
        const idx = stream.readUint16();
        const def = definitions[idx];
        if (def === undefined) {
            if (strictSchemaReads) {
                throw new RangeError(`Bad index ${idx} in registry`);
            } else {
                console.error(`Bad index ${idx} in registry`);
            }
        }
        return def as Spec;
    },
    /**
     * Use a specific schema's `fromString` proxy, if you want stricter typings
     */
    fromString(idString: ReferenceTo<ObjectDefinition>): ObjectDefinition {
        const def = definitions[idStringToNumber[idString]];
        if (def === undefined) {
            throw new ReferenceError(`idString '${idString}' does not exist in the global registry`);
        }
        return def;
    },
    hasString(idString: ReferenceTo<ObjectDefinition>): boolean {
        return idString in idStringToNumber;
    }
});

export enum ItemType {
    Gun,
    Ammo,
    Melee,
    Throwable,
    Healing,
    Armor,
    Backpack,
    Scope,
    Skin,
    Perk
}

export interface ItemDefinition extends ObjectDefinition {
    readonly itemType: ItemType
    readonly noDrop?: boolean
    readonly devItem?: boolean
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
