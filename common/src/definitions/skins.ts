import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

/*
    eslint-disable @stylistic/no-multi-spaces
*/

/*
    `@stylistic/no-multi-spaces`: Disabled to allow nicer alignment
*/

export interface SkinDefinition extends ItemDefinition {
    readonly itemType: ItemType.Skin
    readonly hideFromLoadout: boolean
    readonly grassTint: boolean
    readonly backpackTint?: number
    readonly hideEquipment: boolean
    readonly roleRequired?: string
    readonly hideBlood?: boolean
}

export const Skins = ObjectDefinitions.create<SkinDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            itemType: ItemType.Skin,
            noDrop: false,
            hideFromLoadout: false,
            grassTint: false,
            hideEquipment: false,
            hideBlood: false
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
        simple("with_role", ["hasanger"], ["Hasanger",      0x640000]),
        simple("with_role", ["limenade"], ["LimeNade",      0xffffff]),
        simple("with_role", ["katie"],    ["Katie",         0x7784f0]),
        simple("with_role", ["eipi"],     ["eipi",          0x8040BF]),
        simple("with_role", ["error"],    ["error",         0x1fc462]),
        simple("with_role", ["pap"],      ["pap",           0x060647]),
        simple("with_role", ["123op"],    ["123OP",         0x0000ff]),
        simple("with_role", ["developr"], ["Developr Swag", 0x007a7f]),
        simple("with_role", ["designr"],  ["Designr Swag",  0x67cf00]),
        simple("with_role", ["composr"],  ["Composr Swag",  0xffd101]),
        ...([
            ["HAZEL Jumpsuit",  0xb4a894],
            ["The Amateur",     0x9b8767],
            ["The Pro",         0x9d732c],
            ["Forest Camo",     0x634421],
            ["Desert Camo",     0xdcc993],
            ["Arctic Camo",     0xececec],
            ["Bloodlust",       0x565656],
            ["Tomato",          0xff0000],
            ["Greenhorn",       0x00ff00],
            ["Blue Blood",      0x0000ff],
            ["Silver Lining",   0xe1e1e1],
            ["Pot o' Gold",     0xffd852],
            ["Gunmetal",        0x4c4c4c],
            ["Algae",           0x00e0e3],
            ["Twilight Zone",   0x2bb0fe],
            ["Bubblegum",       0xea94ff],
            ["Sunrise",         0x495f8c],
            ["Sunset",          0xfcb045],
            ["Stratosphere",    0x0079ff],
            ["Mango",           0xff7c00],
            ["Snow Cone",       0x00ebff],
            ["Aquatic",         0x00326a],
            ["Floral",          0xdc73bd],
            ["Sunny",           0xfce570],
            ["Volcanic",        0xfd5900],
            ["Ashfall",         0x45aafc],
            ["Solar Flare",     0xffa500],
            ["Beacon",          0x474053],
            ["Wave Jumpsuit",   0xaf9c3f],
            ["Toadstool",       0xd6d6d6],
            ["Full Moon",       0xc1c1c1],
            ["Swiss Cheese",    0xffcd00],
            ["Target Practice", 0xff0000],
            ["Zebra",           0x4a4a4a],
            ["Tiger",           0x4a4a4a],
            ["Bee",             0x4a4a4a],
            ["Armadillo",       0xa68c5e],
            ["Printer",         0xffffff],
            ["Distant Shores",  0x7eca83]
        ] satisfies ReadonlyArray<readonly [string, number]>).map(([name, tint]) => simple("skin_factory", name, tint)),
        ...([
            ["Lemon",                 0xebe092],
            ["Flamingo",              0xf1847d],
            ["Silhouette",            0x000000],
            ["Peachy Breeze",         0xf2a263],
            ["Deep Sea",              0x284553],
            ["Basic Outfit",          0xdd9b0a],
            ["Peppermint",            0xb40030],
            ["Spearmint",             0x115724],
            ["Coal",                  0x424242],
            ["Henry's Little Helper", 0x059100],
            ["Candy Cane",            0xf4f4f4],
            ["Christmas Tree",        0x23883f],
            ["Gingerbread",           0xb55c12],
            ["Verified",              0x4790ff],
            ["no kil pls",            0x6b6b6b],
            ["Stardust",              0x16448b],
            ["Aurora",                0x1d2f58],
            ["Nebula",                0x28a0b7],
            ["1st Birthday",          0xed8080],
            ["Lumberjack",            0x924a24]
        ] satisfies ReadonlyArray<readonly [string, number]>).map(([name, tint]) => simple("hidden_skin", [], [name, tint])),
        apply(
            "hidden_skin",
            {
                grassTint: true,
                hideEquipment: true,
                hideBlood: true
            },
            [],
            ["Ghillie Suit", 0xffffff]
        )
    ]
);
