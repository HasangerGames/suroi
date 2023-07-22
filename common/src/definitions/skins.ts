import { type ObjectDefinition } from "../utils/objectDefinitions";

export interface SkinDefinition extends ObjectDefinition {
    notInLoadout?: boolean
    roleRequired?: string
    noDrop?: boolean
}

export const Skins = [
    {
        idString: "hasanger",
        name: "Hasanger",
        roleRequired: "hasanger"
    },
    {
        idString: "leia",
        name: "Leia",
        roleRequired: "leia"
    },
    {
        idString: "katie",
        name: "Katie",
        roleRequired: "katie"
    },
    {
        idString: "eipi",
        name: "eiπ",
        roleRequired: "eipi"
    },
    {
        idString: "123op",
        name: "123OP",
        roleRequired: "123op"
    },
    {
        idString: "dev",
        name: "Developer Swag",
        roleRequired: "dev"
    },
    {
        idString: "artist",
        name: "Artist Swag",
        roleRequired: "artist"
    },
    {
        idString: "desert_camo",
        name: "Desert Camo"
    },
    {
        idString: "forest_camo",
        name: "Forest Camo",
        notInLoadout: true
    },
    {
        idString: "arctic_camo",
        name: "Arctic Camo"
    },
    {
        idString: "red_hot",
        name: "Red Hot"
    },
    {
        idString: "neon_green",
        name: "Neon Green"
    },
    {
        idString: "deep_blue",
        name: "Deep Blue"
    },
    {
        idString: "pure_silver",
        name: "Pure Silver"
    },
    {
        idString: "pure_gold",
        name: "Pure Gold"
    },
    {
        idString: "gunmetal",
        name: "Gunmetal"
    },
    {
        idString: "hyper_green",
        name: "Hyper Green"
    },
    {
        idString: "hyper_blue",
        name: "Hyper Blue"
    },
    {
        idString: "sunset",
        name: "Sunset"
    },
    {
        idString: "solar_flare",
        name: "Solar Flare"
    },
    {
        idString: "full_moon",
        name: "Full Moon"
    },
    {
        idString: "beacon",
        name: "Beacon"
    },
    {
        idString: "swiss_cheese",
        name: "Swiss Cheese"
    },
    {
        idString: "target_practice",
        name: "Target Practice"
    },
    {
        idString: "zebra",
        name: "Zebra"
    },
    {
        idString: "nokilpls",
        name: "no kil pls",
        notInLoadout: true
    }
];
