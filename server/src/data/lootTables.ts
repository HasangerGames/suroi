export interface WeightedLoot { item: string, weight: number }
export interface WeightedTier { tier: string, weight: number }
export type WeightedItem = WeightedLoot | WeightedTier;
export interface LootTable { min: number, max: number, loot: WeightedItem[] }

export const LootTables: Record<string, LootTable> = {
    regular_crate: {
        min: 1,
        max: 3,
        loot: [
            { tier: "guns", weight: 1 },
            { tier: "healingItems", weight: 1 }
        ]
    }
};

export const LootTiers: Record<string, WeightedLoot[]> = {
    guns: [
        { item: "ak47", weight: 1 },
        { item: "m3k", weight: 1 }
    ],
    healingItems: [
        { item: "gauze", weight: 3 },
        { item: "cola", weight: 2 },
        { item: "medikit", weight: 1 }
    ]
};
