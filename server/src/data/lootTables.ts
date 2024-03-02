import { type LootDefinition } from "../../../common/src/definitions/loots";
import { type ReferenceTo } from "../../../common/src/utils/objectDefinitions";

export type WeightedItem =
    (
        { readonly item: ReferenceTo<LootDefinition> | null } |
        { readonly tier: string }
    ) &
    {
        readonly count?: number
        readonly spawnSeparately?: boolean
        readonly weight: number
    };

export interface LootTable {
    readonly min: number
    readonly max: number
    readonly loot: WeightedItem[] | WeightedItem[][]
}

// TODO Refactor loot table system
export const LootTables: Record<string, LootTable> = {
    ground_loot: {
        min: 1,
        max: 1,
        loot: [
            { tier: "equipment", weight: 1 },
            { tier: "healing_items", weight: 1 },
            { tier: "ammo", weight: 1 },
            { tier: "guns", weight: 0.9 },
            { tier: "scopes", weight: 0.3 }
        ]
    },
    regular_crate: {
        min: 1,
        max: 1,
        loot: [
            { tier: "guns", weight: 1.25 },
            { tier: "equipment", weight: 1 },
            { tier: "healing_items", weight: 1 },
            { tier: "ammo", weight: 0.5 },
            { tier: "scopes", weight: 0.3 },
            // { tier: "winter_skins", weight: 0.4 }, // winter mode
            { tier: "throwables", weight: 0.3 },
            { tier: "melee", weight: 0.04 }
        ]
    },
    viking_chest: {
        min: 1,
        max: 1,
        loot: [
            [
                { item: "seax", weight: 1 }
            ],
            [
                { tier: "viking_chest_guns", weight: 1 }
            ],
            [
                { tier: "viking_chest_guns", weight: 1 }
            ],
            [
                { tier: "special_equipment", weight: 0.65 },
                { tier: "viking_chest_guns", weight: 0.5 },
                { tier: "special_scopes", weight: 0.3 }
            ],
            [
                { tier: "special_equipment", weight: 0.65 },
                { tier: "special_scopes", weight: 0.3 }
            ]
        ]
    },
    river_chest: {
        min: 1,
        max: 1,
        loot: [
            [
                { tier: "river_chest_guns", weight: 1 }
            ],
            [
                { tier: "river_chest_guns", weight: 1 }
            ],
            [
                { tier: "special_equipment", weight: 0.65 },
                { tier: "river_chest_guns", weight: 0.5 },
                { tier: "special_scopes", weight: 0.3 }
            ],
            [
                { tier: "special_equipment", weight: 0.65 },
                { tier: "special_scopes", weight: 0.3 }
            ]
        ]
    },
    aegis_crate: {
        min: 3,
        max: 5,
        loot: [
            { tier: "special_guns", weight: 1 },
            { tier: "special_healing_items", weight: 0.15 },
            { tier: "special_equipment", weight: 0.65 },
            { tier: "special_scopes", weight: 0.3 }
        ]
    },
    flint_crate: {
        min: 3,
        max: 5,
        loot: [
            { tier: "special_guns", weight: 1 },
            { tier: "special_equipment", weight: 0.65 },
            { tier: "special_healing_items", weight: 0.15 },
            { tier: "special_scopes", weight: 0.3 }
        ]
    },
    grenade_box: {
        min: 1,
        max: 1,
        loot: [
            { item: "frag_grenade", weight: 1 },
            { item: "smoke_grenade", weight: 1 }
        ]
    },
    melee_crate: {
        min: 2,
        max: 2,
        loot: [
            { tier: "melee", weight: 1 }
        ]
    },
    grenade_crate: {
        min: 3,
        max: 4,
        loot: [
            { tier: "throwables", weight: 1 }
        ]
    },
    tango_crate: {
        min: 1,
        max: 1,
        loot: [
            [
                { item: "4x_scope", weight: 1 },
                { item: "8x_scope", weight: 0.1 },
                { item: "15x_scope", weight: 0.0025 }
            ],
            [
                { item: "tango_51", spawnSeparately: true, weight: 60 },
                { item: "tango_51", spawnSeparately: true, count: 2, weight: 30 },
                { item: "tango_51", spawnSeparately: true, count: 3, weight: 3.5 },
                { item: "tango_51", spawnSeparately: true, count: 4, weight: 0.1 },
                { item: "tango_51", spawnSeparately: true, count: 5, weight: 0.0000001 }
            ]
        ]
    },
    lux_crate: {
        min: 1,
        max: 1,
        loot: [
            [
                { item: "cz600", weight: 1 }
            ],
            [
                { tier: "scopes", weight: 1 }
            ]
        ]
    },
    gold_rock: {
        min: 1,
        max: 1,
        loot: [
            { item: "mosin", weight: 1 }
        ]
    },
    pumpkin: {
        min: 1,
        max: 1,
        loot: [
            { item: "s_g17", weight: 0.95 },
            { item: "usas12", weight: 0.05 }
        ]
    },
    blueberry_bush: {
        min: 1,
        max: 1,
        loot: [
            { tier: "special_equipment", weight: 1 },
            { tier: "healing_items", weight: 1 },
            { tier: "scopes", weight: 1 }
        ]
    },
    warehouse: {
        min: 1,
        max: 1,
        loot: [
            { tier: "special_guns", weight: 1 },
            { tier: "special_scopes", weight: 0.25 },
            { tier: "special_equipment", weight: 0.65 }
        ]
    },
    large_drawer: {
        min: 1,
        max: 1,
        loot: [
            { tier: "guns", weight: 1 },
            { tier: "equipment", weight: 0.65 },
            { tier: "scopes", weight: 0.3 }
        ]
    },
    small_drawer: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1 },
            { tier: "healing_items", weight: 0.8 },
            { tier: "guns", weight: 0.3 }
        ]
    },
    small_table: {
        min: 1,
        max: 1,
        loot: [
            { tier: "healing_items", weight: 1 },
            { tier: "ammo", weight: 1 }
        ]
    },
    box: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1.2 },
            { tier: "healing_items", weight: 1 },
            { tier: "equipment", weight: 1 },
            { tier: "guns", weight: 0.5 },
            { tier: "scopes", weight: 0.3 }
        ]
    },
    bookshelf: {
        min: 1,
        max: 2,
        loot: [
            { tier: "equipment", weight: 1.1 },
            { tier: "scopes", weight: 0.4 },
            { tier: "guns", weight: 1 },
            { tier: "healing_items", weight: 0.6 }
        ]
    },
    fridge: {
        min: 2,
        max: 3,
        loot: [
            { item: "cola", weight: 1 }
        ]
    },
    washing_machine: {
        min: 1,
        max: 1,
        loot: [
            { item: "verified", weight: 2 },
            { item: "nokilpls", weight: 1 }
        ]
    },
    toilet: {
        min: 2,
        max: 3,
        loot: [
            { tier: "healing_items", weight: 3 },
            { tier: "scopes", weight: 0.1 },
            { tier: "guns", weight: 0.05 }
        ]
    },
    used_toilet: {
        min: 2,
        max: 3,
        loot: [
            { tier: "guns", weight: 1.25 },
            { tier: "equipment", weight: 1 },
            { tier: "scopes", weight: 0.35 },
            { tier: "special_guns", weight: 0.8 },
            { tier: "healing_items", weight: 0.75 }
        ]
    },
    porta_potty_toilet_open: {
        min: 2,
        max: 3,
        loot: [
            { tier: "guns", weight: 1.25 },
            { tier: "healing_items", weight: 1 },
            { tier: "equipment", weight: 0.9 },
            { tier: "special_guns", weight: 0.8 },
            { tier: "special_scopes", weight: 0.35 }
        ]
    },
    porta_potty_toilet_closed: {
        min: 2,
        max: 3,
        loot: [
            { tier: "healing_items", weight: 3 },
            { tier: "scopes", weight: 0.1 },
            { tier: "guns", weight: 0.05 }
        ]
    },
    gun_mount_mcx_spear: {
        min: 1,
        max: 1,
        loot: [
            { item: "mcx_spear", weight: 1 }
        ]
    },
    gun_mount_stoner_63: {
        min: 1,
        max: 1,
        loot: [
            { item: "stoner_63", weight: 1 }
        ]
    },
    gun_mount_maul: {
        min: 1,
        max: 1,
        loot: [
            { item: "maul", weight: 1 }
        ]
    },
    gas_can: {
        min: 1,
        max: 1,
        loot: [
            { item: "gas_can", weight: 1 }
        ]
    },
    airdrop_crate: {
        min: 1,
        max: 1,
        loot: [
            [
                { tier: "airdrop_equipment", weight: 1 }
            ],
            [
                { tier: "airdrop_scopes", weight: 1 }
            ],
            [
                { tier: "airdrop_healing_items", weight: 1 }
            ],
            [
                { tier: "airdrop_skins", weight: 1 }
            ],
            [
                { tier: "airdrop_melee", weight: 1 }
            ],
            [
                { tier: "ammo", weight: 1 }
            ],
            [
                { tier: "airdrop_guns", weight: 1 }
            ],
            [
                { item: "frag_grenade", count: 3, weight: 2 },
                { item: null, weight: 1 }
            ]
        ]
    },
    gold_airdrop_crate: {
        min: 1,
        max: 1,
        loot: [
            [
                { tier: "airdrop_equipment", weight: 1 }
            ],
            [
                { tier: "airdrop_scopes", weight: 1 }
            ],
            [
                { tier: "airdrop_healing_items", weight: 1 }
            ],
            [
                { tier: "airdrop_skins", weight: 1 }
            ],
            [
                { tier: "airdrop_melee", weight: 1 }
            ],
            [
                { tier: "ammo", weight: 1 }
            ],
            [
                { tier: "gold_airdrop_guns", weight: 1 }
            ],
            [
                { item: "frag_grenade", count: 3, weight: 1 }
            ]
        ]
    },
    flint_stone: {
        min: 1,
        max: 1,
        loot: [
            { tier: "gold_airdrop_guns", weight: 1 }
        ]
    },
    christmas_tree: {
        min: 4,
        max: 5,
        loot: [
            { tier: "special_winter_skins", weight: 1 },
            { tier: "special_guns", weight: 1 },
            { tier: "special_equipment", weight: 0.65 },
            { tier: "special_healing_items", weight: 0.65 },
            { tier: "special_scopes", weight: 0.3 },
            { item: "radio", weight: 0.1 }
        ]
    },
    gun_case: {
        min: 1,
        max: 2,
        loot: [
            { tier: "special_guns", weight: 1 }
        ]
    },
    ammo_crate: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1 },
            { item: "127mm", weight: 0.1 },
            { item: "curadell", weight: 0.1 }
        ]
    },
    cabinet: {
        min: 1,
        max: 1,
        loot: [
            { tier: "special_guns", weight: 1 },
            { tier: "special_healing_items", weight: 0.65 },
            { tier: "special_equipment", weight: 0.65 },
            { tier: "special_scopes", weight: 0.3 }
        ]
    },
    briefcase: {
        min: 1,
        max: 1,
        loot: [
            { item: "vector", weight: 3 },
            { item: "arx160", weight: 1 },
            { item: "vepr12", weight: 1 },
            { item: "g19", weight: 0.05 }
        ]
    },
    mobile_home_sink: {
        min: 1,
        max: 1,
        loot: [
            { tier: "healing_items", weight: 1.2 },
            { tier: "ammo", weight: 1 }
        ]
    },
    sea_traffic_control_floor: {
        min: 1,
        max: 1,
        loot: [
            { item: "radio", weight: 1 }
        ]
    }
};

export const LootTiers: Record<string, WeightedItem[]> = {
    guns: [
        { item: "g19", weight: 2 },
        { item: "m1895", weight: 1.75 },
        { item: "mp40", weight: 1.7 },
        { item: "saf_200", weight: 1.5 },
        { item: "cz75a", weight: 1.5 },
        { item: "hp18", weight: 1.25 },
        { item: "micro_uzi", weight: 1 },
        { item: "ak47", weight: 1 },
        { item: "model_37", weight: 0.95 },
        { item: "aug", weight: 0.7 },
        { item: "m3k", weight: 0.3 },
        { item: "m16a4", weight: 0.1 },
        { item: "arx160", weight: 0.1 },
        { item: "flues", weight: 0.1 },
        { item: "lewis_gun", weight: 0.05 },
        { item: "vss", weight: 0.02 },
        { item: "sr25", weight: 0.01 },
        { item: "mini14", weight: 0.01 },
        { item: "mcx_spear", weight: 0.01 },
        { item: "cz600", weight: 0.008 },
        { item: "vepr12", weight: 0.008 },
        { item: "stoner_63", weight: 0.005 },
        { item: "radio", weight: 0.005 },
        { item: "mosin", weight: 0.005 },
        { item: "vector", weight: 0.004 },
        { item: "tango_51", weight: 0.002 }
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
        { item: "9mm", count: 60, weight: 1 }
    ],
    throwables: [
        { item: "frag_grenade", count: 2, weight: 1 },
        { item: "smoke_grenade", count: 2, weight: 1 }
    ],
    special_guns: [
        { item: "micro_uzi", weight: 1.25 },
        { item: "ak47", weight: 1.1 },
        { item: "aug", weight: 1.05 },
        { item: "hp18", weight: 1 },
        { item: "mp40", weight: 1 },
        { item: "model_37", weight: 1 },
        { item: "m3k", weight: 0.8 },
        { item: "arx160", weight: 0.8 },
        { item: "flues", weight: 0.8 },
        { item: "saf_200", weight: 0.75 },
        { item: "cz75a", weight: 0.75 },
        { item: "m16a4", weight: 0.5 },
        { item: "lewis_gun", weight: 0.5 },
        { item: "g19", weight: 0.45 },
        { item: "m1895", weight: 0.45 },
        { item: "vss", weight: 0.07 },
        { item: "sr25", weight: 0.05 },
        { item: "mini14", weight: 0.05 },
        { item: "mcx_spear", weight: 0.05 },
        { item: "vepr12", weight: 0.04 },
        { item: "cz600", weight: 0.03 },
        { item: "stoner_63", weight: 0.01 },
        { item: "radio", weight: 0.01 },
        { item: "mosin", weight: 0.01 },
        { item: "vector", weight: 0.008 },
        { item: "tango_51", weight: 0.004 }
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
        { item: "baseball_bat", weight: 4 },
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
        { item: null, weight: 1 },
        { item: "stardust", weight: 0.5 },
        { item: "aurora", weight: 0.5 },
        { item: "ghillie_suit", weight: 0.1 },
        { item: "basic_outfit", weight: 0.001 }
    ],
    airdrop_melee: [
        { item: null, weight: 1 },
        { item: "kbar", weight: 0.1 }
    ],
    airdrop_guns: [
        { item: "mini14", weight: 1 },
        { item: "sr25", weight: 1 },
        { item: "vss", weight: 1 },
        { item: "vector", weight: 1 },
        { item: "vepr12", weight: 1 },
        { item: "cz600", weight: 1 },
        { item: "mcx_spear", weight: 0.95 },
        { item: "mosin", weight: 0.95 },
        { item: "tango_51", weight: 0.9 },
        { item: "stoner_63", weight: 0.9 },
        { item: "radio", weight: 0.1 }
    ],
    gold_airdrop_guns: [
        { item: "m1_garand", weight: 1.1 },
        { item: "acr", weight: 1 },
        { item: "pp19", weight: 1 },
        { item: "barrett", weight: 0.5 },
        { item: "model_89", weight: 0.5 },
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
        { item: "christmas_tree_skin", weight: 1 },
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
        { item: "cz600", weight: 0.7 },
        { item: "vepr12", weight: 0.6 },
        { item: "lewis_gun", weight: 0.6 },
        { item: "mosin", weight: 0.5 },
        { item: "vector", weight: 0.4 },
        { item: "stoner_63", weight: 0.1 },
        { item: "tango_51", weight: 0.1 },
        { item: "g19", weight: 0.1 }
    ],
    river_chest_guns: [
        { item: "m16a4", weight: 1 },
        { item: "cz600", weight: 0.75 },
        { item: "mini14", weight: 0.75 },
        { item: "mcx_spear", weight: 0.55 },
        { item: "sr25", weight: 0.5 },
        { item: "vss", weight: 0.5 },
        { item: "mosin", weight: 0.45 },
        { item: "vector", weight: 0.4 },
        { item: "stoner_63", weight: 0.08 },
        { item: "tango_51", weight: 0.08 },
        { item: "g19", weight: 0.08 }
    ]
};
