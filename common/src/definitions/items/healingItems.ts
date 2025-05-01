import { ItemType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";
import { PerkIds } from "./perks";

export interface HealingItemDefinition extends ItemDefinition {
    readonly itemType: ItemType.Healing
    readonly healType: HealType
    readonly restoreAmount: number
    readonly useTime: number
    readonly effect?: {
        readonly removePerk: PerkIds
        readonly adrenaline: number
    }
    readonly hideUnlessPresent?: boolean
    readonly particleFrame?: string
}

export enum HealType {
    Health,
    Adrenaline,
    Special
}

export const HealingItems = new ObjectDefinitions<HealingItemDefinition>([
    {
        idString: "gauze",
        name: "Gauze",
        itemType: ItemType.Healing,
        healType: HealType.Health,
        restoreAmount: 20,
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
        useTime: 4
    },
    {
        idString: "vaccine_injector",
        name: "Vaccine Injector",
        itemType: ItemType.Healing,
        healType: HealType.Special,
        particleFrame: "vaccine",
        restoreAmount: 0,
        useTime: 2,
        effect: {
            removePerk: PerkIds.Infected,
            adrenaline: 50
        },
        hideUnlessPresent: true
    }
]);
