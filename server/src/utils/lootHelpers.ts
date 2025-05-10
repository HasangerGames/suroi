import { Ammos } from "@common/definitions/items/ammos";
import { Armors } from "@common/definitions/items/armors";
import { Backpacks } from "@common/definitions/items/backpacks";
import { Guns } from "@common/definitions/items/guns";
import { HealingItems } from "@common/definitions/items/healingItems";
import { Melees } from "@common/definitions/items/melees";
import { Perks } from "@common/definitions/items/perks";
import { Scopes } from "@common/definitions/items/scopes";
import { Skins } from "@common/definitions/items/skins";
import { Throwables } from "@common/definitions/items/throwables";
import { LootDefForType, LootDefinition, Loots } from "@common/definitions/loots";
import { ModeName } from "@common/definitions/modes";
import { isArray } from "@common/utils/misc";
import { ItemType, NullString, ObjectDefinition, ObjectDefinitions, ReferenceOrRandom, ReferenceTo } from "@common/utils/objectDefinitions";
import { random, weightedRandom } from "@common/utils/random";
import { LootTables } from "../data/lootTables";
import { MapDefinition } from "../data/maps";
import { BuildingDefinition, Buildings } from "@common/definitions/buildings";
import { ObstacleDefinition, Obstacles } from "@common/definitions/obstacles";

export type WeightedItem =
    (
        | { readonly item: ReferenceTo<LootDefinition> | typeof NullString }
        | { readonly table: string }
    )
    & { readonly weight: number }
    & (
        | { readonly spawnSeparately?: false, readonly count?: number }
        | { readonly spawnSeparately: true, readonly count: number }
    );

export type SimpleLootTable = readonly WeightedItem[] | ReadonlyArray<readonly WeightedItem[]>;

export type FullLootTable = {
    readonly min: number
    readonly max: number
    /**
     * Ensures no duplicate drops. Only applies to items in the table, not tables.
     */
    readonly noDuplicates?: boolean
    readonly loot: readonly WeightedItem[]
};

export type LootTable = SimpleLootTable | FullLootTable;

export class LootItem {
    constructor(
        public readonly idString: ReferenceTo<LootDefinition>,
        public readonly count: number
    ) { }
}

export function getLootFromTable(modeName: ModeName, tableID: string): LootItem[] {
    const lootTable = resolveTable(modeName, tableID);
    if (lootTable === undefined) {
        throw new ReferenceError(`Unknown loot table: ${tableID}`);
    }

    const isSimple = isArray(lootTable);
    const { min, max, noDuplicates, loot } = isSimple
        ? {
            min: 1,
            max: 1,
            noDuplicates: false,
            loot: lootTable
        }
        : lootTable.noDuplicates
            ? { ...lootTable, loot: Array.from(lootTable.loot) } // cloning the array is necessary because noDuplicates mutates it
            : lootTable;

    return (
        isSimple && isArray(loot[0])
            ? (loot as readonly WeightedItem[][]).map(innerTable => getLoot(modeName, innerTable))
            : min === 1 && max === 1
                ? getLoot(modeName, loot as WeightedItem[], noDuplicates)
                : Array.from(
                    { length: random(min, max) },
                    () => getLoot(modeName, loot as WeightedItem[], noDuplicates)
                )
    ).flat();
}

export function resolveTable(modeName: ModeName, tableID: string): LootTable {
    return LootTables[modeName]?.[tableID] ?? LootTables.normal[tableID];
}

function getLoot(modeName: ModeName, items: WeightedItem[], noDuplicates?: boolean): LootItem[] {
    const selection = items.length === 1
        ? items[0]
        : weightedRandom(items, items.map(({ weight }) => weight));

    if ("table" in selection) {
        return getLootFromTable(modeName, selection.table);
    }

    const item = selection.item;
    if (item === NullString) return [];

    const loot: LootItem[] = selection.spawnSeparately
        ? Array.from({ length: selection.count }, () => new LootItem(item, 1))
        : [new LootItem(item, selection.count ?? 1)];

    const definition = Loots.fromStringSafe(item);
    if (definition === undefined) {
        throw new ReferenceError(`Unknown loot item: ${item}`);
    }

    if ("ammoType" in definition && definition.ammoSpawnAmount) {
        // eslint-disable-next-line prefer-const
        let { ammoType, ammoSpawnAmount } = definition;

        if (selection.spawnSeparately) {
            ammoSpawnAmount *= selection.count;
        }

        if (ammoSpawnAmount > 1) {
            const halfAmount = ammoSpawnAmount / 2;
            loot.push(
                new LootItem(ammoType, Math.floor(halfAmount)),
                new LootItem(ammoType, Math.ceil(halfAmount))
            );
        } else {
            loot.push(new LootItem(ammoType, ammoSpawnAmount));
        }
    }
    if (definition.itemType === ItemType.Gun && definition.spawnScope) {
        loot.push(new LootItem(definition.spawnScope, 1));
    }

    if (noDuplicates) {
        const index = items.findIndex(entry => "item" in entry && entry.item === selection.item);
        if (index !== -1) items.splice(index, 1);
    }

    return loot;
}

// either return a reference as-is, or take all the non-null string references
const referenceOrRandomOptions = <T extends ObjectDefinition>(obj: ReferenceOrRandom<T>): Array<ReferenceTo<T>> => {
    return typeof obj === "string"
        ? [obj]
        // well, Object.keys already filters out symbols so…
        : Object.keys(obj)/* .filter(k => k !== NullString) */;
};

export type ItemRegistry = ReadonlySet<ReferenceTo<LootDefinition>> & {
    forType<K extends ItemType>(type: K): ReadonlyArray<LootDefForType<K>>
};

const itemTypeToCollection: {
    [K in ItemType]: ObjectDefinitions<LootDefForType<K>>
} = {
    [ItemType.Gun]: Guns,
    [ItemType.Ammo]: Ammos,
    [ItemType.Melee]: Melees,
    [ItemType.Throwable]: Throwables,
    [ItemType.Healing]: HealingItems,
    [ItemType.Armor]: Armors,
    [ItemType.Backpack]: Backpacks,
    [ItemType.Scope]: Scopes,
    [ItemType.Skin]: Skins,
    [ItemType.Perk]: Perks
};

export type Cache = {
    [K in ItemType]?: Array<LootDefForType<K>> | undefined;
};

export function getSpawnableLoots(modeName: ModeName, mapDef: MapDefinition, cache: Cache): ItemRegistry {
    /*
        we have a collection of loot tables, but not all of them are necessarily reachable
        for example, if loot table A belongs to obstacle A, but said obstacle is never spawned,
        then we mustn't take loot table A into account
    */

    // first, get all the reachable buildings
    // to do this, we get all the buildings in the map def, then for each one, include itself and any subbuildings
    // flatten that array, and that's the reachable buildings
    // and for good measure, we exclude duplicates by using a set
    const reachableBuildings = [
        ...new Set(
            Object.keys(mapDef.buildings ?? {}).map(building => {
                const b = Buildings.fromString(building);

                // for each subbuilding, we either take it as-is, or take all possible spawn options
                return (b.subBuildings ?? []).map(
                    ({ idString }) => referenceOrRandomOptions(idString).map(s => Buildings.fromString(s))
                ).concat([b]);
            }).flat(2)
        )
    ] satisfies readonly BuildingDefinition[];

    // now obstacles
    // for this, we take the list of obstacles from the map def, and append to that alllllll the obstacles from the
    // reachable buildings, which again involves flattening some arrays
    const reachableObstacles = [
        ...new Set(
            Object.keys(mapDef.obstacles ?? {}).map(o => Obstacles.fromString(o)).concat(
                reachableBuildings.map(
                    ({ obstacles = [] }) => obstacles.map(
                        ({ idString }) => referenceOrRandomOptions(idString).map(o => Obstacles.fromString(o))
                    )
                ).flat(2)
            )
        )
    ] satisfies readonly ObstacleDefinition[];

    // and now, we generate the list of reachable tables, by taking those from map def, and adding those from
    // both the obstacles and the buildings
    const reachableLootTables = [
        ...new Set(
            Object.keys(mapDef.loots ?? {}).map(t => resolveTable(modeName, t)).concat(
                reachableObstacles.filter(({ hasLoot }) => hasLoot).map(
                    ({ lootTable, idString }) => resolveTable(modeName, lootTable ?? idString)
                )
            ).concat(
                reachableBuildings.map(
                    ({ lootSpawners }) => lootSpawners ? lootSpawners.map(({ table }) => resolveTable(modeName, table)) : []
                ).flat()
            )
        )
    ] satisfies readonly LootTable[];

    const getAllItemsFromTable = (table: LootTable): Array<ReferenceTo<LootDefinition>> =>
        (
            Array.isArray(table)
                ? table as SimpleLootTable
                : (table as FullLootTable).loot
        )
            .flat()
            .map(entry => "item" in entry ? entry.item : getAllItemsFromTable(resolveTable(modeName, entry.table)))
            .filter(item => item !== NullString && !Loots.fromStringSafe(item as string)?.noSwap)
            .flat() as string[];

    // and now we go get the spawnable loots
    const spawnableLoots: ReadonlySet<ReferenceTo<LootDefinition>>
        = new Set<ReferenceTo<LootDefinition>>(
            reachableLootTables.map(getAllItemsFromTable).flat());

    (spawnableLoots as ItemRegistry).forType = <K extends ItemType>(type: K): ReadonlyArray<LootDefForType<K>> => {
        return (
            (
                // without this seemingly useless assertion, assignability errors occur
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                cache[type] as Array<LootDefForType<K>> | undefined
            ) ??= itemTypeToCollection[type].definitions.filter(({ idString }) => spawnableLoots.has(idString))
        );
    };

    return spawnableLoots as ItemRegistry;
}

export function getAllLoots(cache: Cache, dev?: boolean): ItemRegistry {
    // returns a set of all loot items in the game
    // property "dev" allows including dev items if true
    const filter = (def: LootDefinition): boolean => dev ? true : !def.devItem;

    const allLoots: ReadonlySet<ReferenceTo<LootDefinition>> = new Set<ReferenceTo<LootDefinition>>([
        ...Loots.definitions.filter(filter)
    ].map(({ idString }) => idString));

    (allLoots as ItemRegistry).forType = <K extends ItemType>(type: K): ReadonlyArray<LootDefForType<K>> => {
        return (
            (
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                cache[type] as Array<LootDefForType<K>> | undefined
            ) ??= itemTypeToCollection[type].definitions.filter(({ idString }) => allLoots.has(idString))
        );
    };

    return allLoots as ItemRegistry;
}
