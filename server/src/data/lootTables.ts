export interface WeightedLoot { item: string, weight: number }
export interface WeightedTier { tier: string, weight: number }
export type WeightedItem = WeightedLoot | WeightedTier;
export interface LootTable { min: number, max: number, loot: WeightedItem[] }

export const LootTables: Record<string, LootTable> = {
    regular_crate: {
        min: 1,
        max: 2,
        loot: [
            { tier: "guns", weight: 1 },
            { tier: "healing_items", weight: 0.5 },
            { tier: "ammo", weight: 0.25 },
            { tier: "melee", weight: 0.04 }
        ]
    },
    aegis_crate: {
        min: 2,
        max: 4,
        loot: [
            { tier: "aegis_guns", weight: 1 },
            { tier: "aegis_healing_items", weight: 0.75 }
        ]
    },
    flint_crate: {
        min: 2,
        max: 4,
        loot: [
            { tier: "flint_guns", weight: 1 },
            { tier: "flint_healing_items", weight: 0.1 }
        ]
    },
    special_crate: {
        min: 1,
        max: 2,
        loot: [
            { tier: "guns", weight: 1 }
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
    knife_crate: {
        min: 2,
        max: 2,
        loot: [
            { tier: "knife", weight: 1 }
        ]
    },
    clubs_crate: {
        min: 2,
        max: 2,
        loot: [
            { tier: "clubs", weight: 1 }
        ]
    },
    gold_rock: {
        min: 1,
        max: 1,
        loot: [
            { item: "mosin", weight: 1 }
        ]
    }
};

export const LootTiers: Record<string, WeightedLoot[]> = {
    guns: [
        { item: "g19", weight: 2 },
        { item: "ak47", weight: 1.5 },
        { item: "saf200", weight: 1.25 },
        { item: "m37", weight: 1 },
        { item: "m3k", weight: 0.75 },
        { item: "mosin", weight: 0.02 }
    ],
    healing_items: [
        { item: "gauze", weight: 3 },
        { item: "cola", weight: 2 },
        { item: "medikit", weight: 1 }
    ],
    ammo: [
        { item: "12g_ammo", weight: 0.75 },
        { item: "556mm_ammo", weight: 1 },
        { item: "762mm_ammo", weight: 1 },
        { item: "9mm_ammo", weight: 1 }
    ],
    aegis_guns: [
        { item: "m3k", weight: 1.1 },
        { item: "ak47", weight: 1 },
        { item: "m37", weight: 1 },
        { item: "g19", weight: 0.5 },
        { item: "mosin", weight: 0.25 }
    ],
    aegis_healing_items: [
        { item: "cola", weight: 2 },
        { item: "medikit", weight: 1.5 },
        { item: "gauze", weight: 1 }
    ],
    flint_guns: [
        { item: "ak47", weight: 1.25 },
        { item: "m3k", weight: 1.1 },
        { item: "m37", weight: 1 },
        { item: "saf200", weight: 0.75 },
        { item: "mosin", weight: 0.3 }
    ],
    flint_healing_items: [
        { item: "medikit", weight: 1.5 },
        { item: "cola", weight: 1.25 },
        { item: "gauze", weight: 1 }
    ],
    melee: [
        { item: "branch", weight: 0.5 },
        { item: "club", weight: 1 },
        { item: "dagger", weight: 0.1 },
        { item: "club_op", weight: 0.1 },
        { item: "baseball_bat", weight: 4 },
        { item: "kbar", weight: 2 }
    ],
    knife: [
        { item: "dagger", weight: 0.2 },
        { item: "kbar", weight: 2 }
    ],
    clubs: [
        { item: "baseball_bat", weight: 2 },
        { item: "club", weight: 0.4 },
        { item: "club_op", weight: 0.1 }
    ]
};
