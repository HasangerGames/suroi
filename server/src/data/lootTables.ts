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
            { tier: "healingItems", weight: 0.25 }
            //{ tier: "melee", weight: 0.04 }
        ]
    },
    health_crate: {
        min: 1,
        max: 2,
        loot: [
            { tier: "healingItems", weight: 1 }
        ]
    },
    special_crate: {
        min: 1,
        max: 2,
        loot: [
            {tier: "guns", weight: 1}
        ]
    },
    cola_crate: {
        min: 3,
        max: 4,
        loot: [
            { tier: "cola", weight: 1 }
        ]
    },
    gauze_crate: {
        min: 3,
        max: 5,
        loot: [
            { tier: "gauze", weight: 1 }
        ]
    },
    deathray_crate: {
        min: 1,
        max: 1,
        loot: [
            { tier: "deathray", weight: 1 }
        ]
    },
    dagger_crate: {
        min: 2,
        max: 2,
        loot: [
            {tier: "dagger", weight: 1 }
        ]
    },
    clubs_crate: {
        min: 2,
        max: 2,
        loot: [
            {tier: "clubs", weight: 1 }
        ]
    },
    gold_rock: {
        min: 1,
        max: 2,
        loot: [
            {tier: "mosin", weight: 1}
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
        { item: "mosin", weight: 0.1 }
        //{ item: "deathray", weight: 10 }
    ],
    healingItems: [
        { item: "gauze", weight: 3 },
        { item: "cola", weight: 2 },
        { item: "medikit", weight: 1 }
    ],
    melee: [
        { item: "branch", weight: 0.5 },
        { item: "club", weight: 1 },
        { item: "dagger", weight: 0.5 },
        { item: "club_op", weight: 0.1 }
    ],
    cola: [
        {item: "cola", weight: 1}
    ],
    gauze: [
        {item: "gauze", weight: 1}
    ],
    deathray: [
        {item: "deathray", weight: 1}
    ],
    dagger: [
        {item: "dagger", weight: 1}
    ],
    clubs: [
        {item: "club", weight: 2},
        {item: "club_op", weight: 1}
    ],
    mosin: [
        {item: "mosin", weight: 1}
    ]
};
