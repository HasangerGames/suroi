import { ArmorType } from "../constants";
import { ItemType } from "../utils/objectDefinitions";
import { type ArmorDefinition } from "./armors";

export const Vests: ArmorDefinition[] = [
    {
        idString: "vest_1",
        name: "Lvl. 1 Vest",
        itemType: ItemType.Armor,
        armorType: ArmorType.Vest,
        level: 1,
        damageReduction: 0.2
    },
    {
        idString: "vest_2",
        name: "Lvl. 2 Vest",
        itemType: ItemType.Armor,
        armorType: ArmorType.Vest,
        level: 2,
        damageReduction: 0.35
    },
    {
        idString: "vest_3",
        name: "Lvl. 3 Vest",
        itemType: ItemType.Armor,
        armorType: ArmorType.Vest,
        level: 3,
        damageReduction: 0.45
    }
];
