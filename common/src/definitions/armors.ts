import { type ItemDefinition, ItemType } from "../utils/objectDefinitions";

export interface ArmorDefinition extends ItemDefinition {
    readonly itemType: ItemType.Armor
    readonly armorType: ArmorType
    readonly level: 1 | 2 | 3
    readonly damageReductionPercentage: number
}

export enum ArmorType { Helmet, Vest }

export const Armors: ArmorDefinition[] = [
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
    },
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
