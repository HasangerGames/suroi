import { DefinitionType, ObjectDefinitions, ReferenceTo, type ItemDefinition } from "../../utils/objectDefinitions";
import { PerkDefinition, PerkIds } from "./perks";

export type ArmorDefinition = ItemDefinition & {
    readonly defType: DefinitionType.Armor
    readonly level: number
    readonly damageReduction: number
    readonly perk?: ReferenceTo<PerkDefinition>
    readonly positionOverride?: number
    readonly positionOverrideDowned?: number
    readonly emitSound?: string
} & (
    | {
        readonly armorType: ArmorType.Helmet
    }
    | {
        readonly armorType: ArmorType.Vest
        readonly color: number
        readonly worldImage?: string
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
    {
        idString: "power_helmet",
        name: "NTK-11 Halycon",
        defType: DefinitionType.Armor,
        armorType: ArmorType.Helmet,
        level: 4,
        damageReduction: 0.25,
        positionOverride: 0,
        positionOverrideDowned: 0,
        perk: PerkIds.ThermalGoggles,
        mapIndicator: "helmet_indicator"
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
        idString: "power_vest",
        name: "ERV-3 Core",
        defType: DefinitionType.Armor,
        armorType: ArmorType.Vest,
        level: 4,
        damageReduction: 0.35,
        color: 0xffffff,
        worldImage: "power_vest_world",
        perk: PerkIds.ExperimentalForcefield,
        mapIndicator: "vest_indicator"
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
    },
    {
        idString: "werewolf_fur",
        name: "Werewolf Fur",
        defType: DefinitionType.Armor,
        armorType: ArmorType.Vest,
        level: 5,
        damageReduction: 0.2,
        color: 0x4d4d4d,
        noDrop: true,
        hideInHUD: true,
        emitSound: "werewolf"
    },
]);
