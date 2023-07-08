import { type ItemDefinition, ItemType } from "../utils/objectDefinitions";

export interface BackpackDefinition extends ItemDefinition {
    readonly itemType: ItemType.Backpack
    readonly level: number
    readonly maxCapacity: Record<string, number>
}

export const Backpacks: BackpackDefinition[] = [
    {
        idString: "bag",
        name: "Bag",
        itemType: ItemType.Backpack,
        level: 0,
        maxCapacity: {
            gauze: 5,
            medikit: 1,
            cola: 2,
            tablets: 1,
            "12g": 10,
            "556mm": 60,
            "762mm": 60,
            "9mm": 60
        }
    },
    {
        idString: "satchel",
        name: "Satchel",
        itemType: ItemType.Backpack,
        level: 1,
        maxCapacity: {
            gauze: 10,
            medikit: 2,
            cola: 4,
            tablets: 2,
            "12g": 20,
            "556mm": 90,
            "762mm": 90,
            "9mm": 90
        }
    },
    {
        idString: "regular_backpack",
        name: "Regular Backpack",
        itemType: ItemType.Backpack,
        level: 2,
        maxCapacity: {
            gauze: 15,
            medikit: 3,
            cola: 5,
            tablets: 3,
            "12g": 40,
            "556mm": 120,
            "762mm": 120,
            "9mm": 120
        }
    },
    {
        idString: "tactical_backpack",
        name: "Tactical Backpack",
        itemType: ItemType.Backpack,
        level: 3,
        maxCapacity: {
            gauze: 25,
            medikit: 4,
            cola: 8,
            tablets: 4,
            "12g": 60,
            "556mm": 200,
            "762mm": 200,
            "9mm": 200
        }
    }
];
