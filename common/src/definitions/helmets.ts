import { ArmorType } from "../constants";
import { ItemType } from "../utils/objectDefinitions";
import { type ArmorDefinition } from "./armors";

export const Helmets: ArmorDefinition[] = [
    {
        idString: "hard_hat",
        name: "Hard Hat",
        itemType: ItemType.Armor,
        armorType: ArmorType.Helmet,
        level: 1,
        damageReduction: 0.1
    },
    {
        idString: "m1_helmet",
        name: "M1 Helmet",
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
