import { type ArmorDefinition } from "./armors";
import { ItemType } from "../utils/objectDefinitions";
import { ArmorType } from "../constants";

export const Helmets: ArmorDefinition[] = [
    {
        idString: "hard_hat",
        name: "Hard Hat",
        itemType: ItemType.Armor,
        armorType: ArmorType.Helmet,
        level: 1,
        damageReductionPercentage: 0.05
    },
    {
        idString: "m1_helmet",
        name: "M1 Helmet",
        itemType: ItemType.Armor,
        armorType: ArmorType.Helmet,
        level: 2,
        damageReductionPercentage: 0.1
    },
    {
        idString: "tactical_helmet",
        name: "Tactical Helmet",
        itemType: ItemType.Armor,
        armorType: ArmorType.Helmet,
        level: 3,
        damageReductionPercentage: 0.15
    }
];
