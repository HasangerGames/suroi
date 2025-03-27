import { ItemType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";

export interface AmmoDefinition extends ItemDefinition {
    readonly itemType: ItemType.Ammo
    readonly maxStackSize: number
    readonly minDropAmount: number
    readonly characteristicColor: {
        readonly hue: number
        readonly saturation: number
        readonly lightness: number
    }
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
        minDropAmount: 3,
        characteristicColor: {
            hue: 0,
            saturation: 100,
            lightness: 89
        },
        defaultCasingFrame: "casing_12ga_275in"
    },
    {
        idString: "556mm",
        name: "5.56mm",
        itemType: ItemType.Ammo,
        maxStackSize: 60,
        minDropAmount: 5,
        characteristicColor: {
            hue: 120,
            saturation: 100,
            lightness: 75
        },
        defaultCasingFrame: "casing_556x45mm"
    },
    {
        idString: "762mm",
        name: "7.62mm",
        itemType: ItemType.Ammo,
        maxStackSize: 60,
        minDropAmount: 5,
        characteristicColor: {
            hue: 210,
            saturation: 100,
            lightness: 65
        },
        defaultCasingFrame: "casing_762x51mm"
    },
    {
        idString: "9mm",
        name: "9mm",
        itemType: ItemType.Ammo,
        maxStackSize: 90,
        minDropAmount: 5,
        characteristicColor: {
            hue: 48,
            saturation: 100,
            lightness: 75
        },
        defaultCasingFrame: "casing_9x19mm"
    },
    {
        idString: "50cal",
        name: ".50 Cal",
        itemType: ItemType.Ammo,
        maxStackSize: 9,
        minDropAmount: 3,
        characteristicColor: {
            hue: 0,
            saturation: 0,
            lightness: 0
        },
        defaultCasingFrame: "casing_50bmg",
        hideUnlessPresent: true
    },
    {
        idString: "338lap",
        name: ".338 Lapua Magnum",
        itemType: ItemType.Ammo,
        maxStackSize: 9,
        minDropAmount: 3,
        characteristicColor: {
            hue: 75,
            saturation: 100,
            lightness: 75
        },
        defaultCasingFrame: "casing_338lap",
        hideUnlessPresent: true
    },
    {
        idString: "curadell",
        name: "Curadell",
        itemType: ItemType.Ammo,
        maxStackSize: 10,
        minDropAmount: 1,
        characteristicColor: {
            hue: 26,
            saturation: 100,
            lightness: 75
        },
        defaultCasingFrame: "casing_curadell",
        hideUnlessPresent: true
    },
    {
        idString: "firework_rocket",
        name: "Firework Rocket",
        itemType: ItemType.Ammo,
        maxStackSize: 5,
        minDropAmount: 1,
        characteristicColor: {
            hue: 0,
            saturation: 55,
            lightness: 85
        },
        defaultCasingFrame: "casing_firework_rocket",
        hideUnlessPresent: true
    },

    // Ephemeral ammo types below

    {
        idString: "seed",
        name: "Plumpkin Seed",
        itemType: ItemType.Ammo,
        maxStackSize: 0,
        minDropAmount: 0,
        characteristicColor: {
            hue: 37,
            saturation: 85,
            lightness: 67
        },
        ephemeral: true
    },
    {
        idString: "needle",
        name: "Needle",
        itemType: ItemType.Ammo,
        maxStackSize: 0,
        minDropAmount: 0,
        characteristicColor: {
            hue: 305,
            saturation: 70,
            lightness: 50
        },
        ephemeral: true
    },
    {
        idString: "power_cell",
        name: "P.O.W.E.R. cell",
        itemType: ItemType.Ammo,
        maxStackSize: 10,
        minDropAmount: 1,
        characteristicColor: {
            hue: 190,
            saturation: 100,
            lightness: 85
        },
        defaultCasingFrame: "casing_power_cell",
        ephemeral: true
    },
    {
        idString: "bb",
        name: "6mm BB",
        itemType: ItemType.Ammo,
        maxStackSize: 240,
        minDropAmount: 1,
        characteristicColor: {
            hue: 0,
            saturation: 0,
            lightness: 75
        },
        ephemeral: true
    }
]);
