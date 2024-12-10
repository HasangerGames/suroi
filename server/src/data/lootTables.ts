import { GameConstants } from "@common/constants";
import { Ammos } from "@common/definitions/ammos";
import { Armors } from "@common/definitions/armors";
import { Backpacks } from "@common/definitions/backpacks";
import { Buildings, type BuildingDefinition } from "@common/definitions/buildings";
import { Guns } from "@common/definitions/guns";
import { HealingItems } from "@common/definitions/healingItems";
import { Loots, type LootDefForType, type LootDefinition } from "@common/definitions/loots";
import { Melees } from "@common/definitions/melees";
import { ObstacleDefinition, Obstacles } from "@common/definitions/obstacles";
import { PerkIds, Perks } from "@common/definitions/perks";
import { Scopes } from "@common/definitions/scopes";
import { Skins } from "@common/definitions/skins";
import { Throwables } from "@common/definitions/throwables";
import { isArray } from "@common/utils/misc";
import { ItemType, NullString, type ObjectDefinition, type ObjectDefinitions, type ReferenceOrRandom, type ReferenceTo } from "@common/utils/objectDefinitions";
import { random, weightedRandom } from "@common/utils/random";
import { Maps } from "./maps";

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

export function getLootFromTable(tableID: string): LootItem[] {
    const lootTable = resolveTable(tableID);
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
            ? { ...lootTable, loot: [...lootTable.loot] } // cloning the array is necessary because noDuplicates mutates it
            : lootTable;

    return (
        isSimple && isArray(loot[0])
            ? (loot as readonly WeightedItem[][]).map(innerTable => getLoot(innerTable))
            : min === 1 && max === 1
                ? getLoot(loot as WeightedItem[], noDuplicates)
                : Array.from(
                    { length: random(min, max) },
                    () => getLoot(loot as WeightedItem[], noDuplicates)
                )
    ).flat();
}

export function resolveTable(tableID: string): LootTable {
    return LootTables[GameConstants.modeName]?.[tableID] ?? LootTables.normal[tableID];
}

function getLoot(items: WeightedItem[], noDuplicates?: boolean): LootItem[] {
    const selection = items.length === 1
        ? items[0]
        : weightedRandom(items, items.map(({ weight }) => weight));

    if ("table" in selection) {
        return getLootFromTable(selection.table);
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

    if (noDuplicates) {
        const index = items.findIndex(entry => "item" in entry && entry.item === selection.item);
        if (index !== -1) items.splice(index, 1);
    }

    return loot;
}

export const LootTables: Record<string, Record<string, LootTable>> = {
    normal: {
        ground_loot: [
            { table: "equipment", weight: 1 },
            { table: "healing_items", weight: 1 },
            { table: "ammo", weight: 1 },
            { table: "guns", weight: 0.9 },
            { table: "scopes", weight: 0.3 }
        ],
        regular_crate: [
            { table: "guns", weight: 1.25 },
            { table: "equipment", weight: 1 },
            { table: "healing_items", weight: 1 },
            { table: "ammo", weight: 0.5 },
            { table: "scopes", weight: 0.3 },
            { table: "throwables", weight: 0.3 },
            { table: "melee", weight: 0.04 }
        ],
        hazel_crate: [
            [{ item: "firework_launcher", weight: 1 }],
            [{ item: "1st_birthday", weight: 1 }]
        ],
        viking_chest: [
            [{ item: "seax", weight: 1 }],
            [{ table: "viking_chest_guns", weight: 1 }],
            [{ table: "viking_chest_guns", weight: 1 }],
            [
                { table: "special_equipment", weight: 0.65 },
                { table: "viking_chest_guns", weight: 0.5 },
                { table: "special_scopes", weight: 0.3 }
            ],
            [
                { table: "special_equipment", weight: 0.65 },
                { table: "special_scopes", weight: 0.3 }
            ]
        ],
        river_chest: [
            [{ table: "river_chest_guns", weight: 1 }],
            [{ table: "river_chest_guns", weight: 1 }],
            [
                { table: "special_equipment", weight: 0.65 },
                { table: "river_chest_guns", weight: 0.5 },
                { table: "special_scopes", weight: 0.3 }
            ],
            [
                { table: "special_equipment", weight: 0.65 },
                { table: "special_scopes", weight: 0.3 }
            ]
        ],
        aegis_crate: {
            min: 3,
            max: 5,
            loot: [
                { table: "special_guns", weight: 1 },
                { table: "special_equipment", weight: 0.65 },
                { table: "special_scopes", weight: 0.3 },
                { table: "special_healing_items", weight: 0.15 }
            ]
        },
        frozen_crate: [
            [
                { table: "airdrop_guns", weight: 0.5 },
                { item: "firework_launcher", weight: 0.25 },
                { table: "river_chest_guns", weight: 1 }
            ],
            [
                { table: "ammo", weight: 1 },
                { table: "airdrop_scopes", weight: 1 }
            ],
            [{ table: "special_winter_skins", weight: 1 }],
            [{ table: "airdrop_healing_items", weight: 0.5 }],
            [
                { table: "equipment", weight: 1 },
                { table: "special_equipment", weight: 0.5 }
            ]
        ],
        dumpster: {
            min: 1,
            max: 2,
            loot: [
                { table: "guns", weight: 0.8 },
                { table: "healing_items", weight: 0.6 },
                { table: "scopes", weight: 0.4 },
                { table: "equipment", weight: 0.3 }
            ]
        },
        flint_crate: {
            min: 3,
            max: 5,
            loot: [
                { table: "special_guns", weight: 1 },
                { table: "special_equipment", weight: 0.65 },
                { table: "special_healing_items", weight: 0.15 },
                { table: "special_scopes", weight: 0.3 }
            ]
        },
        grenade_box: [
            { item: "frag_grenade", weight: 1, count: 2 },
            { item: "smoke_grenade", weight: 1, count: 2 }
        ],
        melee_crate: {
            min: 2,
            max: 2,
            loot: [
                { table: "melee", weight: 1 }
            ]
        },
        grenade_crate: {
            min: 3,
            max: 4,
            loot: [
                { table: "throwables", weight: 1 }
            ]
        },
        tango_crate: [
            [
                { item: "4x_scope", weight: 1 },
                { item: "8x_scope", weight: 0.1 },
                { item: "15x_scope", weight: 0.0025 }
            ],
            [
                { item: "tango_51", weight: 60 },
                { item: "tango_51", spawnSeparately: true, count: 2, weight: 30 },
                { item: "tango_51", spawnSeparately: true, count: 3, weight: 3.5 },
                { item: "tango_51", spawnSeparately: true, count: 4, weight: 0.1 },
                { item: "tango_51", spawnSeparately: true, count: 5, weight: 0.0000001 }
            ]
        ],
        lux_crate: [
            [{ item: "rgs", weight: 1 }],
            [{ table: "scopes", weight: 1 }]
        ],
        gold_rock: [
            { item: "mosin_nagant", weight: 1 }
        ],
        loot_tree: [
            [
                { item: "model_37", weight: 1 },
                { item: "m3k", weight: 1 },
                { item: "vepr12", weight: 0.2 }
            ],
            [{ item: "hatchet", weight: 1 }],
            [{ item: "lumberjack", weight: 1 }],
            [{ item: "basic_helmet", weight: 1 }],
            [{ item: "basic_pack", weight: 1 }],
            [{ item: "12g", count: 15, weight: 1 }]
        ],
        loot_barrel: [
            [{ item: "crowbar", weight: 1 }],
            [{ item: "sr25", weight: 1 }],
            [{ item: "c4", weight: 1, count: 3 }],
            [
                { table: "equipment", weight: 1 },
                { table: "scopes", weight: 1 },
                { table: "healing_items", weight: 1 }
            ]
        ],
        pumpkin: [
            { table: "equipment", weight: 1 },
            { table: "healing_items", weight: 1 },
            { table: "ammo", weight: 1 },
            { table: "guns", weight: 0.9 },
            { table: "scopes", weight: 0.3 }
        ],
        large_pumpkin: {
            min: 2,
            max: 3,
            loot: [
                { table: "equipment", weight: 1 },
                { table: "healing_items", weight: 1 },
                { table: "ammo", weight: 1 },
                { table: "guns", weight: 0.9 },
                { table: "scopes", weight: 0.3 }
            ]
        },
        birthday_cake: [
            { table: "special_guns", weight: 0.25 },
            { table: "special_equipment", weight: 0.25 },
            { item: "1st_birthday", weight: 0.25 },
            { item: "firework_rocket", weight: 0.2 },
            { item: "firework_launcher", weight: 0.01 }
        ],
        special_bush: [
            { table: "special_equipment", weight: 1 },
            { table: "healing_items", weight: 1 },
            { table: "scopes", weight: 1 }
        ],
        warehouse: [
            { table: "special_guns", weight: 1 },
            { table: "special_scopes", weight: 0.25 },
            { table: "special_equipment", weight: 0.65 }
        ],
        large_drawer: [
            { table: "guns", weight: 1 },
            { table: "equipment", weight: 0.65 },
            { table: "scopes", weight: 0.3 }
        ],
        small_drawer: [
            { table: "ammo", weight: 1 },
            { table: "healing_items", weight: 0.8 },
            { table: "guns", weight: 0.3 }
        ],
        filing_cabinet: [
            { table: "ammo", weight: 1 },
            { table: "equipment", weight: 0.85 },
            { table: "healing_items", weight: 0.4 },
            { table: "guns", weight: 0.3 }
        ],
        small_table: [
            { table: "healing_items", weight: 1 },
            { table: "ammo", weight: 1 }
        ],
        box: [
            { table: "ammo", weight: 1.2 },
            { table: "healing_items", weight: 1 },
            { table: "equipment", weight: 1 },
            { table: "guns", weight: 0.5 },
            { table: "scopes", weight: 0.3 }
        ],
        small_desk: [
            [
                { table: "healing_items", weight: 0.8 },
                { table: "equipment", weight: 1 },
                { table: "guns", weight: 1 },
                { table: "scopes", weight: 0.4 }
            ],
            [
                { table: "healing_items", weight: 1 },
                { table: "scopes", weight: 1 }
            ]
        ],
        bookshelf: {
            min: 1,
            max: 2,
            loot: [
                { table: "equipment", weight: 1.1 },
                { table: "scopes", weight: 0.4 },
                { table: "guns", weight: 1 },
                { table: "healing_items", weight: 0.6 }
            ]
        },
        trash: [
            { table: "ammo", weight: 1 },
            { item: "cola", weight: 0.1 }
        ],
        fridge: {
            min: 2,
            max: 3,
            loot: [
                { item: "cola", weight: 1 }
            ]
        },
        vending_machine: {
            min: 2,
            max: 3,
            loot: [
                { item: "cola", weight: 1 },
                { item: "medikit", weight: 0.25 },
                { item: "tablets", weight: 0.1 }
            ]
        },
        cooler: {
            min: 2,
            max: 3,
            loot: [
                { item: "cola", weight: 1 }
            ]
        },
        washing_machine: [
            { item: "lemon", weight: 1 },
            { item: "flamingo", weight: 1 },
            { item: "verified", weight: 0.5 },
            { item: "no_kil_pls", weight: 0.5 },
            { item: "basic_outfit", weight: 0.001 }
        ],
        toilet: {
            min: 2,
            max: 3,
            loot: [
                { table: "healing_items", weight: 3 },
                { table: "scopes", weight: 0.1 },
                { table: "guns", weight: 0.05 }
            ]
        },
        used_toilet: {
            min: 2,
            max: 3,
            loot: [
                { table: "guns", weight: 1.25 },
                { table: "equipment", weight: 1 },
                { table: "scopes", weight: 0.35 },
                { table: "special_guns", weight: 0.8 },
                { table: "healing_items", weight: 0.75 }
            ]
        },
        porta_potty_toilet_open: {
            min: 2,
            max: 3,
            loot: [
                { table: "guns", weight: 1.25 },
                { table: "healing_items", weight: 1 },
                { table: "equipment", weight: 0.9 },
                { table: "special_guns", weight: 0.8 },
                { table: "special_scopes", weight: 0.35 }
            ]
        },
        porta_potty_toilet_closed: {
            min: 2,
            max: 3,
            loot: [
                { table: "healing_items", weight: 3 },
                { table: "scopes", weight: 0.1 },
                { table: "guns", weight: 0.05 }
            ]
        },
        ...["mcx_spear", "hp18", "stoner_63", "mini14", "maul", "m590m", "dual_rsh12"].reduce(
            (acc, item) => {
                acc[`gun_mount_${item}`] = [{ item, weight: 1 }];
                return acc;
            },
            {} as Record<string, LootTable>
        ),
        gas_can: [
            { item: "gas_can", weight: 1 }
        ],
        hq_skin: [
            { item: "gold_tie_event", weight: 1 }
        ],
        ship_skin: [
            { item: "ship_carrier", weight: 1 }
        ],
        armory_skin: [
            { item: "nsd_uniform", weight: 1 }
        ],
        plumpkin_bunker_skin: [
            { item: "pumpkified", weight: 1 }
        ],
        bombed_armory_skin: [
            { item: "one_at_nsd", weight: 1 }
        ],
        airdrop_crate: [
            [{ table: "airdrop_equipment", weight: 1 }],
            [{ table: "airdrop_scopes", weight: 1 }],
            [{ table: "airdrop_healing_items", weight: 1 }],
            [{ table: "airdrop_skins", weight: 1 }],
            [{ table: "airdrop_melee", weight: 1 }],
            [{ table: "ammo", weight: 1 }],
            [{ table: "airdrop_guns", weight: 1 }],
            [
                { item: "frag_grenade", count: 3, weight: 2 },
                { item: NullString, weight: 1 }
            ]
        ],
        gold_airdrop_crate: [
            [{ table: "airdrop_equipment", weight: 1 }],
            [{ table: "airdrop_scopes", weight: 1 }],
            [{ table: "airdrop_healing_items", weight: 1 }],
            [{ table: "airdrop_skins", weight: 1 }],
            [{ table: "airdrop_melee", weight: 1 }],
            [{ table: "ammo", weight: 1 }],
            [{ table: "gold_airdrop_guns", weight: 1 }],
            [{ item: "frag_grenade", count: 3, weight: 1 }]
        ],
        flint_stone: [
            { table: "gold_airdrop_guns", weight: 1 }
        ],
        christmas_tree: {
            min: 4,
            max: 5,
            loot: [
                { table: "special_winter_skins", weight: 1 },
                { table: "special_guns", weight: 1 },
                { table: "special_equipment", weight: 0.65 },
                { table: "special_healing_items", weight: 0.65 },
                { table: "special_scopes", weight: 0.3 },
                { item: "radio", weight: 0.1 }
            ]
        },
        gun_case: {
            min: 1,
            max: 2,
            loot: [
                { table: "special_guns", weight: 1 }
            ]
        },
        gun_locker: {
            min: 1,
            max: 2,
            loot: [
                { item: "ak47", weight: 1 },
                { item: "aug", weight: 1 },
                { item: "model_37", weight: 1 },
                { item: "mp40", weight: 1 },
                { item: "m3k", weight: 0.6 },
                { item: "flues", weight: 0.6 },
                { item: "m16a4", weight: 0.4 },
                { item: "cz600", weight: 0.4 },
                { item: "mcx_spear", weight: 0.1 },
                { item: "mg36", weight: 0.1 },
                { item: "vss", weight: 0.1 },
                { item: "mosin_nagant", weight: 0.1 },
                { item: "sr25", weight: 0.05 },
                { item: "mini14", weight: 0.05 },
                { item: "vepr12", weight: 0.05 },
                { item: "stoner_63", weight: 0.05 },
                { item: "vector", weight: 0.05 },
                { item: "tango_51", weight: 0.05 },
                { item: "model_89", weight: 0.05 }
            ]
        },
        ammo_crate: [
            [{ table: "ammo", weight: 1 }],
            [{ table: "ammo", weight: 1 }],
            [
                { item: NullString, weight: 1 },
                { item: "50cal", count: 20, weight: 0.3 },
                { item: "338lap", count: 6, weight: 0.1 },
                { item: "curadell", weight: 0.1 }
            ]
        ],
        rocket_box: [
            { item: "firework_rocket", count: 10, weight: 2 },
            { table: "ammo", weight: 1 },
            { item: "curadell", weight: 0.02 }
        ],
        falchion_case: [
            { item: "falchion", weight: 1 }
        ],
        hatchet_stump: [
            { item: "hatchet", weight: 1 }
        ],
        aegis_golden_case: [
            { item: "deagle", weight: 1 },
            { item: "rsh12", weight: 0.5 },
            { item: "dual_deagle", weight: 0.05 },
            { item: "dual_rsh12", weight: 0.025 },
            { item: "g19", weight: 0.0005 }
        ],
        fire_hatchet_case: [
            { item: "fire_hatchet", weight: 1 }
        ],
        ice_pick_case: [
            [{ item: "ice_pick", weight: 1 }],
            [{ item: "frosty", weight: 1 }]
        ],
        confetti_grenade_box: {
            min: 1,
            max: 2,
            loot: [
                { item: "confetti_grenade", count: 4, weight: 2 },
                { table: "throwables", weight: 1 }
            ]
        },
        cabinet: [
            { table: "special_guns", weight: 1 },
            { table: "special_healing_items", weight: 0.65 },
            { table: "special_equipment", weight: 0.65 },
            { table: "special_scopes", weight: 0.3 }
        ],
        briefcase: [
            { item: "vector", weight: 3 },
            { item: "arx160", weight: 1 },
            { item: "vepr12", weight: 1 },
            { item: "stoner_63", weight: 0.2 },
            { item: "negev", weight: 0.15 },
            { item: "mg5", weight: 0.15 },
            { item: "g19", weight: 0.05 }
        ],
        sink: [
            { table: "healing_items", weight: 1.2 },
            { table: "ammo", weight: 1 }
        ],
        sink2: [
            { table: "healing_items", weight: 1.2 },
            { table: "ammo", weight: 1 },
            { table: "guns", weight: 0.8 }
        ],
        kitchen_unit_1: [
            { table: "healing_items", weight: 1.2 },
            { table: "ammo", weight: 1 },
            { table: "guns", weight: 0.9 }
        ],
        kitchen_unit_2: [
            { table: "healing_items", weight: 1.2 },
            { table: "ammo", weight: 1 },
            { table: "guns", weight: 0.9 },
            { table: "special_guns", weight: 0.5 }
        ],
        kitchen_unit_3: [
            { table: "healing_items", weight: 1.2 },
            { table: "ammo", weight: 1 }
        ],
        sea_traffic_control_floor: [
            { item: "radio", weight: 1 }
        ],
        sea_traffic_control_outside: [
            { item: "peachy_breeze", weight: 1 }
        ],
        tugboat_red_floor: [
            { item: "deep_sea", weight: 1 }
        ],
        potted_plant: [
            { table: "ammo", weight: 1 },
            { table: "healing_items", weight: 0.5 },
            { table: "equipment", weight: 0.3 }
        ],

        guns: [
            { item: "g19", weight: 2 },
            { item: "m1895", weight: 1.75 },
            { item: "mp40", weight: 1.7 },
            { item: "saf200", weight: 1.5 },
            { item: "cz75a", weight: 1.5 },
            { item: "hp18", weight: 1.25 },
            { item: "micro_uzi", weight: 1 },
            { item: "ak47", weight: 1 },
            { item: "model_37", weight: 0.95 },
            { item: "aug", weight: 0.7 },
            { item: "sks", weight: 0.7 },
            { item: "m3k", weight: 0.3 },
            { item: "m16a4", weight: 0.1 },
            { item: "arx160", weight: 0.1 },
            { item: "flues", weight: 0.1 },
            { item: "lewis_gun", weight: 0.05 },
            { item: "cz600", weight: 0.04 },
            { item: "vss", weight: 0.02 },
            { item: "mg36", weight: 0.015 },
            { item: "sr25", weight: 0.01 },
            { item: "mini14", weight: 0.01 },
            { item: "mcx_spear", weight: 0.01 },
            { item: "vepr12", weight: 0.008 },
            { item: "stoner_63", weight: 0.005 },
            { item: "radio", weight: 0.005 },
            { item: "mosin_nagant", weight: 0.005 },
            { item: "vector", weight: 0.004 },
            { item: "deagle", weight: 0.004 },
            { item: "model_89", weight: 0.003 },
            { item: "vks", weight: 0.003 },
            { item: "negev", weight: 0.003 },
            { item: "mg5", weight: 0.003 },
            { item: "tango_51", weight: 0.002 },
            { item: "dual_deagle", weight: 0.001 }
        ],
        healing_items: [
            { item: "gauze", count: 5, weight: 3 },
            { item: "cola", weight: 2 },
            { item: "tablets", weight: 1 },
            { item: "medikit", weight: 1 }
        ],
        scopes: [
            { item: "2x_scope", weight: 1 },
            { item: "4x_scope", weight: 0.5 },
            { item: "8x_scope", weight: 0.1 },
            { item: "15x_scope", weight: 0.00025 }
        ],
        equipment: [
            { item: "basic_helmet", weight: 1 },
            { item: "regular_helmet", weight: 0.2 },
            { item: "tactical_helmet", weight: 0.01 },

            { item: "basic_vest", weight: 1 },
            { item: "regular_vest", weight: 0.2 },
            { item: "tactical_vest", weight: 0.01 },

            { item: "basic_pack", weight: 1 },
            { item: "regular_pack", weight: 0.2 },
            { item: "tactical_pack", weight: 0.01 }
        ],
        ammo: [
            { item: "12g", count: 10, weight: 0.75 },
            { item: "556mm", count: 60, weight: 1 },
            { item: "762mm", count: 60, weight: 1 },
            { item: "9mm", count: 60, weight: 1 },
            { item: "50cal", count: 20, weight: 0.05 }
        ],
        throwables: [
            { item: "frag_grenade", count: 2, weight: 1 },
            { item: "smoke_grenade", count: 2, weight: 1 },
            { item: "c4", count: 2, weight: 0.2 }
        ],
        special_guns: [
            { item: "micro_uzi", weight: 1.25 },
            { item: "ak47", weight: 1.1 },
            { item: "aug", weight: 1.05 },
            { item: "hp18", weight: 1 },
            { item: "mp40", weight: 1 },
            { item: "sks", weight: 1 },
            { item: "model_37", weight: 1 },
            { item: "m3k", weight: 0.8 },
            { item: "arx160", weight: 0.8 },
            { item: "flues", weight: 0.8 },
            { item: "saf200", weight: 0.75 },
            { item: "cz75a", weight: 0.75 },
            { item: "m16a4", weight: 0.5 },
            { item: "lewis_gun", weight: 0.5 },
            { item: "g19", weight: 0.45 },
            { item: "m1895", weight: 0.45 },
            { item: "cz600", weight: 0.4 },
            { item: "vss", weight: 0.07 },
            { item: "mg36", weight: 0.06 },
            { item: "sr25", weight: 0.05 },
            { item: "mini14", weight: 0.05 },
            { item: "mcx_spear", weight: 0.05 },
            { item: "vepr12", weight: 0.04 },
            { item: "stoner_63", weight: 0.01 },
            { item: "radio", weight: 0.01 },
            { item: "mosin_nagant", weight: 0.01 },
            { item: "vector", weight: 0.008 },
            { item: "deagle", weight: 0.008 },
            { item: "model_89", weight: 0.005 },
            { item: "vks", weight: 0.005 },
            { item: "negev", weight: 0.005 },
            { item: "mg5", weight: 0.005 },
            { item: "tango_51", weight: 0.004 },
            { item: "dual_deagle", weight: 0.003 }
        ],
        special_healing_items: [
            { item: "cola", weight: 3 },
            { item: "tablets", weight: 1 },
            { item: "medikit", weight: 1 },
            { item: "gauze", count: 5, weight: 3 }
        ],
        special_scopes: [
            { item: "2x_scope", weight: 1 },
            { item: "4x_scope", weight: 0.45 },
            { item: "8x_scope", weight: 0.1 },
            { item: "15x_scope", weight: 0.005 }
        ],
        special_equipment: [
            { item: "basic_helmet", weight: 1 },
            { item: "regular_helmet", weight: 0.3 },
            { item: "tactical_helmet", weight: 0.03 },

            { item: "basic_vest", weight: 1 },
            { item: "regular_vest", weight: 0.3 },
            { item: "tactical_vest", weight: 0.03 },

            { item: "basic_pack", weight: 1 },
            { item: "regular_pack", weight: 0.3 },
            { item: "tactical_pack", weight: 0.03 }
        ],
        melee: [
            { item: "baseball_bat", weight: 3 },
            { item: "sickle", weight: 0.5 },
            { item: "kbar", weight: 2 }
        ],
        airdrop_equipment: [
            { item: "tactical_helmet", weight: 1 },
            { item: "tactical_vest", weight: 1 },
            { item: "tactical_pack", weight: 1 }
        ],
        airdrop_scopes: [
            { item: "4x_scope", weight: 1 },
            { item: "8x_scope", weight: 0.5 },
            { item: "15x_scope", weight: 0.0025 }
        ],
        airdrop_healing_items: [
            { item: "gauze", count: 5, weight: 1.5 },
            { item: "medikit", weight: 1 },
            { item: "cola", weight: 1 },
            { item: "tablets", weight: 1 }
        ],
        airdrop_skins: [
            { item: NullString, weight: 1 },
            { item: "stardust", weight: 0.5 },
            { item: "aurora", weight: 0.5 },
            { item: "nebula", weight: 0.4 },
            { item: "ghillie_suit", weight: 0.1 },
            { item: "basic_outfit", weight: 0.001 }
        ],
        airdrop_melee: [
            { item: NullString, weight: 1 },
            { item: "crowbar", weight: 0.1 },
            { item: "hatchet", weight: 0.1 },
            { item: "sickle", weight: 0.1 },
            { item: "kbar", weight: 0.1 }
        ],
        airdrop_guns: [
            { item: "mg36", weight: 1 },
            { item: "sr25", weight: 1 },
            { item: "vss", weight: 1 },
            { item: "vector", weight: 1 },
            { item: "vepr12", weight: 1 },
            { item: "deagle", weight: 1 },
            { item: "mcx_spear", weight: 0.95 },
            { item: "mosin_nagant", weight: 0.95 },
            { item: "tango_51", weight: 0.9 },
            { item: "stoner_63", weight: 0.9 },
            { item: "model_89", weight: 0.6 },
            { item: "vks", weight: 0.6 },
            { item: "radio", weight: 0.1 }
        ],
        gold_airdrop_guns: [
            { item: "m1_garand", weight: 1.1 },
            { item: "acr", weight: 1 },
            { item: "pp19", weight: 1 },
            { item: "negev", weight: 1 },
            { item: "mg5", weight: 1 },
            { item: "mk18", weight: 0.5 },
            { item: "l115a1", weight: 0.5 },
            { item: "dual_rsh12", weight: 0.5 },
            { item: "g19", weight: 0.0005 }
        ],
        winter_skins: [
            { item: "peppermint", weight: 1 },
            { item: "spearmint", weight: 1 },
            { item: "coal", weight: 1 },
            { item: "candy_cane", weight: 1 },
            { item: "henrys_little_helper", weight: 0.25 }
        ],
        special_winter_skins: [
            { item: "holiday_tree", weight: 1 },
            { item: "gingerbread", weight: 1 },
            { item: "henrys_little_helper", weight: 1 },
            { item: "light_choco", weight: 1 }
        ],
        viking_chest_guns: [
            { item: "arx160", weight: 1 },
            { item: "m16a4", weight: 1 },
            { item: "m3k", weight: 1 },
            { item: "flues", weight: 0.9 },
            { item: "mini14", weight: 0.75 },
            { item: "sr25", weight: 0.75 },
            { item: "vss", weight: 0.75 },
            { item: "mcx_spear", weight: 0.75 },
            { item: "mg36", weight: 0.725 },
            { item: "cz600", weight: 0.7 },
            { item: "vepr12", weight: 0.6 },
            { item: "lewis_gun", weight: 0.6 },
            { item: "mosin_nagant", weight: 0.5 },
            { item: "vector", weight: 0.4 },
            { item: "stoner_63", weight: 0.15 },
            { item: "negev", weight: 0.1 },
            { item: "mg5", weight: 0.1 },
            { item: "tango_51", weight: 0.1 },
            { item: "deagle", weight: 0.1 },
            { item: "g19", weight: 0.05 },
            { item: "dual_deagle", weight: 0.04 }
        ],
        river_chest_guns: [
            { item: "m16a4", weight: 1 },
            { item: "cz600", weight: 0.75 },
            { item: "mini14", weight: 0.75 },
            { item: "mcx_spear", weight: 0.55 },
            { item: "sr25", weight: 0.5 },
            { item: "vss", weight: 0.5 },
            { item: "mg36", weight: 0.45 },
            { item: "mosin_nagant", weight: 0.45 },
            { item: "vector", weight: 0.4 },
            { item: "stoner_63", weight: 0.08 },
            { item: "tango_51", weight: 0.08 },
            { item: "g19", weight: 0.08 }
        ],
        jack_o_lantern: [
            [{ table: "pumpkin", weight: 1 }],
            [{ table: "pumpkin", weight: 1 }],
            [
                { table: "pumpkin", weight: 1 },
                { item: NullString, weight: 1 }
            ],
            [
                { item: NullString, weight: 1.5 },
                { item: PerkIds.Costumed, weight: 1 }
            ]
        ],
        plumpkin: {
            min: 3,
            max: 3,
            loot: [{ table: "fall_perks", weight: 1 }]
        },
        diseased_plumpkin: [
            [{ item: PerkIds.PlumpkinGamble, weight: 1 }],
            [
                { item: "diseased", weight: 0.1 },
                { item: NullString, weight: 0.9 }
            ]
        ],
        fall_perks: {
            min: 1,
            max: 1,
            noDuplicates: true,
            loot: [
                { item: PerkIds.InfiniteAmmo, weight: 1 },
                { item: PerkIds.ExtendedMags, weight: 1 },
                { item: PerkIds.Flechettes, weight: 1 },
                { item: PerkIds.DemoExpert, weight: 1 },
                { item: PerkIds.SecondWind, weight: 1 },
                { item: PerkIds.FieldMedic, weight: 1 },
                { item: PerkIds.SabotRounds, weight: 1 },
                { item: PerkIds.AdvancedAthletics, weight: 1 },
                { item: PerkIds.Toploaded, weight: 1 },
                { item: PerkIds.CloseQuartersCombat, weight: 1 },
                { item: PerkIds.LowProfile, weight: 1 },
                { item: PerkIds.Berserker, weight: 1 }
            ]
        },
        red_gift: [
            [
                { item: "model_37", weight: 0.4 },
                { item: "m3k", weight: 0.3 },
                { item: "flues", weight: 0.25 },
                { item: "vepr12", weight: 0.05 }
            ],
            [
                { table: "special_winter_skins", weight: 0.25 },
                { table: "winter_skins", weight: 0.25 },
                { item: NullString, weight: 1 }
            ]
        ],
        blue_gift: [
            [
                { item: "arx160", weight: 0.5 },
                { item: "lewis_gun", weight: 0.4 },
                { item: "mosin_nagant", weight: 0.05 },
                { item: "sr25", weight: 0.04 },
                { item: "m1_garand", weight: 0.01 },
                { item: "mg5", weight: 0.01 }
            ],
            [
                { table: "special_winter_skins", weight: 0.25 },
                { table: "winter_skins", weight: 0.25 },
                { item: NullString, weight: 1 }
            ]
        ],
        green_gift: [
            [
                { item: "m16a4", weight: 0.5 },
                { item: "cz600", weight: 0.35 },
                { item: "mg36", weight: 0.1 },
                { item: "mini14", weight: 0.04 },
                { item: "negev", weight: 0.01 }
            ],
            [
                { table: "special_winter_skins", weight: 0.25 },
                { table: "winter_skins", weight: 0.25 },
                { item: NullString, weight: 1 }
            ]
        ],
        purple_gift: [
            [
                { item: "model_89", weight: 0.5 },
                { item: "tango_51", weight: 0.2 },
                { item: "pp19", weight: 0.2 },
                { item: "mg5", weight: 0.1 }
            ],
            [
                { table: "special_winter_skins", weight: 0.25 },
                { table: "winter_skins", weight: 0.25 },
                { item: NullString, weight: 1 }
            ]
        ],
        black_gift: [
            [
                { item: NullString, weight: 0.25 },
                { item: "deagle", weight: 0.5 },
                { item: "vks", weight: 0.25 }
            ],
            [
                { item: "coal", weight: 1 },
                { item: NullString, weight: 1 }
            ]
        ]
    },

    halloween: {
        ground_loot: [
            { table: "healing_items", weight: 1 },
            { table: "ammo", weight: 1 },
            { table: "guns", weight: 1 },
            { table: "equipment", weight: 0.6 },
            { table: "scopes", weight: 0.3 },
            { item: "deer_season", weight: 0.2 }
        ],
        regular_crate: [
            { table: "guns", weight: 1.25 },
            { table: "healing_items", weight: 1 },
            { table: "equipment", weight: 0.6 },
            { table: "ammo", weight: 0.5 },
            { table: "scopes", weight: 0.3 },
            { table: "throwables", weight: 0.3 },
            { item: "deer_season", weight: 0.2 },
            { table: "melee", weight: 0.04 }
        ],
        airdrop_crate: [
            [{ table: "airdrop_equipment", weight: 1 }],
            [{ table: "airdrop_scopes", weight: 1 }],
            [{ table: "airdrop_healing_items", weight: 1 }],
            [{ table: "airdrop_skins", weight: 1 }],
            [{ table: "airdrop_melee", weight: 1 }],
            [{ table: "ammo", weight: 1 }],
            [{ table: "airdrop_guns", weight: 1 }],
            [
                { table: "fall_perks", weight: 0.5 },
                { item: NullString, weight: 0.5 }
            ],
            [
                { item: "frag_grenade", count: 3, weight: 2 },
                { item: NullString, weight: 1 }
            ]
        ],
        gold_airdrop_crate: [
            [{ table: "airdrop_equipment", weight: 1 }],
            [{ table: "airdrop_scopes", weight: 1 }],
            [{ table: "airdrop_healing_items", weight: 1 }],
            [{ table: "airdrop_skins", weight: 1 }],
            [{ table: "airdrop_melee", weight: 1 }],
            [{ table: "ammo", weight: 1 }],
            [{ table: "gold_airdrop_guns", weight: 1 }],
            [{ table: "fall_perks", weight: 1 }],
            [{ item: "frag_grenade", count: 3, weight: 1 }]
        ],
        briefcase: [
            { item: "usas12", weight: 1 },
            { item: "mk18", weight: 0.2 },
            { item: "l115a1", weight: 0.2 },
            { item: "g19", weight: 0.0001 }
        ],
        ammo_crate: [
            [{ table: "ammo", weight: 1 }],
            [{ table: "ammo", weight: 1 }],
            [
                { item: NullString, weight: 1 },
                { item: "50cal", count: 20, weight: 0.7 },
                { item: "338lap", count: 6, weight: 0.2 },
                { item: "curadell", weight: 0.1 }
            ]
        ],
        loot_tree: [
            [
                { item: "m3k", weight: 1 },
                { item: "vepr12", weight: 0.2 },
                { item: "m590m", weight: 0.05 },
                { item: "usas12", weight: 0.005 }
            ],
            [{ item: "hatchet", weight: 1 }],
            [{ item: "lumberjack", weight: 1 }],
            [{ item: "regular_helmet", weight: 1 }],
            [{ item: "regular_pack", weight: 1 }],
            [{ item: "12g", count: 15, weight: 1 }]
        ],
        lux_crate: [
            [
                { item: "vks", weight: 1 },
                { item: "tango_51", weight: 1 }
            ],
            [{ table: "special_scopes", weight: 1 }]
        ],
        gold_rock: [
            [{ item: "tango_51", weight: 1 }],
            [{ table: "scopes", weight: 1 }]
        ],
        loot_barrel: [
            [{ item: "crowbar", weight: 1 }],
            [{ item: "sr25", weight: 1 }],
            [
                { table: "equipment", weight: 1 },
                { table: "scopes", weight: 1 },
                { table: "healing_items", weight: 1 }
            ]
        ],
        gun_locker: {
            min: 1,
            max: 2,
            loot: [
                // 65% chance for one of these
                { item: "model_37", weight: 0.13 },
                { item: "m3k", weight: 0.13 },
                { item: "cz600", weight: 0.13 },
                { item: "flues", weight: 0.13 },
                { item: "dual_m1895", weight: 0.13 },

                // 20% chance for one of these
                { item: "sr25", weight: 0.066 },
                { item: "mini14", weight: 0.066 },
                { item: "mosin_nagant", weight: 0.066 },

                // 10% chance for one of these
                { item: "rsh12", weight: 0.05 },
                { item: "vepr12", weight: 0.05 },

                // 5% chance for one of these
                { item: "tango_51", weight: 0.01 },
                { item: "m590m", weight: 0.01 },
                { item: "vks", weight: 0.01 },
                { item: "model_89", weight: 0.01 },
                { item: "m1_garand", weight: 0.01 }
            ]
        },

        guns: [
            // 50% chance for one of these
            { item: "m1895", weight: 0.166 },
            { item: "hp18", weight: 0.166 },
            { item: "sks", weight: 0.166 },

            // 30% chance for one of these
            { item: "dt11", weight: 0.15 },
            { item: "model_37", weight: 0.15 },

            // 14% chance for one of these
            { item: "m3k", weight: 0.035 },
            { item: "cz600", weight: 0.035 },
            { item: "flues", weight: 0.035 },
            { item: "dual_m1895", weight: 0.035 },

            // 4% chance for one of these
            { item: "sr25", weight: 0.0133 },
            { item: "mini14", weight: 0.0133 },
            { item: "mosin_nagant", weight: 0.0133 },

            // 2% chance for one of these
            { item: "tango_51", weight: 0.0066 },
            { item: "model_89", weight: 0.0066 },
            { item: "vepr12", weight: 0.0066 },

            // very rare shit
            { item: "rsh12", weight: 0.001 },
            { item: "m590m", weight: 0.001 },
            { item: "vks", weight: 0.001 },
            { item: "radio", weight: 0.001 }
        ],
        special_guns: [
            // 32% chance for one of these
            { item: "dt11", weight: 0.16 },
            { item: "model_37", weight: 0.16 },

            // 37% chance for one of these
            { item: "dual_m1895", weight: 0.0925 },
            { item: "m3k", weight: 0.0925 },
            { item: "cz600", weight: 0.0925 },
            { item: "flues", weight: 0.0925 },

            // 15% chance for one of these (L unlucky)
            { item: "sks", weight: 0.075 },
            { item: "hp18", weight: 0.075 },

            // 10% chance for one of these
            { item: "sr25", weight: 0.033 },
            { item: "mini14", weight: 0.033 },
            { item: "mosin_nagant", weight: 0.033 },

            // 5% chance for one of these
            { item: "tango_51", weight: 0.0166 },
            { item: "model_89", weight: 0.0166 },
            { item: "vepr12", weight: 0.0166 },

            // 1% chance for one of these
            { item: "m590m", weight: 0.002 },
            { item: "rsh12", weight: 0.002 },
            { item: "vks", weight: 0.002 },
            { item: "radio", weight: 0.002 },
            { item: "m1_garand", weight: 0.002 }
        ],
        airdrop_guns: [
            { item: "sr25", weight: 1.5 },
            { item: "m590m", weight: 1 },
            { item: "rsh12", weight: 1 },
            { item: "vepr12", weight: 1 },
            { item: "model_89", weight: 1 },
            { item: "vks", weight: 0.5 },
            { item: "tango_51", weight: 0.5 },
            { item: "m1_garand", weight: 0.2 },
            { item: "radio", weight: 0.1 }
        ],
        airdrop_skins: [
            { item: NullString, weight: 1 },
            { item: "diseased", weight: 0.2 },
            { item: "sky", weight: 0.7 },
            { item: "nebula", weight: 0.6 },
            { item: "ghillie_suit", weight: 0.1 },
            { item: "basic_outfit", weight: 0.001 }
        ],
        airdrop_scopes: [
            { item: "8x_scope", weight: 1 },
            { item: "15x_scope", weight: 0.005 }
        ],
        airdrop_melee: [
            { item: NullString, weight: 1 },
            { item: "hatchet", weight: 0.2 },
            { item: "kbar", weight: 0.2 },
            { item: "maul", weight: 0.1 }
        ],
        gold_airdrop_guns: [
            { item: "dual_rsh12", weight: 1 },
            { item: "usas12", weight: 1 },
            { item: "l115a1", weight: 1 },
            { item: "mk18", weight: 1 },
            { item: "m1_garand", weight: 0.5 },
            { item: "g19", weight: 0.0001 }
        ],
        viking_chest_guns: [
            // 35% chance for one of these
            { item: "m3k", weight: 0.1166 },
            { item: "cz600", weight: 0.1166 },
            { item: "flues", weight: 0.1166 },

            // 40% chance for one of these
            { item: "mini14", weight: 0.133 },
            { item: "sr25", weight: 0.133 },
            { item: "mosin_nagant", weight: 0.133 },

            // 10% chance for one of these
            { item: "m590m", weight: 0.033 },
            { item: "vepr12", weight: 0.033 },
            { item: "radio", weight: 0.033 },

            // 5% chance for one of these
            { item: "rsh12", weight: 0.01 },
            { item: "model_89", weight: 0.01 },
            { item: "vks", weight: 0.01 },
            { item: "tango_51", weight: 0.01 },
            { item: "m1_garand", weight: 0.01 }
        ],
        river_chest_guns: [
            // 60% chance for one of these
            { item: "m3k", weight: 0.2 },
            { item: "cz600", weight: 0.2 },
            { item: "flues", weight: 0.2 },

            // 20% chance for one of these
            { item: "mini14", weight: 0.066 },
            { item: "sr25", weight: 0.066 },
            { item: "mosin_nagant", weight: 0.066 },

            // 15% chance for one of these
            { item: "rsh12", weight: 0.03 },
            { item: "model_89", weight: 0.03 },
            { item: "vks", weight: 0.03 },
            { item: "tango_51", weight: 0.03 },
            { item: "m1_garand", weight: 0.03 },

            // 5% chance for one of these
            { item: "vepr12", weight: 0.0166 },
            { item: "m590m", weight: 0.0166 },
            { item: "radio", weight: 0.0166 },

            // 5% chance for one of these
            { item: "l115a1", weight: 0.025 },
            { item: "mk18", weight: 0.025 }
        ],
        ammo: [
            { item: "12g", count: 10, weight: 1 },
            { item: "556mm", count: 60, weight: 1 },
            { item: "762mm", count: 60, weight: 1 },
            { item: "50cal", count: 20, weight: 0.2 },
            { item: "338lap", count: 6, weight: 0.05 }
        ],
        throwables: [
            { item: "frag_grenade", count: 2, weight: 1 },
            { item: "smoke_grenade", count: 2, weight: 1 }
        ],
        equipment: [
            { item: "regular_helmet", weight: 1 },
            { item: "tactical_helmet", weight: 0.2 },

            { item: "regular_vest", weight: 1 },
            { item: "tactical_vest", weight: 0.2 },

            { item: "basic_pack", weight: 0.9 },
            { item: "regular_pack", weight: 0.2 },
            { item: "tactical_pack", weight: 0.07 }
        ],
        special_equipment: [
            { item: "regular_helmet", weight: 1 },
            { item: "tactical_helmet", weight: 0.35 },

            { item: "regular_vest", weight: 1 },
            { item: "tactical_vest", weight: 0.35 },

            { item: "basic_pack", weight: 0.8 },
            { item: "regular_pack", weight: 0.5 },
            { item: "tactical_pack", weight: 0.09 }
        ],
        scopes: [
            { item: "4x_scope", weight: 1 },
            { item: "8x_scope", weight: 0.1 },
            { item: "15x_scope", weight: 0.00025 }
        ],
        special_scopes: [
            { item: "4x_scope", weight: 1 },
            { item: "8x_scope", weight: 0.2 },
            { item: "15x_scope", weight: 0.0005 }
        ],
        melee: [
            { item: "hatchet", weight: 3 },
            { item: "kbar", weight: 2 },
            { item: "baseball_bat", weight: 2 },
            { item: "gas_can", weight: 0 } // somewhat hack in order to make the gas can obtainable through mini plumpkins
        ]
    },

    winter: {
        ammo_crate: [
            [{ table: "ammo", weight: 1 }],
            [{ table: "ammo", weight: 1 }],
            [
                { item: NullString, weight: 1 },
                { item: "firework_rocket", count: 3, weight: 0.5 },
                { item: "50cal", count: 20, weight: 0.7 },
                { item: "338lap", count: 6, weight: 0.2 },
                { item: "curadell", weight: 0.1 }
            ]
        ],

        airdrop_skins: [
            { item: NullString, weight: 1 },
            { item: "sky", weight: 0.5 },
            { item: "light_choco", weight: 0.7 },
            { item: "coal", weight: 1 },
            { item: "henrys_little_helper", weight: 1 },
            { item: "ghillie_suit", weight: 0.1 },
            { item: "basic_outfit", weight: 0.001 }
        ]
    },

    fall: {
        ground_loot: [
            { table: "healing_items", weight: 1 },
            { table: "ammo", weight: 1 },
            { table: "guns", weight: 1 },
            { table: "equipment", weight: 0.6 },
            { table: "scopes", weight: 0.3 },
            { item: "deer_season", weight: 0.2 }
        ],
        regular_crate: [
            { table: "guns", weight: 1.25 },
            { table: "healing_items", weight: 1 },
            { table: "equipment", weight: 0.6 },
            { table: "ammo", weight: 0.5 },
            { table: "scopes", weight: 0.3 },
            { table: "throwables", weight: 0.3 },
            { item: "deer_season", weight: 0.2 },
            { table: "melee", weight: 0.04 }
        ],
        airdrop_crate: [
            [{ table: "airdrop_equipment", weight: 1 }],
            [{ table: "airdrop_scopes", weight: 1 }],
            [{ table: "airdrop_healing_items", weight: 1 }],
            [{ table: "airdrop_skins", weight: 1 }],
            [{ table: "airdrop_melee", weight: 1 }],
            [{ table: "ammo", weight: 1 }],
            [{ table: "airdrop_guns", weight: 1 }],
            [
                { table: "fall_perks", weight: 0.5 },
                { item: NullString, weight: 0.5 }
            ],
            [
                { item: "frag_grenade", count: 3, weight: 2 },
                { item: NullString, weight: 1 }
            ]
        ],
        gold_airdrop_crate: [
            [{ table: "airdrop_equipment", weight: 1 }],
            [{ table: "airdrop_scopes", weight: 1 }],
            [{ table: "airdrop_healing_items", weight: 1 }],
            [{ table: "airdrop_skins", weight: 1 }],
            [{ table: "airdrop_melee", weight: 1 }],
            [{ table: "ammo", weight: 1 }],
            [{ table: "gold_airdrop_guns", weight: 1 }],
            [{ table: "fall_perks", weight: 1 }],
            [{ item: "frag_grenade", count: 3, weight: 1 }]
        ],
        briefcase: [
            { item: "usas12", weight: 1 },
            { item: "mk18", weight: 0.2 },
            { item: "l115a1", weight: 0.2 },
            { item: "g19", weight: 0.0001 }
        ],
        ammo_crate: [
            [{ table: "ammo", weight: 1 }],
            [{ table: "ammo", weight: 1 }],
            [
                { item: NullString, weight: 1 },
                { item: "50cal", count: 20, weight: 0.7 },
                { item: "338lap", count: 6, weight: 0.2 },
                { item: "curadell", weight: 0.1 }
            ]
        ],
        loot_tree: [
            [
                { item: "m3k", weight: 1 },
                { item: "vepr12", weight: 0.2 },
                { item: "m590m", weight: 0.05 },
                { item: "usas12", weight: 0.005 }
            ],
            [{ item: "hatchet", weight: 1 }],
            [{ item: "lumberjack", weight: 1 }],
            [{ item: "regular_helmet", weight: 1 }],
            [{ item: "regular_pack", weight: 1 }],
            [{ item: "12g", count: 15, weight: 1 }]
        ],
        lux_crate: [
            [
                { item: "vks", weight: 0.3 },
                { item: "tango_51", weight: 0.3 },
                { item: "rgs", weight: 0.3 },
                { item: "l115a1", weight: 0.1 }
            ],
            [{ table: "special_scopes", weight: 1 }]
        ],
        gold_rock: [
            [{ item: "tango_51", weight: 1 }],
            [{ table: "scopes", weight: 1 }]
        ],
        loot_barrel: [
            [{ item: "crowbar", weight: 1 }],
            [{ item: "sr25", weight: 1 }],
            [
                { table: "equipment", weight: 1 },
                { table: "scopes", weight: 1 },
                { table: "healing_items", weight: 1 }
            ]
        ],
        gun_locker: {
            min: 1,
            max: 2,
            loot: [
                // 65% chance for one of these
                { item: "model_37", weight: 0.1083 },
                { item: "m3k", weight: 0.1083 },
                { item: "cz600", weight: 0.1083 },
                { item: "flues", weight: 0.1083 },
                { item: "dual_m1895", weight: 0.1083 },
                { item: "blr", weight: 0.1083 },

                // 20% chance for one of these
                { item: "sr25", weight: 0.066 },
                { item: "mini14", weight: 0.066 },
                { item: "mosin_nagant", weight: 0.066 },

                // 10% chance for one of these
                { item: "rsh12", weight: 0.03 },
                { item: "vepr12", weight: 0.03 },
                { item: "rgs", weight: 0.03 },

                // 5% chance for one of these
                { item: "tango_51", weight: 0.01 },
                { item: "m590m", weight: 0.01 },
                { item: "vks", weight: 0.01 },
                { item: "model_89", weight: 0.01 },
                { item: "m1_garand", weight: 0.01 }
            ]
        },

        guns: [
            // 50% chance for one of these
            { item: "m1895", weight: 0.166 },
            { item: "hp18", weight: 0.166 },
            { item: "sks", weight: 0.166 },

            // 28% chance for one of these
            { item: "dt11", weight: 0.14 },
            { item: "model_37", weight: 0.14 },

            // 16% chance for one of these
            { item: "m3k", weight: 0.032 },
            { item: "cz600", weight: 0.032 },
            { item: "flues", weight: 0.032 },
            { item: "dual_m1895", weight: 0.032 },
            { item: "blr", weight: 0.032 },

            // 4% chance for one of these
            { item: "sr25", weight: 0.0133 },
            { item: "mini14", weight: 0.0133 },
            { item: "mosin_nagant", weight: 0.0133 },

            // 2% chance for one of these
            { item: "tango_51", weight: 0.0066 },
            { item: "model_89", weight: 0.0066 },
            { item: "vepr12", weight: 0.0066 },

            // very rare shit
            { item: "rsh12", weight: 0.001 },
            { item: "m590m", weight: 0.001 },
            { item: "vks", weight: 0.001 },
            { item: "radio", weight: 0.001 }
        ],
        special_guns: [
            // 32% chance for one of these
            { item: "dt11", weight: 0.16 },
            { item: "model_37", weight: 0.16 },

            // 37% chance for one of these
            { item: "dual_m1895", weight: 0.074 },
            { item: "m3k", weight: 0.074 },
            { item: "cz600", weight: 0.074 },
            { item: "flues", weight: 0.074 },
            { item: "blr", weight: 0.074 },

            // 15% chance for one of these (L unlucky)
            { item: "sks", weight: 0.075 },
            { item: "hp18", weight: 0.075 },

            // 10% chance for one of these
            { item: "sr25", weight: 0.033 },
            { item: "mini14", weight: 0.033 },
            { item: "mosin_nagant", weight: 0.033 },

            // 5% chance for one of these
            { item: "tango_51", weight: 0.0166 },
            { item: "model_89", weight: 0.0166 },
            { item: "vepr12", weight: 0.0166 },

            // 1% chance for one of these
            { item: "m590m", weight: 0.002 },
            { item: "rsh12", weight: 0.002 },
            { item: "vks", weight: 0.002 },
            { item: "radio", weight: 0.002 },
            { item: "m1_garand", weight: 0.002 }
        ],
        airdrop_guns: [
            { item: "sr25", weight: 1.5 },
            { item: "m590m", weight: 1 },
            { item: "rsh12", weight: 1 },
            { item: "vepr12", weight: 1 },
            { item: "model_89", weight: 1 },
            { item: "rgs", weight: 1 },
            { item: "vks", weight: 0.5 },
            { item: "tango_51", weight: 0.5 },
            { item: "m1_garand", weight: 0.2 },
            { item: "radio", weight: 0.1 }
        ],
        airdrop_skins: [
            { item: NullString, weight: 1 },
            { item: "diseased", weight: 0.2 },
            { item: "sky", weight: 0.7 },
            { item: "nebula", weight: 0.6 },
            { item: "ghillie_suit", weight: 0.1 },
            { item: "basic_outfit", weight: 0.001 }
        ],
        airdrop_scopes: [
            { item: "8x_scope", weight: 1 },
            { item: "15x_scope", weight: 0.005 }
        ],
        airdrop_melee: [
            { item: NullString, weight: 1 },
            { item: "hatchet", weight: 0.2 },
            { item: "kbar", weight: 0.2 },
            { item: "maul", weight: 0.1 }
        ],
        gold_airdrop_guns: [
            { item: "dual_rsh12", weight: 1 },
            { item: "usas12", weight: 1 },
            { item: "l115a1", weight: 1 },
            { item: "mk18", weight: 1 },
            { item: "m1_garand", weight: 0.5 },
            { item: "g19", weight: 0.0001 }
        ],
        viking_chest_guns: [
            // 35% chance for one of these
            { item: "m3k", weight: 0.1166 },
            { item: "cz600", weight: 0.1166 },
            { item: "flues", weight: 0.1166 },

            // 40% chance for one of these
            { item: "mini14", weight: 0.1 },
            { item: "sr25", weight: 0.1 },
            { item: "mosin_nagant", weight: 0.1 },
            { item: "rgs", weight: 0.1 },

            // 10% chance for one of these
            { item: "m590m", weight: 0.033 },
            { item: "vepr12", weight: 0.033 },
            { item: "radio", weight: 0.033 },

            // 5% chance for one of these
            { item: "rsh12", weight: 0.01 },
            { item: "model_89", weight: 0.01 },
            { item: "vks", weight: 0.01 },
            { item: "tango_51", weight: 0.01 },
            { item: "m1_garand", weight: 0.01 }
        ],
        river_chest_guns: [
            // 60% chance for one of these
            { item: "m3k", weight: 0.2 },
            { item: "cz600", weight: 0.2 },
            { item: "flues", weight: 0.2 },

            // 20% chance for one of these
            { item: "mini14", weight: 0.05 },
            { item: "sr25", weight: 0.05 },
            { item: "mosin_nagant", weight: 0.05 },
            { item: "rgs", weight: 0.05 },

            // 15% chance for one of these
            { item: "rsh12", weight: 0.03 },
            { item: "model_89", weight: 0.03 },
            { item: "vks", weight: 0.03 },
            { item: "tango_51", weight: 0.03 },
            { item: "m1_garand", weight: 0.03 },

            // 5% chance for one of these
            { item: "vepr12", weight: 0.0166 },
            { item: "m590m", weight: 0.0166 },
            { item: "radio", weight: 0.0166 },

            // 5% chance for one of these
            { item: "l115a1", weight: 0.025 },
            { item: "mk18", weight: 0.025 }
        ],
        ammo: [
            { item: "12g", count: 10, weight: 1 },
            { item: "556mm", count: 60, weight: 1 },
            { item: "762mm", count: 60, weight: 1 },
            { item: "50cal", count: 20, weight: 0.2 },
            { item: "338lap", count: 6, weight: 0.05 }
        ],
        throwables: [
            { item: "frag_grenade", count: 2, weight: 1 },
            { item: "smoke_grenade", count: 2, weight: 1 }
        ],
        equipment: [
            { item: "regular_helmet", weight: 1 },
            { item: "tactical_helmet", weight: 0.2 },

            { item: "regular_vest", weight: 1 },
            { item: "tactical_vest", weight: 0.2 },

            { item: "basic_pack", weight: 0.9 },
            { item: "regular_pack", weight: 0.2 },
            { item: "tactical_pack", weight: 0.07 }
        ],
        special_equipment: [
            { item: "regular_helmet", weight: 1 },
            { item: "tactical_helmet", weight: 0.35 },

            { item: "regular_vest", weight: 1 },
            { item: "tactical_vest", weight: 0.35 },

            { item: "basic_pack", weight: 0.8 },
            { item: "regular_pack", weight: 0.5 },
            { item: "tactical_pack", weight: 0.09 }
        ],
        scopes: [
            { item: "4x_scope", weight: 1 },
            { item: "8x_scope", weight: 0.1 },
            { item: "15x_scope", weight: 0.00025 }
        ],
        special_scopes: [
            { item: "4x_scope", weight: 1 },
            { item: "8x_scope", weight: 0.2 },
            { item: "15x_scope", weight: 0.0005 }
        ],
        melee: [
            { item: "hatchet", weight: 3 },
            { item: "kbar", weight: 2 },
            { item: "baseball_bat", weight: 2 },
            { item: "gas_can", weight: 0 } // somewhat hack in order to make the gas can obtainable through mini plumpkins
        ]
    }
};

// either return a reference as-is, or take all the non-null string references
const referenceOrRandomOptions = <T extends ObjectDefinition>(obj: ReferenceOrRandom<T>): Array<ReferenceTo<T>> => {
    return typeof obj === "string"
        ? [obj]
        // well, Object.keys already filters out symbols so…
        : Object.keys(obj)/* .filter(k => k !== NullString) */;
};

type SpawnableItemRegistry = ReadonlySet<ReferenceTo<LootDefinition>> & {
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

type Cache = {
    [K in ItemType]?: Array<LootDefForType<K>> | undefined;
};

// an array is just an object with numeric keys
const spawnableItemTypeCache = [] as Cache;

// has to lazy-loaded to avoid circular dependency issues
let spawnableLoots: SpawnableItemRegistry | undefined = undefined;
export const SpawnableLoots = (): SpawnableItemRegistry => spawnableLoots ??= (() => {
    /*
        we have a collection of loot tables, but not all of them are necessarily reachable
        for example, if loot table A belongs to obstacle A, but said obstacle is never spawned,
        then we mustn't take loot table A into account
    */

    const mainMap = Maps[GameConstants.modeName as keyof typeof Maps];

    // first, get all the reachable buildings
    // to do this, we get all the buildings in the map def, then for each one, include itself and any subbuildings
    // flatten that array, and that's the reachable buildings
    // and for good measure, we exclude duplicates by using a set
    const reachableBuildings = [
        ...new Set(
            Object.keys(mainMap.buildings ?? {}).map(building => {
                const b = Buildings.fromString(building);

                // for each subbuilding, we either take it as-is, or take all possible spawn options
                return b.subBuildings.map(
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
            Object.keys(mainMap.obstacles ?? {}).map(o => Obstacles.fromString(o)).concat(
                reachableBuildings.map(
                    ({ obstacles }) => obstacles.map(
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
            Object.keys(mainMap.loots ?? {}).map(t => resolveTable(t)).concat(
                reachableObstacles.filter(({ hasLoot }) => hasLoot).map(
                    ({ lootTable, idString }) => resolveTable(lootTable ?? idString)
                )
            ).concat(
                reachableBuildings.map(
                    ({ lootSpawners }) => lootSpawners.map(({ table }) => resolveTable(table))
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
            .map(entry => "item" in entry ? entry.item : getAllItemsFromTable(resolveTable(entry.table)))
            .filter(item => item !== NullString)
            .flat();

    // and now we go get the spawnable loots
    const spawnableLoots: ReadonlySet<ReferenceTo<LootDefinition>> = new Set<ReferenceTo<LootDefinition>>(
        reachableLootTables.map(getAllItemsFromTable).flat()
    );

    (spawnableLoots as SpawnableItemRegistry).forType = <K extends ItemType>(type: K): ReadonlyArray<LootDefForType<K>> => {
        return (
            (
                // without this seemingly useless assertion, assignability errors occur
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                spawnableItemTypeCache[type] as Array<LootDefForType<K>> | undefined
            ) ??= itemTypeToCollection[type].definitions.filter(({ idString }) => spawnableLoots.has(idString))
        );
    };

    return spawnableLoots as SpawnableItemRegistry;
})();
