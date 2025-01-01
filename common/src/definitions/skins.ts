import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";
import { Vec, Vector } from "../utils/vector";

/*
    eslint-disable @stylistic/no-multi-spaces
*/

/*
    `@stylistic/no-multi-spaces`: Disabled to allow nicer alignment
*/

export interface ImageLayer {
    frame: string
    tint?: string
    position?: Vector
    rotation?: number
    scale?: Vector
    alpha?: number
}

export interface SkinDefinition extends ItemDefinition {
    readonly itemType: ItemType.Skin
    readonly hideFromLoadout: boolean
    readonly grassTint: boolean
    readonly basicSkin: boolean
    readonly backpackTint?: string
    readonly hideEquipment: boolean
    readonly rolesRequired?: string[]
    readonly hideBlood: boolean
    readonly noSwap?: boolean
    readonly baseLayers: ImageLayer[]
    readonly fistLayers: ImageLayer[]
}

export const Skins = ObjectDefinitions.withDefault<SkinDefinition>()(
    "Skins",
    {
        itemType: ItemType.Skin,
        noDrop: false,
        hideFromLoadout: false,
        grassTint: false,
        hideEquipment: false,
        hideBlood: false,
        basicSkin: false
    },
    ([derive, , createTemplate]) => {
        const normalizeName = (name: string): string => name
            .toLowerCase()
            .replace(/'/g, "")
            .replace(/ /g, "_");

        const skin = derive((name: string, backpackTint?: string) => ({
            idString: normalizeName(name),
            backpackTint,
            name,
            baseLayers: [{
                frame: `${normalizeName(name)}_base`
            }],
            fistLayers: [{
                frame: `${normalizeName(name)}_fist`
            }]
        }));

        const hidden = createTemplate(skin, {
            hideFromLoadout: true
        });

        const withRole = createTemplate(skin, (roles: string[]) => ({
            rolesRequired: roles
        }));

        const plain = derive((name: string, baseColor: string, fistColor: string, fistBorderColor: string, backpackColor: string, hidden = false) => ({
            idString: normalizeName(name),
            name,
            backpackTint: backpackColor,
            basicSkin: true,
            baseLayers: [{
                frame: "plain_base",
                tint: baseColor
            }],
            fistLayers: [
                { frame: "plain_fist", tint: fistColor },
                { frame: "plain_fist_stroke", tint: fistBorderColor }
            ],
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            hideFromLoadout: hidden
        }));

        const gradient = derive((name: string, baseColor: string, gradientColor: string, fistColor: string, fistGradientColor: string, fistBorderColor: string, backpackColor: string) => ({
            idString: normalizeName(name),
            name,
            backpackTint: backpackColor,
            baseLayers: [
                { frame: "plain_base", tint: baseColor },
                { frame: "plain_base_gradient", tint: gradientColor, rotation: -5 * Math.PI / 4 }
            ],
            fistLayers: [
                { frame: "plain_fist", tint: fistColor },
                { frame: "plain_fist_gradient", tint: fistGradientColor, rotation: Math.PI / 2 },
                { frame: "plain_fist_stroke", tint: fistBorderColor }
            ]
        }));

        return [
            // Dev funny skins
            withRole([[["hasanger"]], ["Hasanger",      "#640000"]]),
            withRole([[["limenade"]], ["LimeNade",      "#ffffff"]]),
            withRole([[["solstice"]], ["Dragonscale",   "#3f808d"]]),
            withRole([[["error"]],    ["error",         "#1fc462"]]),
            withRole([[["pap"]],      ["pap",           "#00366b"]]),

            // Role skins
            withRole([[["developr", "pap", "error", "limenade"]],                ["Developr Swag", "#007a7f"]]),
            withRole([[["designr", "solstice", "vip_designr", "lead_designr"]],  ["Designr Swag",  "#67cf00"]]),
            withRole([[["sound_designr"]],                                       ["Sound Designr Swag",  "#3e8476"]]),

            skin(["Zedaes", "#052105"], {
                rolesRequired: ["zedaes"],
                baseLayers: [
                    { frame: "plain_base", tint: "#000000" },
                    { frame: "plain_base_radial_gradient", tint: "#00ff00" },
                    { frame: "plain_base_gradient", tint: "#000000", alpha: 0.8, rotation: Math.PI / 2 }
                ],
                fistLayers: [
                    { frame: "plain_fist", tint: "#00ff00" },
                    { frame: "plain_fist_gradient", tint: "#000000", rotation: Math.PI },
                    { frame: "plain_fist_gradient", tint: "#000000", alpha: 0.8, rotation: -Math.PI / 2 },
                    { frame: "plain_fist_stroke", tint: "#052105" }
                ]
            }),

            // --------------------------------------------------------------------------------
            // TINTED SKINS - LOADOUT
            // --------------------------------------------------------------------------------
            ...([
                //   NAME             BASE       FIST     STROKE    BACKPACK
                ["Red Tomato",     "#eb1010", "#d30e0e", "#460505", "#f00"],
                ["Greenhorn",      "#10eb10", "#0dbc0d", "#054605", "#0f0"],
                ["Blue Blood",     "#1010eb", "#0d0dbc", "#050546", "#00f"],
                ["HAZEL Jumpsuit", "#97866b", "#b4a894", "#27221b", "#b4a894"],
                ["The Amateur",    "#9d732c", "#9b8767", "#241f19", "#9b8767"],
                ["The Pro",        "#9b8767", "#9d732c", "#241f18", "#9d732c"]
            ] satisfies Array<[string, string, string, string, string]>).map(plain),
            // --------------------------------------------------------------------------------

            // --------------------------------------------------------------------------------
            // TINTED SKINS - IN-GAME/LOOT
            // --------------------------------------------------------------------------------
            ...([
                //   NAME             BASE       FIST     STROKE    BACKPACK
                ["Basic Outfit",   "#f8c574", "#f8c574", "#302719", "#816537", true],
                ["Lemon",          "#e6ca3d", "#ebe092", "#272416", "#ebe092", true],
                ["Flamingo",       "#e94a60", "#f1847d", "#281717", "#f1847d", true],
                ["Peachy Breeze",  "#e66e53", "#f2a263", "#2d2112", "#f2a263", true],
                ["Deep Sea",       "#284553", "#3e6a7f", "#121e22", "#284553", true],
                ["NSD Uniform",    "#304521", "#472f1f", "#24170f", "#593b26", true],
                ["Ship Carrier",   "#FFFFFF", "#679bd9", "#060719", "#679bd9", true],
                ["Henry's Little Helper",  "#c30000", "#059100", "#055c00", "#059100", true]
            ] satisfies Array<[string, string, string, string, string, boolean]>).map(plain),
            // --------------------------------------------------------------------------------

            ...([
                //  NAME             BASE       GRAD      FIST       GRADFIST   STROKE    BACKPACK
                ["Algae",         "#00e0e3", "#00e312", "#65e1e3", "#70e379", "#082b0b", "#00e0e3"],
                ["Twilight Zone", "#8304cd", "#2ab0fe", "#7c49cc", "#6faeff", "#141428", "#2bb0fe"],
                ["Bubblegum",     "#ea94ff", "#ff9e9e", "#ea94ff", "#ff9e9e", "#290000", "#ea94ff"]
            ] satisfies Array<[string, string, string, string, string, string, string]>).map(gradient),

            skin(["Sunrise", "#495f8c"], {
                baseLayers: [
                    { frame: "plain_base", tint: "#f06c48" },
                    { frame: "plain_base_gradient", tint: "#495f8c", alpha: 0.9, rotation: -5 * Math.PI / 4 },
                    { frame: "plain_base_gradient", tint: "#f19341", alpha: 0.7, rotation: -1 * Math.PI / 4 }
                ],
                fistLayers: [
                    { frame: "plain_fist", tint: "#f06c48" },
                    { frame: "plain_fist_gradient", tint: "#495f8c", alpha: 0.9, rotation: -Math.PI / 2 },
                    { frame: "plain_fist_gradient", tint: "#f19341", alpha: 0.7, rotation: Math.PI / 2 },
                    { frame: "plain_fist_stroke", tint: "#191919" }
                ]
            }),
            skin(["Sunset", "#fcb045"], {
                baseLayers: [
                    { frame: "plain_base", tint: "#ec544c" },
                    { frame: "plain_base_gradient", tint: "#3e2f63", alpha: 0.9, rotation: -1 * Math.PI / 4 },
                    { frame: "plain_base_gradient", tint: "#fcb045", alpha: 0.7, rotation: -5 * Math.PI / 4 }
                ],
                fistLayers: [
                    { frame: "plain_fist", tint: "#ec544c" },
                    { frame: "plain_fist_gradient", tint: "#3e2f63", alpha: 0.9, rotation: -Math.PI / 2 },
                    { frame: "plain_fist_gradient", tint: "#fcb045", alpha: 0.7, rotation: Math.PI / 2 },
                    { frame: "plain_fist_stroke", tint: "#191919" }
                ]
            }),
            ...([
                //  NAME            BASE      GRAD       FIST     FISTGRAD     STROKE    BACKPACK
                ["Stratosphere", "#0079ff", "#ffffff", "#0079ff", "#ffffff", "#202020", "#0079ff"],
                ["Mango",        "#00c300", "#ff7c00", "#00c300", "#ff7c00", "#021f00", "#ff7c00"],
                ["Snow Cone",    "#ff0025", "#00ebff", "#ff0025", "#00ebff", "#002326", "#00ebff"],
                ["Aquatic",      "#00326a", "#00ceff", "#00326a", "#00ceff", "#1b1a26", "#00326a"]
            ] satisfies Array<[string, string, string, string, string, string, string]>).map(gradient),

            skin(["Floral", "#dc73bd"], {
                baseLayers: [
                    { frame: "plain_base", tint: "#ffffff" },
                    { frame: "plain_base_gradient", tint: "#6b976b", rotation: -1 * Math.PI / 4 },
                    { frame: "plain_base_gradient", tint: "#f052ff", alpha: 0.4, rotation: -5 * Math.PI / 4 }
                ],
                fistLayers: [
                    { frame: "plain_fist", tint: "#f052ff" },
                    { frame: "plain_fist_gradient", tint: "#ffffff", rotation: Math.PI / 2 },
                    { frame: "plain_fist_stroke", tint: "#2f1e2e" }
                ]
            }),

            // cum skin
            skin(["Silver Lining", "#e1e1e1"], {
                baseLayers: [
                    { frame: "plain_base", tint: "#d8d8d8" },
                    { frame: "plain_base_gradient", tint: "#aaaaaa", rotation: -Math.PI / 2 }
                ],
                fistLayers: [
                    { frame: "plain_fist", tint: "#e1e1e1" },
                    { frame: "plain_fist_gradient", tint: "#b9b9b9", rotation: -Math.PI / 2 },
                    { frame: "plain_fist_stroke", tint: "#202020" }
                ]
            }),

            skin(["Pot o' Gold", "#ffd852"], {
                baseLayers: [
                    { frame: "plain_base", tint: "#dd9b0a" },
                    { frame: "plain_base_gradient", tint: "#ffd852", rotation: Math.PI / 2 }
                ],
                fistLayers: [
                    { frame: "plain_fist", tint: "#ffe693" },
                    { frame: "plain_fist_gradient", tint: "#deb04c", rotation: -Math.PI / 2 },
                    { frame: "plain_fist_stroke", tint: "#342800" }
                ]
            }),

            skin(["Gold Tie Event", "#2b2929"], {
                baseLayers: [
                    { frame: "plain_base", tint: "#1a1a1a" }
                ],
                fistLayers: [
                    { frame: "plain_fist", tint: "#a38e28" },
                    { frame: "plain_fist_gradient", tint: "#1b1605", alpha: 0.5, rotation: Math.PI / 2 },
                    { frame: "plain_fist_stroke", tint: "#322c0c" }
                ],
                hideFromLoadout: true
            }),

            skin(["Aurora", "#1d2f58"], {
                baseLayers: [
                    { frame: "plain_base", tint: "#0ca561" },
                    { frame: "plain_base_gradient", tint: "#201045", rotation: -Math.PI / 4 },
                    { frame: "plain_base_gradient", tint: "#2269c6", alpha: 0.25, rotation: -Math.PI / 4 }
                ],
                fistLayers: [
                    { frame: "plain_fist", tint: "#0ca561" },
                    { frame: "plain_fist_gradient", tint: "#201045", rotation: -Math.PI / 2 },
                    { frame: "plain_fist_gradient", tint: "#2269c6", alpha: 0.25, rotation: -Math.PI / 2 },
                    { frame: "plain_fist_stroke", tint: "#08233f" }
                ],
                hideFromLoadout: true
            }),

            skin(["Sky", "#002121"], {
                baseLayers: [
                    { frame: "plain_base", tint: "#002f2f" },
                    { frame: "plain_base_gradient", tint: "#cffdff", rotation: Math.PI / 4 }
                ],
                fistLayers: [
                    { frame: "plain_fist", tint: "#002f2f" },
                    { frame: "plain_fist_gradient", tint: "#b5f6ff", rotation: -Math.PI / 2 },
                    { frame: "plain_fist_stroke", tint: "#002f2f" }
                ],
                hideFromLoadout: true
            }),

            skin(["Target Practice", "red"], {
                // Had to do math in my head to do this lmao, pretty fun and elegant though
                baseLayers: [1, 0.775, 0.55, 0.325, 0.1].map((layer, i) => ({
                    frame: "plain_base",
                    tint: i % 2 === 0 ? "red" : "white",
                    scale: Vec.create(layer, layer)
                })),
                fistLayers: [
                    { frame: "plain_fist", tint: "#FFFFFF" },
                    { frame: "plain_fist_stroke", tint: "#202020" }
                ]
            }),

            skin(["Beacon", "#474053"], {
                baseLayers: [1, 0.65, 0.55, 0.65, 0.55].map((layer, i) => ({
                    frame: "plain_base",
                    tint: (i === 3 || i % 2 === 0) ? i === 3 ? "#69d5e6" : "#373240" : "#dedede",
                    scale: Vec.create(layer, layer),
                    alpha: i === 2 ? 0.5 : 1
                })),
                fistLayers: [
                    { frame: "plain_fist", tint: "#474053" },
                    { frame: "plain_fist_stroke", tint: "#27221b" }
                ]
            }),

            skin(["Gunmetal", "#4c4c4c"], {
                baseLayers: [
                    { frame: "plain_base", tint: "#4c4c4c" },
                    { frame: "plain_base_radial_gradient", tint: "#828282" }
                ],
                fistLayers: [
                    { frame: "plain_fist", tint: "#4d4d4d" },
                    { frame: "plain_fist_stroke", tint: "#181818" }
                ]
            }),

            ...([
                ["Forest Camo",     "#634421"],
                ["Desert Camo",     "#dcc993"],
                ["Arctic Camo",     "#ececec"],
                ["Bloodlust",       "#565656"],
                ["Sunny",           "#fce570"],
                ["Volcanic",        "#fd5900"],
                ["Ashfall",         "#45aafc"],
                ["Solar Flare",     "#ffa500"],
                ["Wave Jumpsuit",   "#af9c3f"],
                ["Toadstool",       "#d6d6d6"],
                ["Full Moon",       "#c1c1c1"],
                ["Swiss Cheese",    "#ffcd00"],
                ["Zebra",           "#4a4a4a"],
                ["Tiger",           "#4a4a4a"],
                ["Bee",             "#4a4a4a"],
                ["Armadillo",       "#a68c5e"],
                ["Printer",         "#ffffff"],
                ["Distant Shores",  "#7eca83"]
            ] satisfies ReadonlyArray<readonly [string, string]>).map(([name, tint]) => skin([name, tint])),
            ...([
                ["Peppermint",            "#b40030"],
                ["Spearmint",             "#115724"],
                ["Coal",                  "#424242"],
                ["Candy Cane",            "#f4f4f4"],
                ["Holiday Tree",          "#23883f"],
                ["Gingerbread",           "#b55c12"],
                ["Light Choco",           "#ffd99e"],
                ["Frosty",                "#a2f3ff"],
                ["Verified",              "#4790ff"],
                ["no kil pls",            "#6b6b6b"],
                ["Stardust",              "#16448b"],
                ["Nebula",                "#28a0b7"],
                ["1st Birthday",          "#ed8080"],
                ["Lumberjack",            "#924a24"],
                ["Pumpkified",            "#402000"],
                ["One at NSD",            "#27331a"],
                ["Diseased",              "#2d1f1f"],
                ["Deer Season",           "#9a3604"]
            ] satisfies ReadonlyArray<readonly [string, string]>).map(([name, tint]) => hidden([name, tint])),
            hidden(
                ["Werewolf", "#323232"],
                {
                    noSwap: true,
                    noDrop: true
                }
            ),
            hidden(
                ["Ghillie Suit", "#fff"],
                {
                    grassTint: true,
                    hideEquipment: true,
                    hideBlood: true,
                    baseLayers: [{ frame: "plain_base", tint: "hsl(0, 0%, 99%)" }],
                    fistLayers: [
                        { frame: "plain_fist", tint: "hsl(0, 0%, 99%)" },
                        { frame: "plain_fist_stroke", tint: "#111111" }
                    ]
                }
            )
        ];
    }
);
