import { type ItemDefinition, ItemType } from "../utils/objectDefinitions";

export interface SkinDefinition extends ItemDefinition {
    readonly itemType: ItemType.Skin
    readonly notInLoadout?: boolean
    readonly roleRequired?: string
    readonly noDrop?: boolean
}

export const Skins: SkinDefinition[] = [
    {
        idString: "hasanger",
        name: "Hasanger",
        itemType: ItemType.Skin,
        roleRequired: "hasanger"
    },
    {
        idString: "leia",
        name: "Leia",
        itemType: ItemType.Skin,
        roleRequired: "leia"
    },
    {
        idString: "katie",
        name: "Katie",
        itemType: ItemType.Skin,
        roleRequired: "katie"
    },
    {
        idString: "eipi",
        name: "eiπ",
        itemType: ItemType.Skin,
        roleRequired: "eipi"
    },
    {
        idString: "123op",
        name: "123OP",
        itemType: ItemType.Skin,
        roleRequired: "123op"
    },
    {
        idString: "dev",
        name: "Developer Swag",
        itemType: ItemType.Skin,
        roleRequired: "dev"
    },
    {
        idString: "artist",
        name: "Artist Swag",
        itemType: ItemType.Skin,
        roleRequired: "artist"
    },
    {
        idString: "desert_camo",
        name: "Desert Camo",
        itemType: ItemType.Skin
    },
    {
        idString: "forest_camo",
        name: "Forest Camo",
        itemType: ItemType.Skin,
        notInLoadout: true
    },
    {
        idString: "arctic_camo",
        name: "Arctic Camo",
        itemType: ItemType.Skin
    },
    {
        idString: "red_hot",
        name: "Red Hot",
        itemType: ItemType.Skin
    },
    {
        idString: "neon_green",
        name: "Neon Green",
        itemType: ItemType.Skin
    },
    {
        idString: "deep_blue",
        name: "Deep Blue",
        itemType: ItemType.Skin
    },
    {
        idString: "pure_silver",
        name: "Pure Silver",
        itemType: ItemType.Skin
    },
    {
        idString: "pure_gold",
        name: "Pure Gold",
        itemType: ItemType.Skin
    },
    {
        idString: "gunmetal",
        name: "Gunmetal",
        itemType: ItemType.Skin
    },
    {
        idString: "hyper_green",
        name: "Hyper Green",
        itemType: ItemType.Skin
    },
    {
        idString: "hyper_blue",
        name: "Hyper Blue",
        itemType: ItemType.Skin
    },
    {
        idString: "sunset",
        name: "Sunset",
        itemType: ItemType.Skin
    },
    {
        idString: "solar_flare",
        name: "Solar Flare",
        itemType: ItemType.Skin
    },
    {
        idString: "full_moon",
        name: "Full Moon",
        itemType: ItemType.Skin
    },
    {
        idString: "beacon",
        name: "Beacon",
        itemType: ItemType.Skin
    },
    {
        idString: "swiss_cheese",
        name: "Swiss Cheese",
        itemType: ItemType.Skin
    },
    {
        idString: "target_practice",
        name: "Target Practice",
        itemType: ItemType.Skin
    },
    {
        idString: "zebra",
        name: "Zebra",
        itemType: ItemType.Skin
    },
    {
        idString: "nokilpls",
        name: "no kil pls",
        itemType: ItemType.Skin,
        notInLoadout: true
    }
];
