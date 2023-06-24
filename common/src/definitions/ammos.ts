import { type ItemDefinition, ItemType } from "../utils/objectDefinitions";

export interface AmmoDefinition extends ItemDefinition {
    readonly itemType: ItemType.Ammo
}

export const Ammos: AmmoDefinition[] = [
    {
        idString: "12g_ammo",
        name: "12 gauge",
        itemType: ItemType.Ammo
    },
    {
        idString: "556mm_ammo",
        name: "5.56mm",
        itemType: ItemType.Ammo
    },
    {
        idString: "762mm_ammo",
        name: "7.62mm",
        itemType: ItemType.Ammo
    },
    {
        idString: "9mm_ammo",
        name: "9mm",
        itemType: ItemType.Ammo
    }/*,
    {
        idString: "50ae_ammo",
        name: ".50 AE",
        itemType: ItemType.Ammo
    },
    {
        idString: "127mm_ammo",
        name: "12.7mm",
        itemType: ItemType.Ammo
    }*/
];
