import { type ItemDefinition, ItemType, ObjectDefinitions } from "../utils/objectDefinitions";

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
    readonly hideUnlessPresent?: boolean
}

export const Ammos = new ObjectDefinitions<AmmoDefinition>([
    {
        idString: "12g",
        name: "12 gauge",
        itemType: ItemType.Ammo,
        maxStackSize: 20
    },
    {
        idString: "556mm",
        name: "5.56mm",
        itemType: ItemType.Ammo,
        maxStackSize: 60
    },
    {
        idString: "762mm",
        name: "7.62mm",
        itemType: ItemType.Ammo,
        maxStackSize: 60
    },
    {
        idString: "9mm",
        name: "9mm",
        itemType: ItemType.Ammo,
        maxStackSize: 90
    },
    {
        idString: "127mm",
        name: "12.7mm",
        itemType: ItemType.Ammo,
        maxStackSize: 10,
        hideUnlessPresent: true
    },
    {
        idString: "curadell",
        name: "Curadell",
        itemType: ItemType.Ammo,
        maxStackSize: 10,
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
