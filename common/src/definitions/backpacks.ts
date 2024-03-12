import { ItemType, ObjectDefinitions, type ItemDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { type AmmoDefinition } from "./ammos";
import { type HealingItemDefinition } from "./healingItems";
import { type ThrowableDefinition } from "./throwables";

export interface BackpackDefinition extends ItemDefinition {
    readonly itemType: ItemType.Backpack
    readonly level: number
    readonly maxCapacity: Record<ReferenceTo<HealingItemDefinition | AmmoDefinition | ThrowableDefinition>, number>
}

export const Backpacks = ObjectDefinitions.create<BackpackDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            itemType: ItemType.Backpack,
            noDrop: false
        }),
        backpack_factory: (name: string) => ({
            idString: `${name.toLowerCase()}_pack`,
            name: `${name} Pack`
        })
    })
)(
    apply => [
        {
            idString: "bag",
            name: "Bag",
            level: 0,
            maxCapacity: {
                gauze: 5,
                medikit: 1,
                cola: 2,
                tablets: 1,
                "12g": 15,
                "556mm": 90,
                "762mm": 90,
                "9mm": 120,
                "127mm": 10,
                power_cell: Infinity,
                curadell: 1,
                frag_grenade: 3,
                smoke_grenade: 3
            },
            noDrop: true
        },
        apply(
            "backpack_factory",
            {
                level: 1,
                maxCapacity: {
                    gauze: 10,
                    medikit: 2,
                    cola: 5,
                    tablets: 2,
                    "12g": 30,
                    "556mm": 180,
                    "762mm": 180,
                    "9mm": 240,
                    "127mm": 20,
                    power_cell: Infinity,
                    curadell: 2,
                    frag_grenade: 6,
                    smoke_grenade: 6
                }
            },
            "Basic"
        ),
        apply(
            "backpack_factory",
            {
                level: 2,
                maxCapacity: {
                    gauze: 15,
                    medikit: 3,
                    cola: 10,
                    tablets: 3,
                    "12g": 60,
                    "556mm": 240,
                    "762mm": 240,
                    "9mm": 330,
                    "127mm": 40,
                    power_cell: Infinity,
                    curadell: 3,
                    frag_grenade: 9,
                    smoke_grenade: 9
                }
            },
            "Regular"
        ),
        apply(
            "backpack_factory",
            {
                level: 3,
                maxCapacity: {
                    gauze: 30,
                    medikit: 4,
                    cola: 15,
                    tablets: 4,
                    "12g": 90,
                    "556mm": 300,
                    "762mm": 300,
                    "9mm": 420,
                    "127mm": 80,
                    power_cell: Infinity,
                    curadell: 4,
                    frag_grenade: 12,
                    smoke_grenade: 12
                }
            },
            "Tactical"
        )
    ]
);
