import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export type ArmorDefinition = ItemDefinition & {
    readonly itemType: ItemType.Armor
    readonly armorType: ArmorType
    readonly level: number
    readonly damageReduction: number
} & ({
    readonly armorType: ArmorType.Vest
    readonly color: number
} | {
    readonly armorType: ArmorType.Helmet
    readonly color?: undefined
});

export enum ArmorType {
    Helmet,
    Vest
}

export const Armors = ObjectDefinitions.withDefault<ArmorDefinition>()(
    "Armors",
    {
        itemType: ItemType.Armor,
        noDrop: false
    },
    ([derive]) => {
        const vest = derive((name: string) => ({
            idString: `${name.toLowerCase()}_vest`,
            name: `${name} Vest`,
            armorType: ArmorType.Vest,
            color: 0x000000
        }));

        const helmet = derive((name: string) => ({
            idString: `${name.toLowerCase()}_helmet`,
            name: `${name} Helmet`,
            armorType: ArmorType.Helmet
        }));

        return [
            //
            // Helmets
            //
            helmet(
                ["Basic"],
                {
                    level: 1,
                    damageReduction: 0.1
                }
            ),
            helmet(
                ["Regular"],
                {
                    level: 2,
                    damageReduction: 0.15
                }
            ),
            helmet(
                ["GODLIKE"],
                {
                    level: 100,
                    damageReduction: 1
                }
            ),

            //
            // Vests
            //
            vest(
                ["Basic"],
                {
                    level: 1,
                    damageReduction: 0.2,
                    color: 0xc8c8c6
                }
            ),
            vest(
                ["Regular"],
                {
                    level: 2,
                    damageReduction: 0.35,
                    color: 0x404d2e
                }
            ),
            vest(
                ["GOD LIKE"],
                {
                    level: 100,
                    damageReduction: 1,
                    color: 0x0d0d0d
                }
            ),
            vest(
                ["Developr"],
                {
                    level: 99,
                    devItem: true,
                    damageReduction: 0.72,
                    color: 0x2f0000,
                    noDrop: true
                }
            )
        ];
    }
);
