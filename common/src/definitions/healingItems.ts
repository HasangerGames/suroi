import { type ItemDefinition, ItemType } from "../utils/objectDefinitions";

export interface HealingItemDefinition extends ItemDefinition {
    readonly type: ItemType.Healing
    readonly healType: HealType
    readonly restoreAmount: number
    readonly useText: string
}

export enum HealType { Health, Adrenaline }

export const HealingItems: HealingItemDefinition[] = [
    {
        idString: "gauze",
        name: "Gauze",
        type: ItemType.Healing,
        healType: HealType.Health,
        restoreAmount: 10,
        useText: "Applying"
    },
    {
        idString: "medikit",
        name: "Medikit",
        type: ItemType.Healing,
        healType: HealType.Health,
        restoreAmount: 75,
        useText: "Using"
    },
    {
        idString: "cola",
        name: "Cola",
        type: ItemType.Healing,
        healType: HealType.Adrenaline,
        restoreAmount: 25,
        useText: "Drinking"
    },
    {
        idString: "tablets",
        name: "Tablets",
        type: ItemType.Healing,
        healType: HealType.Adrenaline,
        restoreAmount: 20,
        useText: "Taking"
    }
];
