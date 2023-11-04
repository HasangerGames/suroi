import { ArmorType } from "../constants";
import { ItemType } from "../utils/objectDefinitions";
import { type ArmorDefinition } from "./armors";

export const Helmets: ArmorDefinition[] = [
    {
        idString: "helmet_1",
        name: "Lvl. 1 Helmet",
        itemType: ItemType.Armor,
        armorType: ArmorType.Helmet,
        level: 1,
        damageReduction: 0.1
    },
    {
        idString: "helmet_2",
        name: "Lvl. 2 Helmet",
        itemType: ItemType.Armor,
        armorType: ArmorType.Helmet,
        level: 2,
        damageReduction: 0.15
    },
    {
        idString: "helmet_3",
        name: "Lvl. 3 Helmet",
        itemType: ItemType.Armor,
        armorType: ArmorType.Helmet,
        level: 3,
        damageReduction: 0.2
    }
];
