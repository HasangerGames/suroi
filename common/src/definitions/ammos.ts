import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface AmmoDefinition extends ItemDefinition {
    readonly itemType: ItemType.Ammo
    readonly maxStackSize: number
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
    readonly ephemeral: boolean
    readonly defaultCasingFrame: string
    readonly hideUnlessPresent: boolean
}

export const Ammos = ObjectDefinitions.withDefault<AmmoDefinition>()(
    "Ammos",
    {
        itemType: ItemType.Ammo,
        noDrop: false,
        ephemeral: false,
        defaultCasingFrame: "",
        hideUnlessPresent: false
    },
    () => [
        {
            idString: "12g",
            name: "12 gauge",
            maxStackSize: 20,
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
            maxStackSize: 60,
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
            maxStackSize: 60,
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
            maxStackSize: 90,
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
            maxStackSize: 9,
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
            maxStackSize: 9,
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
            maxStackSize: 10,
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
            maxStackSize: 5,
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
            idString: "power_cell",
            name: "P.O.W.E.R. cell",
            maxStackSize: 10,
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
            maxStackSize: 240,
            characteristicColor: {
                hue: 0,
                saturation: 0,
                lightness: 75
            },
            ephemeral: true
        }
    ]
);
