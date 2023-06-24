import { type ItemDefinition, ItemType } from "../utils/objectDefinitions";

export interface AmmoDefinition extends ItemDefinition {
    readonly itemType: ItemType.Ammo
}

export const Ammos: AmmoDefinition[] = [
    {
        idString: "12g",
        name: "12 gauge",
        itemType: ItemType.Ammo
    },
    {
        idString: "556mm",
        name: "5.56mm",
        itemType: ItemType.Ammo
    },
    {
        idString: "762mm",
        name: "7.62mm",
        itemType: ItemType.Ammo
    },
    {
        idString: "9mm",
        name: "9mm",
        itemType: ItemType.Ammo
    }/*,
    {
        idString: "50ae",
        name: ".50 AE",
        itemType: ItemType.Ammo
    },
    {
        idString: "127mm",
        name: "12.7mm",
        itemType: ItemType.Ammo
    }*/
];
