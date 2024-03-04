import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface SkinDefinition extends ItemDefinition {
    readonly itemType: ItemType.Skin
    readonly hideFromLoadout?: boolean
    readonly grassTint?: boolean
    readonly hideEquipment?: boolean
    readonly roleRequired?: string
}

export const Skins = new ObjectDefinitions<SkinDefinition>([
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
        idString: "limenade",
        name: "LimeNade",
        itemType: ItemType.Skin,
        roleRequired: "limenade"
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
        idString: "radians",
        name: "Radians",
        itemType: ItemType.Skin,
        roleRequired: "radians"
    },
    {
        idString: "developr",
        name: "Developr Swag",
        itemType: ItemType.Skin,
        roleRequired: "developr"
    },
    {
        idString: "designr",
        name: "Designr Swag",
        itemType: ItemType.Skin,
        roleRequired: "designr"
    },
    {
        idString: "hazel_jumpsuit",
        name: "HAZEL Jumpsuit",
        itemType: ItemType.Skin
    },
    {
        idString: "forest_camo",
        name: "Forest Camo",
        itemType: ItemType.Skin
    },
    {
        idString: "desert_camo",
        name: "Desert Camo",
        itemType: ItemType.Skin
    },
    {
        idString: "arctic_camo",
        name: "Arctic Camo",
        itemType: ItemType.Skin
    },
    {
        idString: "bloodlust",
        name: "Bloodlust",
        itemType: ItemType.Skin
    },
    {
        idString: "tomato_skin",
        name: "Tomato",
        itemType: ItemType.Skin
    },
    {
        idString: "greenhorn",
        name: "Greenhorn",
        itemType: ItemType.Skin
    },
    {
        idString: "blue_blood",
        name: "Blue Blood",
        itemType: ItemType.Skin
    },
    {
        idString: "silver_lining",
        name: "Silver Lining",
        itemType: ItemType.Skin
    },
    {
        idString: "pot_o_gold",
        name: "Pot o' Gold",
        itemType: ItemType.Skin
    },
    {
        idString: "gunmetal",
        name: "Gunmetal",
        itemType: ItemType.Skin
    },
    {
        idString: "algae",
        name: "Algae",
        itemType: ItemType.Skin
    },
    {
        idString: "twilight_zone",
        name: "Twilight Zone",
        itemType: ItemType.Skin
    },
    {
        idString: "bubblegum",
        name: "Bubblegum",
        itemType: ItemType.Skin
    },
    {
        idString: "sunrise",
        name: "Sunrise",
        itemType: ItemType.Skin
    },
    {
        idString: "sunset",
        name: "Sunset",
        itemType: ItemType.Skin
    },
    {
        idString: "stratosphere",
        name: "Stratosphere",
        itemType: ItemType.Skin
    },
    {
        idString: "mango",
        name: "Mango",
        itemType: ItemType.Skin
    },
    {
        idString: "snow_cone",
        name: "Snow Cone",
        itemType: ItemType.Skin
    },
    {
        idString: "aquatic",
        name: "Aquatic",
        itemType: ItemType.Skin
    },
    {
        idString: "floral",
        name: "Floral",
        itemType: ItemType.Skin
    },
    {
        idString: "sunny",
        name: "Sunny",
        itemType: ItemType.Skin
    },
    {
        idString: "volcanic",
        name: "Volcanic",
        itemType: ItemType.Skin
    },
    {
        idString: "ashfall",
        name: "Ashfall",
        itemType: ItemType.Skin
    },
    {
        idString: "solar_flare",
        name: "Solar Flare",
        itemType: ItemType.Skin
    },
    {
        idString: "beacon",
        name: "Beacon",
        itemType: ItemType.Skin
    },
    {
        idString: "wave_jumpsuit",
        name: "Wave Jumpsuit",
        itemType: ItemType.Skin
    },
    {
        idString: "toadstool",
        name: "Toadstool",
        itemType: ItemType.Skin
    },
    {
        idString: "full_moon",
        name: "Full Moon",
        itemType: ItemType.Skin
    },
    {
        idString: "basic_outfit",
        name: "Basic Outfit",
        itemType: ItemType.Skin,
        hideFromLoadout: true
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
        idString: "tiger",
        name: "Tiger",
        itemType: ItemType.Skin
    },
    {
        idString: "bee",
        name: "Bee",
        itemType: ItemType.Skin
    },
    {
        idString: "armadillo",
        name: "Armadillo",
        itemType: ItemType.Skin
    },
    {
        idString: "printer",
        name: "Printer",
        itemType: ItemType.Skin
    },
    {
        idString: "distant_shores",
        name: "Distant Shores",
        itemType: ItemType.Skin
    },
    {
        idString: "peppermint",
        name: "Peppermint",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "spearmint",
        name: "Spearmint",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "coal",
        name: "Coal",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "henrys_little_helper",
        name: "Henry's Little Helper",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "candy_cane",
        name: "Candy Cane",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "christmas_tree_skin",
        name: "Christmas Tree",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "gingerbread",
        name: "Gingerbread",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "verified",
        name: "Verified",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "nokilpls",
        name: "no kil pls",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "stardust",
        name: "Stardust",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "aurora",
        name: "Aurora",
        itemType: ItemType.Skin,
        hideFromLoadout: true
    },
    {
        idString: "ghillie_suit",
        name: "Ghillie Suit",
        itemType: ItemType.Skin,
        grassTint: true,
        hideEquipment: true,
        hideFromLoadout: true
    }
]);
