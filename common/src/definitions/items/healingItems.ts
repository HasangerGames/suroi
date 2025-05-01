import { ItemType, ObjectDefinitions, ReferenceTo, type ItemDefinition } from "../../utils/objectDefinitions";
import { PerkIds } from "./perks";
import { PerkDefinition } from "../../definitions/items/perks";
export interface HealingItemDefinition extends ItemDefinition {
    readonly itemType: ItemType.Healing
    readonly healType: HealType
    readonly restoreAmount: number
    readonly useTime: number
    readonly removePerk?: ReferenceTo<PerkDefinition>
    readonly restoreAmounts?: Record<string, number>
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
        idString: "vaccine_syringe",
        name: "Vaccine Syringe",
        itemType: ItemType.Healing,
        healType: HealType.Special,
        useTime: 2,
        removePerk: PerkIds.Infected,
        restoreAmount: 0,
        restoreAmounts: {
            "adrenaline": 50,
          }
    }
    
]);
