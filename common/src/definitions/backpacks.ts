import { type ItemDefinition, ItemType } from "../utils/objectDefinitions";

export interface BackpackDefinition extends ItemDefinition {
    readonly itemType: ItemType.Backpack
}

export const Backpacks: BackpackDefinition[] = [
    {
        idString: "satchel",
        name: "Satchel",
        itemType: ItemType.Backpack
    },
    {
        idString: "regular_backpack",
        name: "Regular Backpack",
        itemType: ItemType.Backpack
    },
    {
        idString: "tactical_backpack",
        name: "Tactical Backpack",
        itemType: ItemType.Backpack
    }
];
