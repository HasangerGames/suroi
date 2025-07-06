import { DefinitionType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";
import { PerkIds } from "./perks";

export interface HealingItemDefinition extends ItemDefinition {
    readonly defType: DefinitionType.HealingItem

    readonly healType: HealType
    readonly restoreAmount: number
    readonly useTime: number
    readonly effect?: {
        readonly removePerk: PerkIds
        readonly restoreAmounts?: Heal[]
    }
    readonly hideUnlessPresent?: boolean
}
interface Heal {
    readonly healType: HealType
    readonly restoreAmount: number
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
        defType: DefinitionType.HealingItem,
        healType: HealType.Health,
        restoreAmount: 20,
        useTime: 3
    },
    {
        idString: "medikit",
        name: "Medikit",
        defType: DefinitionType.HealingItem,
        healType: HealType.Health,
        restoreAmount: 100,
        useTime: 6
    },

    {
        idString: "cola",
        name: "Cola",
        defType: DefinitionType.HealingItem,
        healType: HealType.Adrenaline,
        restoreAmount: 25,
        useTime: 3
    },
    {
        idString: "tablets",
        name: "Tablets",
        defType: DefinitionType.HealingItem,
        healType: HealType.Adrenaline,
        restoreAmount: 50,
        useTime: 4
    },
    {
        idString: "vaccine_syringe",
        name: "Vaccine Syringe",
        defType: DefinitionType.HealingItem,
        healType: HealType.Special,
        restoreAmount: 0,
        useTime: 2,
        effect: {
            removePerk: PerkIds.Infected,
            restoreAmounts: [
                {
                    healType: HealType.Adrenaline,
                    restoreAmount: 50
                }
            ]
        },
        hideUnlessPresent: true
    }
]);
