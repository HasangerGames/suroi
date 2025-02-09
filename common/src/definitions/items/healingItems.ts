import { ItemType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";

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

export const HealingItems = new ObjectDefinitions<HealingItemDefinition>([
    {
        idString: "gauze",
        name: "Gauze",
        itemType: ItemType.Healing,
        healType: HealType.Health,
        restoreAmount: 15,
        useTime: 3
    },
    {
        idString: "medikit",
        name: "Medikit",
        itemType: ItemType.Healing,
        healType: HealType.Health,
        restoreAmount: 100,
        useTime: 6
    },

    {
        idString: "cola",
        name: "Cola",
        itemType: ItemType.Healing,
        healType: HealType.Adrenaline,
        restoreAmount: 25,
        useTime: 3
    },
    {
        idString: "tablets",
        name: "Tablets",
        itemType: ItemType.Healing,
        healType: HealType.Adrenaline,
        restoreAmount: 50,
        useTime: 5
    }
]);
