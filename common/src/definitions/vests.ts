import { type ArmorDefinition } from "./armors";
import { ItemType } from "../utils/objectDefinitions";
import { ArmorType } from "../constants";

export const Vests: ArmorDefinition[] = [
    {
        idString: "vest",
        name: "Vest",
        itemType: ItemType.Armor,
        armorType: ArmorType.Vest,
        level: 1,
        damageReductionPercentage: 0.1
    },
    {
        idString: "bulletproof_vest",
        name: "Bulletproof Vest",
        itemType: ItemType.Armor,
        armorType: ArmorType.Vest,
        level: 2,
        damageReductionPercentage: 0.2
    },
    {
        idString: "tactical_vest",
        name: "Tactical Vest",
        itemType: ItemType.Armor,
        armorType: ArmorType.Vest,
        level: 3,
        damageReductionPercentage: 0.3
    }
];
