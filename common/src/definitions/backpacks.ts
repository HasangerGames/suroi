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
            "12g": 15,
            "556mm": 90,
            "762mm": 90,
            "9mm": 120,
            power_cell: Infinity
        },
        noDrop: true
    },
    {
        idString: "satchel",
        name: "Satchel",
        itemType: ItemType.Backpack,
        level: 1,
        maxCapacity: {
            gauze: 10,
            medikit: 2,
            cola: 5,
            tablets: 2,
            "12g": 30,
            "556mm": 180,
            "762mm": 180,
            "9mm": 240,
            power_cell: Infinity
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
            cola: 10,
            tablets: 3,
            "12g": 60,
            "556mm": 240,
            "762mm": 240,
            "9mm": 330,
            power_cell: Infinity
        }
    },
    {
        idString: "tactical_backpack",
        name: "Tactical Backpack",
        itemType: ItemType.Backpack,
        level: 3,
        maxCapacity: {
            gauze: 30,
            medikit: 4,
            cola: 15,
            tablets: 4,
            "12g": 90,
            "556mm": 300,
            "762mm": 300,
            "9mm": 420,
            power_cell: Infinity
        }
    }
];
