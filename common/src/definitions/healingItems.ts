import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface HealingItemDefinition extends ItemDefinition {
    readonly itemType: ItemType.Healing
    readonly healType: HealType
    readonly restoreAmount: number
    readonly useTime: number
}

export enum HealType {
    Health,
    Adrenaline
}

export const HealingItems = ObjectDefinitions.withDefault<HealingItemDefinition>()(
    "HealingItems",
    {
        itemType: ItemType.Healing,
        noDrop: false
    },
    ([derive]) => {
        const healing = derive((name: string) => ({
            idString: name.toLowerCase().replace(/ /g, "_"),
            healType: HealType.Health,
            name
        }));

        const adren = derive((name: string) => ({
            idString: name.toLowerCase().replace(/ /g, "_"),
            healType: HealType.Adrenaline,
            name
        }));

        return [
            healing(
                ["Gauze"],
                {
                    restoreAmount: 15,
                    useTime: 3
                }
            ),
            healing(
                ["Medikit"],
                {
                    restoreAmount: 100,
                    useTime: 6
                }
            ),
            adren(
                ["Cola"],
                {
                    restoreAmount: 25,
                    useTime: 3
                }
            ),
            adren(
                ["Tablets"],
                {
                    restoreAmount: 50,
                    useTime: 5
                }
            )
        ];
    }
);
