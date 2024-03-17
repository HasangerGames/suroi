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
        simple("skin_factory", "HAZEL Jumpsuit"),
        simple("skin_factory", "Forest Camo"),
        simple("skin_factory", "Desert Camo"),
        simple("skin_factory", "Arctic Camo"),
        simple("skin_factory", "Bloodlust"),
        simple("skin_factory", "Tomato"),
        simple("skin_factory", "Greenhorn"),
        simple("skin_factory", "Blue Blood"),
        simple("skin_factory", "Silver Lining"),
        simple("skin_factory", "Pot o' Gold"),
        simple("skin_factory", "Gunmetal"),
        simple("skin_factory", "Algae"),
        simple("skin_factory", "Twilight Zone"),
        simple("skin_factory", "Bubblegum"),
        simple("skin_factory", "Sunrise"),
        simple("skin_factory", "Sunset"),
        simple("skin_factory", "Stratosphere"),
        simple("skin_factory", "Mango"),
        simple("skin_factory", "Snow Cone"),
        simple("skin_factory", "Aquatic"),
        simple("skin_factory", "Floral"),
        simple("skin_factory", "Sunny"),
        simple("skin_factory", "Volcanic"),
        simple("skin_factory", "Ashfall"),
        simple("skin_factory", "Solar Flare"),
        simple("skin_factory", "Beacon"),
        simple("skin_factory", "Wave Jumpsuit"),
        simple("skin_factory", "Toadstool"),
        simple("skin_factory", "Full Moon"),
        simple("hidden_skin", [], ["Basic Outfit"]),
        simple("skin_factory", "Swiss Cheese"),
        simple("skin_factory", "Target Practice"),
        simple("skin_factory", "Zebra"),
        simple("skin_factory", "Tiger"),
        simple("skin_factory", "Bee"),
        simple("skin_factory", "Armadillo"),
        simple("skin_factory", "Printer"),
        simple("skin_factory", "Distant Shores"),
        simple("hidden_skin", [], ["Peppermint"]),
        simple("hidden_skin", [], ["Spearmint"]),
        simple("hidden_skin", [], ["Coal"]),
        simple("hidden_skin", [], ["Henry's Little Helper"]),
        simple("hidden_skin", [], ["Candy Cane"]),
        simple("hidden_skin", [], ["Christmas Tree"]),
        simple("hidden_skin", [], ["Gingerbread"]),
        simple("hidden_skin", [], ["Verified"]),
        simple("hidden_skin", [], ["no kil pls"]),
        simple("hidden_skin", [], ["Stardust"]),
        simple("hidden_skin", [], ["Aurora"]),
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
