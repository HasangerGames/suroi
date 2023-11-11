import { ArmorType } from "../constants";
import { ItemType } from "../utils/objectDefinitions";
import { type ArmorDefinition } from "./armors";

export const Helmets: ArmorDefinition[] = [
    {
        idString: "basic_helmet",
        name: "Basic Helmet",
        itemType: ItemType.Armor,
        armorType: ArmorType.Helmet,
        level: 1,
        damageReduction: 0.1
    },
    {
        idString: "regular_helmet",
        name: "Regular Helmet",
        itemType: ItemType.Armor,
        armorType: ArmorType.Helmet,
        level: 2,
        damageReduction: 0.15
    },
    {
        idString: "tactical_helmet",
        name: "Tactical Helmet",
        itemType: ItemType.Armor,
        armorType: ArmorType.Helmet,
        level: 3,
        damageReduction: 0.2
    }
];
