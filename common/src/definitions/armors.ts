import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface ArmorDefinition extends ItemDefinition {
    readonly itemType: ItemType.Armor
    readonly armorType: ArmorType
    readonly level: number
    readonly damageReduction: number
    readonly color?: number
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
            armorType: ArmorType.Vest,
            color: 0x000000
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
                damageReduction: 0.2,
                color: 0xc8c8c6
            },
            "Basic"
        ),
        apply(
            "vest_factory",
            {
                level: 2,
                damageReduction: 0.35,
                color: 0x404d2e
            },
            "Regular"
        ),
        apply(
            "vest_factory",
            {
                level: 3,
                damageReduction: 0.45,
                color: 0x0d0d0d // mfw 0x000000 tint no work
            },
            "Tactical"
        ),
        apply(
            "vest_factory",
            {
                level: 99,
                damageReduction: 0.72,
                color: 0x2f0000,
                noDrop: true
            },
            "Developr"
        )
    ]
);
