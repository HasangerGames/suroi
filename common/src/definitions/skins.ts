import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface SkinDefinition extends ItemDefinition {
    readonly itemType: ItemType.Skin
    readonly hideFromLoadout: boolean
    readonly grassTint: boolean
    readonly hideEquipment: boolean
    readonly roleRequired?: string
}

export const Skins = ObjectDefinitions.create<SkinDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            itemType: ItemType.Skin,
            noDrop: false,
            hideFromLoadout: false,
            grassTint: false,
            hideEquipment: false
        }),
        skin_factory: (name: string) => ({
            idString: name.toLowerCase().replace(/'/g, "").replace(/ /g, "_"),
            name
        }),
        hidden_skin: {
            extends: "skin_factory",
            applier: () => ({
                hideFromLoadout: true
            })
        },
        with_role: {
            extends: "skin_factory",
            applier: (role: string) => ({
                roleRequired: role
            })
        }
    })
)(
    ({ apply, simple }) => [
        simple("with_role", ["hasanger"], ["Hasanger"]),
        simple("with_role", ["leia"], ["Leia"]),
        simple("with_role", ["limenade"], ["LimeNade"]),
        simple("with_role", ["katie"], ["Katie"]),
        simple("with_role", ["eipi"], ["eipi"]),
        simple("with_role", ["123op"], ["123OP"]),
        simple("with_role", ["radians"], ["Radians"]),
        simple("with_role", ["developr"], ["Developr Swag"]),
        simple("with_role", ["designr"], ["Designr Swag"]),
        simple("with_role", ["composr"], ["Composr Swag"]),
        ...[
            "HAZEL Jumpsuit",
            "The Amateur",
            "The Pro",
            "Forest Camo",
            "Desert Camo",
            "Arctic Camo",
            "Bloodlust",
            "Tomato",
            "Greenhorn",
            "Blue Blood",
            "Silver Lining",
            "Pot o' Gold",
            "Gunmetal",
            "Algae",
            "Twilight Zone",
            "Bubblegum",
            "Sunrise",
            "Sunset",
            "Stratosphere",
            "Mango",
            "Snow Cone",
            "Aquatic",
            "Floral",
            "Sunny",
            "Volcanic",
            "Ashfall",
            "Solar Flare",
            "Beacon",
            "Wave Jumpsuit",
            "Toadstool",
            "Full Moon",
            "Swiss Cheese",
            "Target Practice",
            "Zebra",
            "Tiger",
            "Bee",
            "Armadillo",
            "Printer",
            "Distant Shores"
        ].map(name => simple("skin_factory", name)),
        ...[
            "Lemon",
            "Flamingo",
            "Peachy Breeze",
            "Deep Sea",
            "Basic Outfit",
            "Peppermint",
            "Spearmint",
            "Coal",
            "Henry's Little Helper",
            "Candy Cane",
            "Christmas Tree",
            "Gingerbread",
            "Verified",
            "no kil pls",
            "Stardust",
            "Aurora",
            "Nebula"
        ].map(name => simple("hidden_skin", [], [name])),
        apply(
            "hidden_skin",
            {
                grassTint: true,
                hideEquipment: true
            },
            [],
            ["Ghillie Suit"]
        )
    ]
);
