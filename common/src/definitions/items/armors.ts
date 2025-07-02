import { DefinitionType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";

export type ArmorDefinition = ItemDefinition & {
    readonly defType: DefinitionType.Armor
    readonly level: number
    readonly damageReduction: number
} & (
    | {
        readonly armorType: ArmorType.Helmet
    }
    | {
        readonly armorType: ArmorType.Vest
        readonly color: number
    }
);

export enum ArmorType {
    Helmet,
    Vest
}

export const Armors = new ObjectDefinitions<ArmorDefinition>([
    //
    // Helmets
    //
    {
        idString: "basic_helmet",
        name: "Basic Helmet",
        defType: DefinitionType.Armor,
        armorType: ArmorType.Helmet,
        level: 1,
        damageReduction: 0.1
    },
    {
        idString: "regular_helmet",
        name: "Regular Helmet",
        defType: DefinitionType.Armor,
        armorType: ArmorType.Helmet,
        level: 2,
        damageReduction: 0.15
    },
    {
        idString: "tactical_helmet",
        name: "Tactical Helmet",
        defType: DefinitionType.Armor,
        armorType: ArmorType.Helmet,
        level: 3,
        damageReduction: 0.2
    },

    //
    // Vests
    //
    {
        idString: "basic_vest",
        name: "Basic Vest",
        defType: DefinitionType.Armor,
        armorType: ArmorType.Vest,
        level: 1,
        damageReduction: 0.2,
        color: 0xc8c8c6
    },
    {
        idString: "regular_vest",
        name: "Regular Vest",
        defType: DefinitionType.Armor,
        armorType: ArmorType.Vest,
        level: 2,
        damageReduction: 0.35,
        color: 0x404d2e
    },
    {
        idString: "tactical_vest",
        name: "Tactical Vest",
        defType: DefinitionType.Armor,
        armorType: ArmorType.Vest,
        level: 3,
        damageReduction: 0.45,
        color: 0x0d0d0d
    },
    {
        idString: "developr_vest",
        name: "Developr Vest",
        defType: DefinitionType.Armor,
        armorType: ArmorType.Vest,
        level: 99,
        devItem: true,
        damageReduction: 0.72,
        color: 0x2f0000,
        noDrop: true
    }
]);
