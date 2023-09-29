import { ArmorType } from "../constants";
import { ItemType } from "../utils/objectDefinitions";
import { type ArmorDefinition } from "./armors";

export const Vests: ArmorDefinition[] = [
    {
        idString: "basic_vest",
        name: "Basic Vest",
        itemType: ItemType.Armor,
        armorType: ArmorType.Vest,
        level: 1,
        damageReduction: 0.2
    },
    {
        idString: "bulletproof_vest",
        name: "Bulletproof Vest",
        itemType: ItemType.Armor,
        armorType: ArmorType.Vest,
        level: 2,
        damageReduction: 0.35
    },
    {
        idString: "tactical_vest",
        name: "Tactical Vest",
        itemType: ItemType.Armor,
        armorType: ArmorType.Vest,
        level: 3,
        damageReduction: 0.45
    }
];
