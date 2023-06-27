export interface WeightedLoot { item: string, count?: number, weight: number }
export interface WeightedTier { tier: string, weight: number }
export type WeightedItem = WeightedLoot | WeightedTier;
export interface LootTable { min: number, max: number, loot: WeightedItem[] }

export const LootTables: Record<string, LootTable> = {
    regular_crate: {
        min: 1,
        max: 2,
        loot: [
            { tier: "guns", weight: 1 },
            { tier: "healing_items", weight: 0.75 },
            { tier: "ammo", weight: 0.2 },
            { tier: "melee", weight: 0.04 }
        ]
    },
    aegis_crate: {
        min: 2,
        max: 4,
        loot: [
            { tier: "special_guns", weight: 1 },
            { tier: "special_healing_items", weight: 0.75 }
        ]
    },
    flint_crate: {
        min: 2,
        max: 4,
        loot: [
            { tier: "special_guns", weight: 1 },
            { tier: "special_healing_items", weight: 0.1 }
        ]
    },
    cola_crate: {
        min: 2,
        max: 4,
        loot: [
            { item: "cola", weight: 1 }
        ]
    },
    gauze_crate: {
        min: 3,
        max: 5,
        loot: [
            { item: "gauze", weight: 1 }
        ]
    },
    deathray_crate: {
        min: 1,
        max: 1,
        loot: [
            { item: "deathray", weight: 1 }
        ]
    },
    melee_crate: {
        min: 2,
        max: 2,
        loot: [
            { tier: "melee", weight: 1 }
        ]
    },
    gold_rock: {
        min: 1,
        max: 1,
        loot: [
            { item: "mosin", weight: 1 },
            { item: "tango_51", weight: 0.01 }
        ]
    }
};

export const LootTiers: Record<string, WeightedLoot[]> = {
    guns: [
        { item: "g19", weight: 1.75 },
        { item: "ak47", weight: 1.5 },
        { item: "saf_200", weight: 1.25 },
        { item: "940_pro", weight: 1.1 },
        { item: "m37", weight: 1 },
        { item: "micro_uzi", weight: 0.75 },
        { item: "m3k", weight: 0.75 },
        { item: "mcx_spear", weight: 0.2 },
        { item: "m16a4", weight: 0.1 },
        { item: "lewis_gun", weight: 0.02 },
        { item: "mosin", weight: 0.005 },
        { item: "tango_51", weight: 0.001 }
    ],
    healing_items: [
        { item: "gauze", weight: 3 },
        { item: "cola", weight: 2 },
        { item: "medikit", weight: 1 }
    ],
    ammo: [
        {
            item: "12g", count: 10, weight: 0.75
        },
        {
            item: "556mm", count: 30, weight: 1
        },
        {
            item: "762mm", count: 30, weight: 1
        },
        {
            item: "9mm", count: 30, weight: 1
        }
    ],
    special_guns: [
        { item: "micro_uzi", weight: 1.25 },
        { item: "ak47", weight: 1.1 },
        { item: "940_pro", weight: 1 },
        { item: "m37", weight: 1 },
        { item: "m3k", weight: 0.8 },
        { item: "g19", weight: 0.75 },
        { item: "saf_200", weight: 0.75 },
        { item: "mcx_spear", weight: 0.5 },
        { item: "m16a4", weight: 0.35 },
        { item: "lewis_gun", weight: 0.1 },
        { item: "mosin", weight: 0.01 },
        { item: "tango_51", weight: 0.001 }
    ],
    special_healing_items: [
        { item: "cola", weight: 2 },
        { item: "medikit", weight: 1.5 },
        { item: "gauze", weight: 1 }
    ],
    melee: [
        { item: "baseball_bat", weight: 4 },
        { item: "kbar", weight: 2 }
    ]
};
