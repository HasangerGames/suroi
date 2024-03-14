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
    apply => [
        // @ts-expect-error Ts being weird again
        apply("with_role", {}, ["hasanger"], ["Hasanger"]),
        apply("with_role", {}, ["leia"], ["Leia"]),
        apply("with_role", {}, ["limenade"], ["LimeNade"]),
        apply("with_role", {}, ["katie"], ["Katie"]),
        apply("with_role", {}, ["eipi"], ["eiπ"]),
        apply("with_role", {}, ["123op"], ["123OP"]),
        apply("with_role", {}, ["radians"], ["Radians"]),
        apply("with_role", {}, ["developr"], ["Developr Swag"]),
        apply("with_role", {}, ["designr"], ["Designr Swag"]),
        apply("skin_factory", {}, "HAZEL Jumpsuit"),
        apply("skin_factory", {}, "Forest Camo"),
        apply("skin_factory", {}, "Desert Camo"),
        apply("skin_factory", {}, "Arctic Camo"),
        apply("skin_factory", {}, "Bloodlust"),
        apply("skin_factory", {}, "Tomato"),
        apply("skin_factory", {}, "Greenhorn"),
        apply("skin_factory", {}, "Blue Blood"),
        apply("skin_factory", {}, "Silver Lining"),
        apply("skin_factory", {}, "Pot o' Gold"),
        apply("skin_factory", {}, "Gunmetal"),
        apply("skin_factory", {}, "Algae"),
        apply("skin_factory", {}, "Twilight Zone"),
        apply("skin_factory", {}, "Bubblegum"),
        apply("skin_factory", {}, "Sunrise"),
        apply("skin_factory", {}, "Sunset"),
        apply("skin_factory", {}, "Stratosphere"),
        apply("skin_factory", {}, "Mango"),
        apply("skin_factory", {}, "Snow Cone"),
        apply("skin_factory", {}, "Aquatic"),
        apply("skin_factory", {}, "Floral"),
        apply("skin_factory", {}, "Sunny"),
        apply("skin_factory", {}, "Volcanic"),
        apply("skin_factory", {}, "Ashfall"),
        apply("skin_factory", {}, "Solar Flare"),
        apply("skin_factory", {}, "Beacon"),
        apply("skin_factory", {}, "Wave Jumpsuit"),
        apply("skin_factory", {}, "Toadstool"),
        apply("skin_factory", {}, "Full Moon"),
        apply("hidden_skin", {}, [], ["Basic Outfit"]),
        apply("skin_factory", {}, "Swiss Cheese"),
        apply("skin_factory", {}, "Target Practice"),
        apply("skin_factory", {}, "Zebra"),
        apply("skin_factory", {}, "Tiger"),
        apply("skin_factory", {}, "Bee"),
        apply("skin_factory", {}, "Armadillo"),
        apply("skin_factory", {}, "Printer"),
        apply("skin_factory", {}, "Distant Shores"),
        apply("hidden_skin", {}, [], ["Peppermint"]),
        apply("hidden_skin", {}, [], ["Spearmint"]),
        apply("hidden_skin", {}, [], ["Coal"]),
        apply("hidden_skin", {}, [], ["Henry's Little Helper"]),
        apply("hidden_skin", {}, [], ["Candy Cane"]),
        apply("hidden_skin", {}, [], ["Christmas Tree"]),
        apply("hidden_skin", {}, [], ["Gingerbread"]),
        apply("hidden_skin", {}, [], ["Verified"]),
        apply("hidden_skin", {}, [], ["no kil pls"]),
        apply("hidden_skin", {}, [], ["Stardust"]),
        apply("hidden_skin", {}, [], ["Aurora"]),
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
