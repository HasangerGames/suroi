import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface SkinDefinition extends ItemDefinition {
    readonly itemType: ItemType.Skin
    readonly hideFromLoadout: boolean
    readonly grassTint: boolean
    readonly backpackTint?: number
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
        skin_factory: (name: string, backpackTint?: number) => ({
            idString: name.toLowerCase().replace(/'/g, "").replace(/ /g, "_"),
            backpackTint,
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
        simple("with_role", ["hasanger"], ["Hasanger", 0x640000]),
        simple("with_role", ["leia"], ["Leia"]),
        simple("with_role", ["limenade"], ["LimeNade"]),
        simple("with_role", ["katie"], ["Katie"]),
        simple("with_role", ["eipi"], ["eipi"]),
        simple("with_role", ["error"], ["error"]),
        simple("with_role", ["kenos"], ["Kenos"]),
        simple("with_role", ["123op"], ["123OP"]),
        simple("with_role", ["radians"], ["Radians"]),
        simple("with_role", ["developr"], ["Developr Swag"]),
        simple("with_role", ["designr"], ["Designr Swag"]),
        simple("with_role", ["composr"], ["Composr Swag"]),
        ...([
            ["HAZEL Jumpsuit", 0xb4a894],
            ["The Amateur", 0x9b8767],
            ["The Pro", 0x9d732c],
            ["Forest Camo"],
            ["Desert Camo"],
            ["Arctic Camo"],
            ["Bloodlust"],
            ["Tomato", 0xff0000],
            ["Greenhorn", 0x00ff00],
            ["Blue Blood", 0x0000ff],
            ["Silver Lining", 0xe1e1e1],
            ["Pot o' Gold", 0xffd852],
            ["Gunmetal", 0x4c4c4c],
            ["Algae", 0x00e0e3],
            ["Twilight Zone", 0x8304cd],
            ["Bubblegum", 0xea94ff],
            ["Sunrise", 0x495f8c],
            ["Sunset", 0xfcb045],
            ["Stratosphere", 0x0079ff],
            ["Mango", 0xff7c00],
            ["Snow Cone", 0x00ebff],
            ["Aquatic", 0x00326a],
            ["Floral", 0xdc73bd],
            ["Sunny"],
            ["Volcanic"],
            ["Ashfall"],
            ["Solar Flare"],
            ["Beacon"],
            ["Wave Jumpsuit"],
            ["Toadstool"],
            ["Full Moon"],
            ["Swiss Cheese"],
            ["Target Practice"],
            ["Zebra"],
            ["Tiger"],
            ["Bee"],
            ["Armadillo"],
            ["Printer"],
            ["Distant Shores"],
            ["Watermelon"]
        ] as ReadonlyArray<readonly [string, number | undefined]>).map(([name, tint]) => simple("skin_factory", name, tint)),
        ...([
            ["Lemon", 0xebe092],
            ["Flamingo", 0xf1847d],
            ["Peachy Breeze", 0xf2a263],
            ["Deep Sea", 0x284553],
            ["Basic Outfit", 0xdd9b0a],
            ["Peppermint", undefined],
            ["Spearmint", undefined],
            ["Coal", undefined],
            ["Henry's Little Helper", undefined],
            ["Candy Cane", undefined],
            ["Christmas Tree", undefined],
            ["Gingerbread", undefined],
            ["Verified", undefined],
            ["no kil pls", undefined],
            ["Stardust", undefined],
            ["Aurora", undefined],
            ["Nebula", undefined],
            ["1st Birthday", undefined]
        ] as ReadonlyArray<readonly [string, number | undefined]>).map(([name, tint]) => simple("hidden_skin", [], [name, tint])),
        apply(
            "hidden_skin",
            {
                grassTint: true,
                hideEquipment: true
            },
            [],
            ["Ghillie Suit", 0xffffff]
        )
    ]
);
