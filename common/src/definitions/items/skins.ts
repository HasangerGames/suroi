import { DefinitionType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";

/*
    eslint-disable @stylistic/no-multi-spaces
*/

/*
    `@stylistic/no-multi-spaces`: Disabled to allow nicer alignment
*/

export interface SkinDefinition extends ItemDefinition {
    readonly defType: DefinitionType.Skin

    readonly hideFromLoadout?: boolean
    readonly grassTint?: boolean
    readonly baseImage?: string
    readonly fistImage?: string
    readonly baseTint?: number
    readonly fistTint?: number
    readonly backpackTint?: number
    readonly hideEquipment?: boolean
    readonly rolesRequired?: string[]
    readonly hideBlood?: boolean
    readonly noSwap?: boolean
}

const skin = (
    name: string,
    baseTint?: number,
    fistTint?: number,
    backpackTint?: number,
    rolesRequired?: string[]
): SkinDefinition => ({
    idString: name.toLowerCase().replace(/'/g, "").replace(/ /g, "_"),
    name,
    defType: DefinitionType.Skin,
    baseImage: baseTint !== undefined ? "plain_base" : undefined,
    fistImage: fistTint !== undefined ? "plain_fist" : undefined,
    baseTint,
    fistTint: fistTint,
    backpackTint,
    rolesRequired
});

export const Skins = new ObjectDefinitions<SkinDefinition>([
    // Dev funny skins
    skin("Hasanger", undefined, undefined, 0x640000, ["hasanger"]),
    skin("Pap",      undefined, undefined, 0x00366b, ["pap"]),

    // Role skins
    skin("Developr Swag",      undefined, undefined, 0x007a7f, ["developr", "pap", "hasanger"]),
    skin("Designr Swag",       undefined, undefined, 0x67cf00, ["designr", "vip_designr"]),
    skin("Sound Designr Swag", undefined, undefined, 0x3e8476, ["sound_designr"]),

    // Standard skins
    ...([
        // NAME               BASE       FIST     BACKPACK
        ["HAZEL Jumpsuit",  0x97866b,  0xb4a894,  0xb4a894],
        ["The Amateur",     0x9d732c,  0x9b8767,  0x9b8767],
        ["The Pro",         0x9b8767,  0x9d732c,  0x9d732c],
        ["Forest Camo",     undefined, 0x988d6d,  0x634421],
        ["Desert Camo",     undefined, 0xccb370,  0xdcc993],
        ["Arctic Camo",     undefined, 0xd9d9d9,  0xececec],
        ["Bloodlust",       undefined, 0xa80035,  0x565656],
        ["Red Tomato",      0xeb1010,  0xd30e0e,  0xff0000],
        ["Greenhorn",       0x10eb10,  0x0dbc0d,  0x00ff00],
        ["Blue Blood",      0x1010eb,  0x0d0dbc,  0x0000ff],
        ["Silver Lining",   undefined, undefined, 0xe1e1e1],
        ["Pot o' Gold",     undefined, undefined, 0xffd852],
        ["Gunmetal",        undefined, 0x4d4d4d,  0x4c4c4c],
        ["Algae",           undefined, undefined, 0x00e0e3],
        ["Twilight Zone",   undefined, undefined, 0x2bb0fe],
        ["Bubblegum",       undefined, undefined, 0xea94ff],
        ["Sunrise",         undefined, undefined, 0x495f8c],
        ["Sunset",          undefined, undefined, 0xfcb045],
        ["Stratosphere",    undefined, undefined, 0x0079ff],
        ["Mango",           undefined, undefined, 0xff7c00],
        ["Snow Cone",       undefined, undefined, 0x00ebff],
        ["Aquatic",         undefined, undefined, 0x00326a],
        ["Floral",          undefined, undefined, 0xdc73bd],
        ["Sunny",           undefined, undefined, 0xfce570],
        ["Volcanic",        undefined, undefined, 0xfd5900],
        ["Ashfall",         undefined, undefined, 0x45aafc],
        ["Solar Flare",     undefined, undefined, 0xffa500],
        ["Beacon",          undefined, 0x474053,  0x474053],
        ["Wave Jumpsuit",   undefined, undefined, 0xaf9c3f],
        ["Toadstool",       undefined, 0xbe5050,  0xd6d6d6],
        ["Full Moon",       undefined, 0x9b9b9b,  0xc1c1c1],
        ["Swiss Cheese",    undefined, 0xffcd00,  0xffcd00],
        ["Target Practice", undefined, 0xffffff,  0xff0000],
        ["Zebra",           undefined, 0xe7e7e7,  0x4a4a4a],
        ["Tiger",           undefined, 0xea8611,  0x4a4a4a],
        ["Bee",             undefined, 0xfdb921,  0x4a4a4a],
        ["Armadillo",       undefined, undefined, 0xa68c5e],
        ["Printer",         undefined, 0xffffff,  0xffffff],
        ["Distant Shores",  undefined, 0x7eca83,  0x7eca83],
        ["Celestial",       undefined, undefined, 0xd2e3fb]
    ] satisfies ReadonlyArray<readonly [string, number?, number?, number?]>)
        .map(([name, baseTint, fistsTint, backpackTint]) => skin(name, baseTint, fistsTint, backpackTint)),

    // Hidden from loadout
    ...([
        // NAME                     BASE       FIST     BACKPACK
        ["Lemon",                 0xe6ca3d,  0xebe092,  0xebe092],
        ["Flamingo",              0xe94a60,  0xf1847d,  0xf1847d],
        ["Peachy Breeze",         0xe66e53,  0xf2a263,  0xf2a263],
        ["Deep Sea",              0x284553,  0x3e6a7f,  0x284553],
        ["Ancestral Garb",        0xf8c574,  undefined, 0x816537],
        ["Timeless",              undefined, undefined, 0x1a1a1a],
        ["Peppermint",            undefined, undefined, 0xb40030],
        ["Spearmint",             undefined, undefined, 0x115724],
        ["Coal",                  undefined, 0x363636,  0x424242],
        ["Henry's Little Helper", 0xc30000,  0x059100,  0x059100],
        ["Candy Cane",            undefined, undefined, 0xf4f4f4],
        ["Holiday Tree",          undefined, 0xedc32c,  0x23883f],
        ["Gingerbread",           undefined, 0xab5912,  0xb55c12],
        ["Light Choco",           undefined, undefined, 0xffd99e],
        ["Frosty",                undefined, undefined, 0xa2f3ff],
        ["Verified",              undefined, 0x63a1ff,  0x4790ff],
        ["no kil pls",            undefined, 0x929292,  0x6b6b6b],
        ["Stardust",              undefined, undefined, 0x16448b],
        ["Aurora",                undefined, undefined, 0x1d2f58],
        ["Nebula",                undefined, undefined, 0x28a0b7],
        ["1st Birthday",          undefined, undefined, 0xed8080],
        ["Lumberjack",            undefined, undefined, 0x924a24],
        ["Gold Tie Event",        0x1a1a1a,  undefined, 0x2b2929],
        ["Ship Carrier",          0xffffff,  undefined, 0x679bd9],
        ["Cargo Wave",            undefined, undefined, 0xd0bbd7],
        ["Military Camo",         undefined, 0x54483a,  0x54483a],
        ["NSD Uniform",           0x304521,  0x472f1f,  0x593b26],
        ["Pumpkified",            undefined, 0xe3a24f,  0x402000],
        ["One at NSD",            undefined, undefined, 0x27331a],
        ["Sky",                   undefined, undefined, 0x002121],
        ["Diseased",              undefined, undefined, 0x2d1f1f],
        ["Deer Season",           undefined, 0xf8651e,  0x9a3604],
        ["LOBOTOMY",              undefined, undefined, 0x00ff00],
        ["Veteran",               undefined, 0x636363,  0x2f7942],
        ["Carpenter Uniform",     0x516951,  0x676e67,  0x273d27]
    ] satisfies ReadonlyArray<readonly [string, number?, number?, number?]>)
        .map(([name, baseTint, fistsTint, backpackTint]) => ({ ...skin(name, baseTint, fistsTint, backpackTint), hideFromLoadout: true })),

    // Special skins
    {
        ...skin("Werewolf", 0x323232),
        hideFromLoadout: true,
        noSwap: true,
        noDrop: true
    },
    {
        ...skin("Ghillie Suit", 0xffffff, 0xffffff, 0xffffff),
        hideFromLoadout: true,
        grassTint: true,
        hideEquipment: true,
        hideBlood: true
    }
]);
