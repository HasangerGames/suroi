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
    ([derive, , createTemplate]) => {
        const consumable = derive((name: string) => ({
            idString: name.toLowerCase().replace(/ /g, "_"),
            name
        }));

        const healing = createTemplate(consumable, {
            healType: HealType.Health
        });

        const adren = createTemplate(consumable, {
            healType: HealType.Adrenaline
        });

        return [
            healing(
                ["Gauze"],
                {
                    restoreAmount: 10,
                    useTime: 0.1
                }
            ),
            healing(
                ["Medikit"],
                {
                    restoreAmount: 100,
                    useTime: 0.1
                }
            ),
            adren(
                ["Cola"],
                {
                    restoreAmount: 50,
                    useTime: 0.1
                }
            ),
            adren(
                ["Tablets"],
                {
                    restoreAmount: 100,
                    useTime: 0.1
                }
            )
        ];
    }
);
