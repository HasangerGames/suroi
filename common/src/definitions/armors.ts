import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface ArmorDefinition extends ItemDefinition {
    readonly itemType: ItemType.Armor
    readonly armorType: ArmorType
    readonly level: number
    readonly damageReduction: number
}

export enum ArmorType {
    Helmet,
    Vest
}

export const Armors = ObjectDefinitions.create<ArmorDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            itemType: ItemType.Armor,
            noDrop: false
        }),
        vest_factory: (name: string) => ({
            idString: `${name.toLowerCase()}_vest`,
            name: `${name} Vest`,
            armorType: ArmorType.Vest
        }),
        helmet_factory: (name: string) => ({
            idString: `${name.toLowerCase()}_helmet`,
            name: `${name} Helmet`,
            armorType: ArmorType.Helmet
        })
    })
)(
    apply => [
        //
        // Helmets
        //
        apply(
            "helmet_factory",
            {
                level: 1,
                damageReduction: 0.1
            },
            "Basic"
        ),
        apply(
            "helmet_factory",
            {
                level: 2,
                damageReduction: 0.15
            },
            "Regular"
        ),
        apply(
            "helmet_factory",
            {
                level: 3,
                damageReduction: 0.2
            },
            "Tactical"
        ),

        //
        // Vests
        //
        apply(
            "vest_factory",
            {
                level: 1,
                damageReduction: 0.2
            },
            "Basic"
        ),
        apply(
            "vest_factory",
            {
                level: 2,
                damageReduction: 0.35
            },
            "Regular"
        ),
        apply(
            "vest_factory",
            {
                level: 3,
                damageReduction: 0.45
            },
            "Tactical"
        )
    ]
);
