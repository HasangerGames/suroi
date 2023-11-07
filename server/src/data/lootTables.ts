import { type LootDefinition } from "../../../common/src/definitions/loots";
import { type ReferenceTo } from "../../../common/src/utils/objectDefinitions";

export type WeightedItem =
    (
        { readonly item: ReferenceTo<LootDefinition> } |
        { readonly tier: string }
    ) &
    {
        readonly count?: number
        readonly spawnSeparately?: boolean
        readonly weight: number
    };
export interface LootTable { min: number, max: number, loot: WeightedItem[] | WeightedItem[][] }

export const LootTables: Record<string, LootTable> = {
    gas_can: {
        min: 1,
        max: 1,
        loot: [
            { item: "gas_can", weight: 1 }
        ]
    },
    ground_loot: {
        min: 1,
        max: 1,
        loot: [
            { tier: "equipment", weight: 1 },
            { tier: "scopes", weight: 0.3 },
            { tier: "healing_items", weight: 1 },
            { tier: "ammo", weight: 1 },
            { tier: "guns", weight: 0.9 }
        ]
    },
    regular_crate: {
        min: 1,
        max: 1,
        loot: [
            { tier: "guns", weight: 1.25 },
            { tier: "equipment", weight: 1 },
            { tier: "scopes", weight: 0.3 },
            { tier: "healing_items", weight: 1 },
            { tier: "ammo", weight: 0.5 },
            { tier: "melee", weight: 0.04 }
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
    melee_crate: {
        min: 2,
        max: 2,
        loot: [
            { tier: "melee", weight: 1 }
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
            { tier: "equipment", weight: 1 },
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
            { tier: "healing_items", weight: 0.8 },
            { tier: "ammo", weight: 1 }
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
            { item: "verified", weight: 0.2 },
            { item: "nokilpls", weight: 0.1 },
            { item: "basic_outfit", weight: 0.0001 }
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
    gun_mount: {
        min: 1,
        max: 1,
        loot: [
            { item: "mcx_spear", weight: 1 }
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
        { item: "micro_uzi", weight: 1.25 },
        { item: "aug", weight: 1 },
        { item: "model_37", weight: 1 },
        { item: "ak47", weight: 0.8 },
        { item: "m3k", weight: 0.5 },
        { item: "m16a4", weight: 0.1 },
        { item: "mcx_spear", weight: 0.1 },
        { item: "arx160", weight: 0.1 },
        { item: "flues", weight: 0.1 },
        { item: "sr25", weight: 0.085 },
        { item: "mini14", weight: 0.085 },
        { item: "vss", weight: 0.075 },
        { item: "lewis_gun", weight: 0.05 },
        { item: "stoner_63", weight: 0.03 },
        { item: "mosin", weight: 0.02 },
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
        { item: "helmet_1", weight: 1 },
        { item: "helmet_2", weight: 0.3 },
        { item: "helmet_3", weight: 0.1 },

        { item: "vest_1", weight: 1 },
        { item: "vest_2", weight: 0.3 },
        { item: "vest_3", weight: 0.1 },

        { item: "pack_1", weight: 1 },
        { item: "pack_2", weight: 0.3 },
        { item: "pack_3", weight: 0.1 }
    ],
    ammo: [
        { item: "12g", count: 10, weight: 0.75 },
        { item: "556mm", count: 60, weight: 1 },
        { item: "762mm", count: 60, weight: 1 },
        { item: "9mm", count: 60, weight: 1 }
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
        { item: "vss", weight: 0.55 },
        { item: "m16a4", weight: 0.5 },
        { item: "g19", weight: 0.45 },
        { item: "m1895", weight: 0.45 },
        { item: "sr25", weight: 0.35 },
        { item: "mini14", weight: 0.35 },
        { item: "lewis_gun", weight: 0.35 },
        { item: "mcx_spear", weight: 0.35 },
        { item: "stoner_63", weight: 0.05 },
        { item: "mosin", weight: 0.04 },
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
        { item: "helmet_1", weight: 1 },
        { item: "helmet_2", weight: 0.5 },
        { item: "helmet_3", weight: 0.15 },

        { item: "vest_1", weight: 1 },
        { item: "vest_2", weight: 0.5 },
        { item: "vest_3", weight: 0.15 },

        { item: "pack_1", weight: 1 },
        { item: "pack_2", weight: 0.5 },
        { item: "pack_3", weight: 0.15 }
    ],
    melee: [
        { item: "baseball_bat", weight: 4 },
        { item: "kbar", weight: 2.5 }
    ]
};
