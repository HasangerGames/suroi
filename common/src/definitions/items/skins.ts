import { DefinitionType, ItemType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";

/*
    eslint-disable @stylistic/no-multi-spaces
*/

/*
    `@stylistic/no-multi-spaces`: Disabled to allow nicer alignment
*/

export interface SkinDefinition extends ItemDefinition {
    readonly defType: DefinitionType.Skin
    readonly itemType: ItemType.Skin
    readonly hideFromLoadout?: boolean
    readonly grassTint?: boolean
    readonly backpackTint?: number
    readonly hideEquipment?: boolean
    readonly rolesRequired?: string[]
    readonly hideBlood?: boolean
    readonly noSwap?: boolean
}

const skin = (name: string, backpackTint?: number, rolesRequired?: string[]): SkinDefinition => ({
    idString: name.toLowerCase().replace(/'/g, "").replace(/ /g, "_"),
    name,
    defType: DefinitionType.Skin,
    itemType: ItemType.Skin,
    backpackTint,
    rolesRequired
});

export const Skins = new ObjectDefinitions<SkinDefinition>([
    // Dev funny skins
    skin("Hasanger",    0x640000, ["hasanger"]),
    skin("Pap",         0x00366b, ["pap"]),
    skin("Zedaes",      0x052105, ["zedaes"]),

    // Role skins
    skin("Developr Swag",      0x007a7f, ["developr", "pap"]),
    skin("Designr Swag",       0x67cf00, ["designr", "vip_designr"]),
    skin("Sound Designr Swag", 0x3e8476, ["sound_designr"]),
    ...([
        ["HAZEL Jumpsuit",  0xb4a894],
        ["The Amateur",     0x9b8767],
        ["The Pro",         0x9d732c],
        ["Forest Camo",     0x634421],
        ["Desert Camo",     0xdcc993],
        ["Arctic Camo",     0xececec],
        ["Bloodlust",       0x565656],
        ["Red Tomato",      0xff0000],
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
        ["Distant Shores",  0x7eca83],
        ["Celestial",       0xd2e3fb]
    ] satisfies ReadonlyArray<readonly [string, number]>).map(([name, tint]) => skin(name, tint)),
    ...([
        ["Lemon",                 0xebe092],
        ["Flamingo",              0xf1847d],
        ["Peachy Breeze",         0xf2a263],
        ["Deep Sea",              0x284553],
        ["Ancestral Garb",        0x816537],
        ["Timeless",              0x1a1a1a],
        ["Peppermint",            0xb40030],
        ["Spearmint",             0x115724],
        ["Coal",                  0x424242],
        ["Henry's Little Helper", 0x059100],
        ["Candy Cane",            0xf4f4f4],
        ["Holiday Tree",          0x23883f],
        ["Gingerbread",           0xb55c12],
        ["Light Choco",           0xffd99e],
        ["Frosty",                0xa2f3ff],
        ["Verified",              0x4790ff],
        ["no kil pls",            0x6b6b6b],
        ["Stardust",              0x16448b],
        ["Aurora",                0x1d2f58],
        ["Nebula",                0x28a0b7],
        ["1st Birthday",          0xed8080],
        ["Lumberjack",            0x924a24],
        ["Gold Tie Event",        0x2b2929],
        ["Ship Carrier",          0x679bd9],
        ["Cargo Wave",            0xd0bbd7],
        ["Military Camo",         0x54483a],
        ["NSD Uniform",           0x593b26],
        ["Pumpkified",            0x402000],
        ["One at NSD",            0x27331a],
        ["Sky",                   0x002121],
        ["Diseased",              0x2d1f1f],
        ["Deer Season",           0x9a3604]
    ] satisfies ReadonlyArray<readonly [string, number]>).map(([name, tint]) => ({ ...skin(name, tint), hideFromLoadout: true })),
    {
        ...skin("Werewolf", 0x323232),
        hideFromLoadout: true,
        noSwap: true,
        noDrop: true
    },
    {
        ...skin("Ghillie Suit", 0xffffff),
        hideFromLoadout: true,
        grassTint: true,
        hideEquipment: true,
        hideBlood: true
    }
]);
