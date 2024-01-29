import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface AmmoDefinition extends ItemDefinition {
    readonly itemType: ItemType.Ammo
    readonly maxStackSize: number
    /**
     * Marking an ammo type as `ephemeral` does the following:
     * - All players start with it maxed out
     * - It cannot be depleted nor dropped
     * - It does not show up on the HUD
     * - It can always be picked up
     */
    readonly ephemeral?: boolean
    readonly defaultCasingFrame?: string
    readonly hideUnlessPresent?: boolean
}

export const Ammos = new ObjectDefinitions<AmmoDefinition>([
    {
        idString: "12g",
        name: "12 gauge",
        itemType: ItemType.Ammo,
        maxStackSize: 20,
        defaultCasingFrame: "casing_12ga_275in"
    },
    {
        idString: "556mm",
        name: "5.56mm",
        itemType: ItemType.Ammo,
        maxStackSize: 60,
        defaultCasingFrame: "casing_556x45mm"
    },
    {
        idString: "762mm",
        name: "7.62mm",
        itemType: ItemType.Ammo,
        maxStackSize: 60,
        defaultCasingFrame: "casing_762x51mm"
    },
    {
        idString: "9mm",
        name: "9mm",
        itemType: ItemType.Ammo,
        maxStackSize: 90,
        defaultCasingFrame: "casing_9x19mm"
    },
    {
        idString: "127mm",
        name: "12.7mm",
        itemType: ItemType.Ammo,
        maxStackSize: 10,
        defaultCasingFrame: "casing_50bmg",
        hideUnlessPresent: true
    },
    {
        idString: "curadell",
        name: "Curadell",
        itemType: ItemType.Ammo,
        maxStackSize: 10,
        defaultCasingFrame: "casing_curadell",
        hideUnlessPresent: true
    },
    /*
    {
        idString: "50ae",
        name: ".50 AE",
        itemType: ItemType.Ammo
    }, */

    // Ephemeral ammo types below

    {
        idString: "power_cell",
        name: "P.O.W.E.R. cell",
        itemType: ItemType.Ammo,
        maxStackSize: 10,
        defaultCasingFrame: "casing_power_cell",
        ephemeral: true
    },
    {
        idString: "bb",
        name: "6mm BB",
        itemType: ItemType.Ammo,
        maxStackSize: 240,
        ephemeral: true
    }
]);
