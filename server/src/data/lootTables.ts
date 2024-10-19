import { GameConstants } from "@common/constants";
import { Ammos, Armors, Backpacks, Guns, HealingItems, Melees, Scopes, Skins, Throwables } from "@common/definitions";
import { Loots, type LootDefForType, type LootDefinition } from "@common/definitions/loots";
import { PerkIds, Perks } from "@common/definitions/perks";
import { ItemType, NullString, type ObjectDefinitions, type ReferenceTo } from "@common/utils/objectDefinitions";
import { random, weightedRandom } from "@common/utils/random";

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

export type SimpleLootTable = ReadonlyArray<WeightedItem | readonly WeightedItem[]>;

export type FullLootTable = {
    readonly min: number
    readonly max: number
    readonly loot: readonly WeightedItem[]
};

export type LootTable = SimpleLootTable | FullLootTable;

export class LootItem {
    constructor(
        public readonly idString: ReferenceTo<LootDefinition>,
        public readonly count: number
    ) {}
}

export function getLootFromTable(tableID: string): LootItem[] {
    const lootTable = LootTables[GameConstants.modeName][tableID] ?? LootTables.normal[tableID];
    if (lootTable === undefined) {
        throw new ReferenceError(`Unknown loot table: ${tableID}`);
    }

    const isSimple = Array.isArray(lootTable);
    const { min, max, loot } = isSimple
        ? { min: 1, max: 1, loot: lootTable }
        : lootTable as FullLootTable;

    return (
        isSimple && Array.isArray(loot[0])
            ? loot.map(innerTable => getLoot(innerTable as WeightedItem[]))
            : Array.from(
                { length: random(min, max) },
                () => getLoot(loot as WeightedItem[])
            )
    ).flat();
}

function getLoot(table: WeightedItem[]): LootItem[] {
    const selection = table.length === 1
        ? table[0]
        : weightedRandom(table, table.map(({ weight }) => weight));

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
            [{ item: "cz600", weight: 1 }],
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
        plumpkin: {
            min: 3,
            max: 3,
            loot: [
                { table: "normal_perks", weight: 1 }
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
                { item: "tango_51", weight: 0.05 }
            ]
        },
        ammo_crate: [
            { table: "ammo", weight: 1 },
            { item: "50cal", count: 20, weight: 0.3 },
            { item: "338lap", count: 6, weight: 0.1 },
            { item: "curadell", weight: 0.1 }
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
            { item: "vss", weight: 0.02 },
            { item: "mg36", weight: 0.015 },
            { item: "sr25", weight: 0.01 },
            { item: "mini14", weight: 0.01 },
            { item: "mcx_spear", weight: 0.01 },
            { item: "cz600", weight: 0.008 },
            { item: "vepr12", weight: 0.008 },
            { item: "stoner_63", weight: 0.005 },
            { item: "radio", weight: 0.005 },
            { item: "mosin_nagant", weight: 0.005 },
            { item: "vector", weight: 0.004 },
            { item: "deagle", weight: 0.004 },
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
            { item: "vss", weight: 0.07 },
            { item: "mg36", weight: 0.06 },
            { item: "sr25", weight: 0.05 },
            { item: "mini14", weight: 0.05 },
            { item: "mcx_spear", weight: 0.05 },
            { item: "vepr12", weight: 0.04 },
            { item: "cz600", weight: 0.03 },
            { item: "stoner_63", weight: 0.01 },
            { item: "radio", weight: 0.01 },
            { item: "mosin_nagant", weight: 0.01 },
            { item: "vector", weight: 0.008 },
            { item: "deagle", weight: 0.008 },
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
            { item: "mini14", weight: 1 },
            { item: "sr25", weight: 1 },
            { item: "vss", weight: 1 },
            { item: "vector", weight: 1 },
            { item: "vepr12", weight: 1 },
            { item: "deagle", weight: 1 },
            { item: "cz600", weight: 1 },
            { item: "mcx_spear", weight: 0.95 },
            { item: "model_89", weight: 0.95 },
            { item: "mosin_nagant", weight: 0.95 },
            { item: "tango_51", weight: 0.9 },
            { item: "stoner_63", weight: 0.9 },
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
            { item: "henrys_little_helper", weight: 1 },
            { item: "candy_cane", weight: 1 }
        ],
        special_winter_skins: [
            { item: "christmas_tree", weight: 1 },
            { item: "gingerbread", weight: 1 }
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
        normal_perks: [
            { item: PerkIds.InfiniteAmmo, weight: 1 },
            { item: PerkIds.HiCap, weight: 1 },
            { item: PerkIds.Splinter, weight: 1 },
            { item: PerkIds.DemoExpert, weight: 1 },
            { item: PerkIds.SecondWind, weight: 1 },
            { item: PerkIds.FieldMedic, weight: 1 },
            { item: PerkIds.Sabot, weight: 1 },
            { item: PerkIds.AdvancedAthletics, weight: 1 },
            { item: PerkIds.Toploaded, weight: 1 },
            { item: PerkIds.CloseQuartersCombat, weight: 1 },
            { item: PerkIds.LowProfile, weight: 1 },
            { item: PerkIds.Splinter, weight: 1 },
            { item: PerkIds.Berserker, weight: 1 }
        ]
    },

    fall: {
        briefcase: [
            { item: "usas12", weight: 1 },
            { item: "mk18", weight: 0.2 },
            { item: "l115a1", weight: 0.2 },
            { item: "g19", weight: 0.0001 }
        ],
        gun_locker: {
            min: 1,
            max: 2,
            loot: [
                { item: "m3k", weight: 1 },
                { item: "model_37", weight: 1 },
                { item: "cz600", weight: 0.8 },
                { item: "flues", weight: 0.6 },
                { item: "sr25", weight: 0.4 },
                { item: "mini14", weight: 0.4 },
                { item: "mosin_nagant", weight: 0.4 },
                { item: "vepr12", weight: 0.2 },
                { item: "tango_51", weight: 0.1 },
                { item: "rsh12", weight: 0.25 },
                { item: "vks", weight: 0.25 },
                { item: "model_89", weight: 0.25 },
                { item: "m1_garand", weight: 0.1 }
            ]
        },

        guns: [
            { item: "m1895", weight: 1 },
            { item: "hp18", weight: 1 },
            { item: "sks", weight: 1 },
            { item: "model_37", weight: 0.8 },
            { item: "dt11", weight: 0.8 },
            { item: "dual_m1895", weight: 0.5 },
            { item: "m3k", weight: 0.5 },
            { item: "cz600", weight: 0.5 },
            { item: "flues", weight: 0.4 },
            { item: "sr25", weight: 0.1  },
            { item: "mini14", weight: 0.1 },
            { item: "mosin_nagant", weight: 0.1 },
            { item: "m590m", weight: 0.05 },
            { item: "vepr12", weight: 0.05 },
            { item: "rsh12", weight: 0.02 },
            { item: "tango_51", weight: 0.02 },
            { item: "vks", weight: 0.02 },
            { item: "model_89", weight: 0.02 }
        ],
        special_guns: [
            { item: "model_37", weight: 0.8  },
            { item: "dt11", weight: 0.8 },
            { item: "m3k", weight: 0.7 },
            { item: "dual_m1895", weight: 0.7 },
            { item: "cz600", weight: 0.7 },
            { item: "sks", weight: 0.7 },
            { item: "hp18", weight: 0.5 },
            { item: "flues", weight: 0.5 },
            { item: "sr25", weight: 0.3 },
            { item: "mini14", weight: 0.3 },
            { item: "mosin_nagant", weight: 0.3 },
            { item: "m590m", weight: 0.2 },
            { item: "model_89", weight: 0.1 },
            { item: "vepr12", weight: 0.1 },
            { item: "tango_51", weight: 0.1 },
            { item: "vks", weight: 0.05 },
            { item: "m1_garand", weight: 0.05 },
            { item: "rsh12", weight: 0.05 },
            { item: "radio", weight: 0.05 }
        ],
        airdrop_guns: [
            { item: "mini14", weight: 1.5 },
            { item: "sr25", weight: 1.5 },
            { item: "mosin_nagant", weight: 1.5 },
            { item: "m590m", weight: 1.2 },
            { item: "rsh12", weight: 1 },
            { item: "vepr12", weight: 1 },
            { item: "model_89", weight: 1 },
            { item: "vks", weight: 0.7 },
            { item: "tango_51", weight: 0.3 },
            { item: "m1_garand", weight: 0.2 },
            { item: "radio", weight: 0.1 }
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
            { item: "m3k", weight: 1 },
            { item: "cz600", weight: 1 },
            { item: "mini14", weight: 0.75 },
            { item: "sr25", weight: 0.75 },
            { item: "flues", weight: 0.7 },
            { item: "mosin_nagant", weight: 0.6 },
            { item: "vepr12", weight: 0.5 },
            { item: "rsh12", weight: 0.5 },
            { item: "model_89", weight: 0.5 },
            { item: "vks", weight: 0.1 },
            { item: "tango_51", weight: 0.1 },
            { item: "radio", weight: 0.1 },
            { item: "m1_garand", weight: 0.05 }
        ],
        river_chest_guns: [
            { item: "m3k", weight: 1 },
            { item: "cz600", weight: 1 },
            { item: "model_89", weight: 0.8 },
            { item: "mini14", weight: 0.8 },
            { item: "sr25", weight: 0.8 },
            { item: "vepr12", weight: 0.5 },
            { item: "rsh12", weight: 0.5 },
            { item: "vks", weight: 0.3 },
            { item: "tango_51", weight: 0.3 },
            { item: "m1_garand", weight: 0.1 },
            { item: "radio", weight: 0.1 },
            { item: "l115a1", weight: 0.05 },
            { item: "mk18", weight: 0.05 }
        ],
        ammo: [
            { item: "12g", count: 10, weight: 1 },
            { item: "556mm", count: 60, weight: 1 },
            { item: "762mm", count: 60, weight: 1 },
            { item: "50cal", count: 20, weight: 0.5 }
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
            { item: "baseball_bat", weight: 2 }
        ]
    }
};

const spawnableLoots: ReadonlySet<ReferenceTo<LootDefinition>> = new Set<ReferenceTo<LootDefinition>>(
    Object.values(
        Object.assign(
            {},
            LootTables.normal,
            LootTables[GameConstants.modeName] ?? {}
        )
    ).map(table =>
        (
            Array.isArray(table)
                ? table as SimpleLootTable
                : (table as FullLootTable).loot
        )
            .flat()
            .map(entry => "item" in entry ? entry.item : NullString)
            // we don't need to follow indirection from table references because
            // any table reference is also in the list somewhere
            .filter(item => item !== NullString)
    ).flat()
);

export const SpawnableLoots = (() => {
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

    const spawnableItemTypeCache: {
        [K in ItemType]?: Array<LootDefForType<K>>
    } = {};

    (spawnableLoots as SpawnableItemRegistry).forType = <K extends ItemType>(type: K): ReadonlyArray<LootDefForType<K>> => {
        return (
            // without this seemingly useless assertion, assignability error occur
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            spawnableItemTypeCache[type] as Array<LootDefForType<K>> | undefined
        ) ??= itemTypeToCollection[type].definitions.filter(({ idString }) => spawnableLoots.has(idString));
    };

    return spawnableLoots as SpawnableItemRegistry;
})();

export const SpawnableGuns = SpawnableLoots.forType(ItemType.Gun);
export const SpawnableMelees = SpawnableLoots.forType(ItemType.Melee);
