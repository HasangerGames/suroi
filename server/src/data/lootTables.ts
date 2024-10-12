import { type LootDefinition } from "@common/definitions/loots";
import { NullString, type ReferenceTo } from "@common/utils/objectDefinitions";

export type WeightedItem =
    (
        { readonly item: ReferenceTo<LootDefinition> | typeof NullString } |
        { readonly tier: string }
    ) &
    {
        readonly count?: number
        readonly spawnSeparately?: boolean
        readonly weight: number
    };

export interface LootTable {
    readonly min: number
    readonly max: number
    readonly loot: ReadonlyArray<WeightedItem | readonly WeightedItem[]>
}

type LootTierOverride = Record<string, readonly WeightedItem[]>;

export const LootTierOverrides: Record<string, LootTierOverride> = {
    fall: {
        guns: [
            { item: "m590m", weight: 0.4 },
            { item: "m1895", weight: 1.5 },
            { item: "sks", weight: 1 },
            { item: "hp18", weight: 1 },
            { item: "dt11", weight: 0.6 },
            { item: "model_37", weight: 0.95 },
            { item: "cz600", weight: 0.8 },
            { item: "m3k", weight: 0.3 },
            { item: "flues", weight: 0.25 },
            { item: "sr25", weight: 0.25 },
            { item: "mini14", weight: 0.25 },
            { item: "vepr12", weight: 0.1 },

            { item: "rsh12", weight: 0.1 },
            { item: "sks", weight: 0.8 },
            { item: "mosin_nagant", weight: 0.5 },
            { item: "tango_51", weight: 0.15 },
            { item: "vks", weight: 0.06 },
            { item: "model_89", weight: 0.06 }
        ],
        special_guns: [
            { item: "hp18", weight: 0.8 },
            { item: "model_37", weight: 0.8 },
            { item: "m3k", weight: 0.8 },
            { item: "dt11", weight: 0.95 },
            { item: "m590m", weight: 0.8 },
            { item: "flues", weight: 0.8 },
            { item: "sr25", weight: 0.5 },
            { item: "mini14", weight: 0.5 },
            { item: "m1895", weight: 0.45 },
            { item: "cz600", weight: 0.3 },
            { item: "mosin_nagant", weight: 0.2 },
            { item: "tango_51", weight: 0.1 },
            { item: "sks", weight: 0.95 },
            { item: "vks", weight: 0.25 },
            { item: "mosin_nagant", weight: 0.2 },
            { item: "vepr12", weight: 0.1 },
            { item: "model_89", weight: 0.1 },
            { item: "m1_garand", weight: 0.3 },
            { item: "rsh12", weight: 0.09 }
        ],
        airdrop_guns: [
            { item: "mini14", weight: 1 },
            { item: "rsh12", weight: 1 },
            { item: "sr25", weight: 1 },
            { item: "vepr12", weight: 1 },
            { item: "model_89", weight: 1 },
            { item: "vks", weight: 1 },
            { item: "cz600", weight: 1 },
            { item: "mosin_nagant", weight: 0.95 },
            { item: "m1_garand", weight: 0.9 },
            { item: "tango_51", weight: 0.9 },
            { item: "radio", weight: 0.1 }
        ],
        gold_airdrop_guns: [
            { item: "usas12", weight: 1 },
            { item: "dual_rsh12", weight: 1 },
            { item: "l115a1", weight: 0.7 },
            { item: "mk18", weight: 0.7 },
            { item: "dual_rsh12", weight: 1 },
            { item: "g19", weight: 0.0005 }
        ],
        viking_chest_guns: [
            { item: "dt11", weight: 1 },
            { item: "m3k", weight: 0.95 },
            { item: "flues", weight: 0.9 },
            { item: "mini14", weight: 0.75 },
            { item: "sr25", weight: 0.75 },
            { item: "m1_garand", weight: 0.1 },
            { item: "tango_51", weight: 0.1 },
            { item: "mosin_nagant", weight: 0.55 },
            { item: "vks", weight: 0.1 },
            { item: "cz600", weight: 0.7 },
            { item: "vepr12", weight: 0.6 },
            { item: "rsh12", weight: 0.5 },
            { item: "model_89", weight: 0.09 }
        ],
        river_chest_guns: [
            { item: "model_89", weight: 1 },
            { item: "mini14", weight: 1 },
            { item: "sr25", weight: 1 },
            { item: "vepr12", weight: 1 },
            { item: "vks", weight: 0.7 },
            { item: "m1_garand", weight: 0.7 },
            { item: "tango_51", weight: 0.7 },
            { item: "rsh12", weight: 0.7 },
            { item: "l115a1", weight: 0.05 },
            { item: "mk18", weight: 0.05 }
        ],
        ammo: [
            { item: "12g", count: 10, weight: 1 },
            { item: "556mm", count: 60, weight: 1 },
            { item: "762mm", count: 60, weight: 1 },
            { item: "50cal", count: 20, weight: 0.5 }
        ],
        throwables: [
            { item: "frag_grenade", count: 2, weight: 1 },
            { item: "smoke_grenade", count: 2, weight: 1 }
        ],
        equipment: [
            { item: "basic_helmet", weight: 0.9 },
            { item: "regular_helmet", weight: 0.3 },
            { item: "tactical_helmet", weight: 0.07 },

            { item: "basic_vest", weight: 0.9 },
            { item: "regular_vest", weight: 0.3 },
            { item: "tactical_vest", weight: 0.07 },

            { item: "basic_pack", weight: 0.9 },
            { item: "regular_pack", weight: 0.2 },
            { item: "tactical_pack", weight: 0.07 }
        ],
        special_equipment: [
            { item: "basic_helmet", weight: 0.8 },
            { item: "regular_helmet", weight: 0.5 },
            { item: "tactical_helmet", weight: 0.09 },

            { item: "basic_vest", weight: 0.8 },
            { item: "regular_vest", weight: 0.5 },
            { item: "tactical_vest", weight: 0.0 },

            { item: "basic_pack", weight: 0.8 },
            { item: "regular_pack", weight: 0.5 },
            { item: "tactical_pack", weight: 0.09 }
        ],
        melee: [
            { item: "hatchet", weight: 3 },
            { item: "sickle", weight: 0.5 },
            { item: "kbar", weight: 2 }
        ]
    }
};

export type LootMode = keyof typeof LootTierOverrides;

type LootTableOverride = Record<string, LootTable>;

export const LootTableOverrides: Record<string, LootTableOverride> = {
    fall: {
        briefcase: {
            min: 1,
            max: 1,
            loot: [
                { item: "usas12", weight: 1 },
                { item: "mk18", weight: 0.2 },
                { item: "l115a1", weight: 0.2 }
            ]
        },
        gun_locker: {
            min: 1,
            max: 2,
            loot: [
                { item: "m1_garand", weight: 0.8 },
                { item: "model_89", weight: 0.25 },
                { item: "dt11", weight: 0.85 },
                { item: "m3k", weight: 0.6 },
                { item: "model_37", weight: 0.6 },
                { item: "flues", weight: 0.6 },
                { item: "cz600", weight: 0.4 },
                { item: "vks", weight: 0.25 },
                { item: "mosin_nagant", weight: 0.2 },
                { item: "sr25", weight: 0.5 },
                { item: "mini14", weight: 0.5 },
                { item: "vepr12", weight: 0.15 },
                { item: "tango_51", weight: 0.5 },
                { item: "rsh12", weight: 0.25 }
            ]
        }
    }
};

// TODO Refactor loot table system
export const LootTables: Record<string, LootTable> = {
    ground_loot: {
        min: 1,
        max: 1,
        loot: [
            { tier: "equipment", weight: 1 },
            { tier: "healing_items", weight: 1 },
            { tier: "ammo", weight: 1 },
            { tier: "guns", weight: 0.9 },
            { tier: "scopes", weight: 0.3 }
        ]
    },
    regular_crate: {
        min: 1,
        max: 1,
        loot: [
            { tier: "guns", weight: 1.25 },
            { tier: "equipment", weight: 1 },
            { tier: "healing_items", weight: 1 },
            { tier: "ammo", weight: 0.5 },
            { tier: "scopes", weight: 0.3 },
            { tier: "throwables", weight: 0.3 },
            { tier: "melee", weight: 0.04 }
        ]
    },
    hazel_crate: {
        min: 1,
        max: 1,
        loot: [
            [{ item: "firework_launcher", weight: 1 }],
            [{ item: "1st_birthday", weight: 1 }]
        ]
    },
    viking_chest: {
        min: 1,
        max: 1,
        loot: [
            [
                { item: "seax", weight: 1 }
            ],
            [
                { tier: "viking_chest_guns", weight: 1 }
            ],
            [
                { tier: "viking_chest_guns", weight: 1 }
            ],
            [
                { tier: "special_equipment", weight: 0.65 },
                { tier: "viking_chest_guns", weight: 0.5 },
                { tier: "special_scopes", weight: 0.3 }
            ],
            [
                { tier: "special_equipment", weight: 0.65 },
                { tier: "special_scopes", weight: 0.3 }
            ]
        ]
    },
    river_chest: {
        min: 1,
        max: 1,
        loot: [
            [
                { tier: "river_chest_guns", weight: 1 }
            ],
            [
                { tier: "river_chest_guns", weight: 1 }
            ],
            [
                { tier: "special_equipment", weight: 0.65 },
                { tier: "river_chest_guns", weight: 0.5 },
                { tier: "special_scopes", weight: 0.3 }
            ],
            [
                { tier: "special_equipment", weight: 0.65 },
                { tier: "special_scopes", weight: 0.3 }
            ]
        ]
    },
    aegis_crate: {
        min: 3,
        max: 5,
        loot: [
            { tier: "special_guns", weight: 1 },
            { tier: "special_equipment", weight: 0.65 },
            { tier: "special_scopes", weight: 0.3 },
            { tier: "special_healing_items", weight: 0.15 }
        ]
    },
    dumpster: {
        min: 1,
        max: 2,
        loot: [
            { tier: "guns", weight: 0.8 },
            { tier: "healing_items", weight: 0.6 },
            { tier: "scopes", weight: 0.4 },
            { tier: "equipment", weight: 0.3 }
        ]
    },
    flint_crate: {
        min: 3,
        max: 5,
        loot: [
            { tier: "special_guns", weight: 1 },
            { tier: "special_equipment", weight: 0.65 },
            { tier: "special_healing_items", weight: 0.15 },
            { tier: "special_scopes", weight: 0.3 }
        ]
    },
    grenade_box: {
        min: 1,
        max: 1,
        loot: [
            { item: "frag_grenade", weight: 1, count: 2 },
            { item: "smoke_grenade", weight: 1, count: 2 }
        ]
    },
    melee_crate: {
        min: 2,
        max: 2,
        loot: [
            { tier: "melee", weight: 1 }
        ]
    },
    grenade_crate: {
        min: 3,
        max: 4,
        loot: [
            { tier: "throwables", weight: 1 }
        ]
    },
    tango_crate: {
        min: 1,
        max: 1,
        loot: [
            [
                { item: "4x_scope", weight: 1 },
                { item: "8x_scope", weight: 0.1 },
                { item: "15x_scope", weight: 0.0025 }
            ],
            [
                { item: "tango_51", weight: 60 },
                { item: "tango_51", spawnSeparately: true, count: 2, weight: 30 },
                { item: "tango_51", spawnSeparately: true, count: 3, weight: 3.5 },
                { item: "tango_51", spawnSeparately: true, count: 4, weight: 0.1 },
                { item: "tango_51", spawnSeparately: true, count: 5, weight: 0.0000001 }
            ]
        ]
    },
    lux_crate: {
        min: 1,
        max: 1,
        loot: [
            [
                { item: "cz600", weight: 1 }
            ],
            [
                { tier: "scopes", weight: 1 }
            ]
        ]
    },
    gold_rock: {
        min: 1,
        max: 1,
        loot: [
            { item: "mosin_nagant", weight: 1 }
        ]
    },
    loot_tree: {
        min: 1,
        max: 1,
        loot: [
            [
                { item: "model_37", weight: 1 },
                { item: "m3k", weight: 1 },
                { item: "vepr12", weight: 0.2 }
            ],
            [{ item: "hatchet", weight: 1 }],
            [{ item: "lumberjack", weight: 1 }],
            [{ item: "basic_helmet", weight: 1 }],
            [{ item: "basic_pack", weight: 1 }],
            [{ item: "12g", count: 15, weight: 1 }]
        ]
    },
    loot_barrel: {
        min: 1,
        max: 1,
        loot: [
            [{ item: "crowbar", weight: 1 }],
            [{ item: "sr25", weight: 1 }],
            [{ item: "c4", weight: 1, count: 3 }],
            [
                { tier: "equipment", weight: 1 },
                { tier: "scopes", weight: 1 },
                { tier: "healing_items", weight: 1 }
            ]
        ]
    },
    pumpkin: {
        min: 1,
        max: 1,
        loot: [
            { item: "g17_scoped", weight: 0.95 },
            { item: "usas12", weight: 0.05 }
        ]
    },
    birthday_cake: {
        min: 1,
        max: 1,
        loot: [
            { tier: "special_guns", weight: 0.25 },
            { tier: "special_equipment", weight: 0.25 },
            { item: "1st_birthday", weight: 0.25 },
            { item: "firework_rocket", weight: 0.2 },
            { item: "firework_launcher", weight: 0.01 }
        ]
    },
    blueberry_bush: {
        min: 1,
        max: 1,
        loot: [
            { tier: "special_equipment", weight: 1 },
            { tier: "healing_items", weight: 1 },
            { tier: "scopes", weight: 1 }
        ]
    },
    warehouse: {
        min: 1,
        max: 1,
        loot: [
            { tier: "special_guns", weight: 1 },
            { tier: "special_scopes", weight: 0.25 },
            { tier: "special_equipment", weight: 0.65 }
        ]
    },
    large_drawer: {
        min: 1,
        max: 1,
        loot: [
            { tier: "guns", weight: 1 },
            { tier: "equipment", weight: 0.65 },
            { tier: "scopes", weight: 0.3 }
        ]
    },
    small_drawer: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1 },
            { tier: "healing_items", weight: 0.8 },
            { tier: "guns", weight: 0.3 }
        ]
    },
    hq_desk_left: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1 },
            { tier: "healing_items", weight: 0.8 },
            { tier: "guns", weight: 0.3 }
        ]
    },
    hq_desk_right: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1 },
            { tier: "healing_items", weight: 0.8 },
            { tier: "guns", weight: 0.3 }
        ]
    },
    filing_cabinet: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1 },
            { tier: "equipment", weight: 0.85 },
            { tier: "healing_items", weight: 0.4 },
            { tier: "guns", weight: 0.3 }
        ]
    },
    small_table: {
        min: 1,
        max: 1,
        loot: [
            { tier: "healing_items", weight: 1 },
            { tier: "ammo", weight: 1 }
        ]
    },
    box: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1.2 },
            { tier: "healing_items", weight: 1 },
            { tier: "equipment", weight: 1 },
            { tier: "guns", weight: 0.5 },
            { tier: "scopes", weight: 0.3 }
        ]
    },
    small_desk: {
        min: 1,
        max: 1,
        loot: [
            [
                { tier: "healing_items", weight: 0.8 },
                { tier: "equipment", weight: 1 },
                { tier: "guns", weight: 1 },
                { tier: "scopes", weight: 0.4 }
            ],
            [
                { tier: "healing_items", weight: 1 },
                { tier: "scopes", weight: 1 }
            ]
        ]
    },
    bookshelf: {
        min: 1,
        max: 2,
        loot: [
            { tier: "equipment", weight: 1.1 },
            { tier: "scopes", weight: 0.4 },
            { tier: "guns", weight: 1 },
            { tier: "healing_items", weight: 0.6 }
        ]
    },
    trash_can: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1 },
            { item: "cola", weight: 0.1 }
        ]
    },
    trash_bag: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1 },
            { item: "cola", weight: 0.1 }
        ]
    },
    fridge: {
        min: 2,
        max: 3,
        loot: [
            { item: "cola", weight: 1 }
        ]
    },
    vending_machine: {
        min: 2,
        max: 3,
        loot: [
            { item: "cola", weight: 1 },
            { item: "medikit", weight: 0.25 },
            { item: "tablets", weight: 0.1 }
        ]
    },
    cooler: {
        min: 2,
        max: 3,
        loot: [
            { item: "cola", weight: 1 }
        ]
    },
    washing_machine: {
        min: 1,
        max: 1,
        loot: [
            { item: "lemon", weight: 1 },
            { item: "flamingo", weight: 1 },
            { item: "verified", weight: 0.5 },
            { item: "no_kil_pls", weight: 0.5 },
            { item: "basic_outfit", weight: 0.001 }
        ]
    },
    toilet: {
        min: 2,
        max: 3,
        loot: [
            { tier: "healing_items", weight: 3 },
            { tier: "scopes", weight: 0.1 },
            { tier: "guns", weight: 0.05 }
        ]
    },
    used_toilet: {
        min: 2,
        max: 3,
        loot: [
            { tier: "guns", weight: 1.25 },
            { tier: "equipment", weight: 1 },
            { tier: "scopes", weight: 0.35 },
            { tier: "special_guns", weight: 0.8 },
            { tier: "healing_items", weight: 0.75 }
        ]
    },
    porta_potty_toilet_open: {
        min: 2,
        max: 3,
        loot: [
            { tier: "guns", weight: 1.25 },
            { tier: "healing_items", weight: 1 },
            { tier: "equipment", weight: 0.9 },
            { tier: "special_guns", weight: 0.8 },
            { tier: "special_scopes", weight: 0.35 }
        ]
    },
    porta_potty_toilet_closed: {
        min: 2,
        max: 3,
        loot: [
            { tier: "healing_items", weight: 3 },
            { tier: "scopes", weight: 0.1 },
            { tier: "guns", weight: 0.05 }
        ]
    },
    gun_mount_mcx_spear: {
        min: 1,
        max: 1,
        loot: [
            { item: "mcx_spear", weight: 1 }
        ]
    },
    gun_mount_stoner_63: {
        min: 1,
        max: 1,
        loot: [
            { item: "stoner_63", weight: 1 }
        ]
    },
    gun_mount_mini_14: {
        min: 1,
        max: 1,
        loot: [
            { item: "mini14", weight: 1 }
        ]
    },
    gun_mount_maul: {
        min: 1,
        max: 1,
        loot: [
            { item: "maul", weight: 1 }
        ]
    },
    gun_mount_hp18: {
        min: 1,
        max: 1,
        loot: [
            { item: "hp18", weight: 1 }
        ]
    },
    gun_mount_m590m: {
        min: 1,
        max: 1,
        loot: [
            { item: "m590m", weight: 1 }
        ]
    },
    gun_mount_dual_rsh12: {
        min: 1,
        max: 1,
        loot: [
            { item: "dual_rsh12", weight: 1 }
        ]
    },
    gas_can: {
        min: 1,
        max: 1,
        loot: [
            { item: "gas_can", weight: 1 }
        ]
    },
    hq_skin: {
        min: 1,
        max: 1,
        loot: [{ item: "gold_tie_event", weight: 1 }]
    },
    ship_skin: {
        min: 1,
        max: 1,
        loot: [{ item: "ship_carrier", weight: 1 }]
    },
    armory_skin: {
        min: 1,
        max: 1,
        loot: [{ item: "nsd_uniform", weight: 1 }]
    },
    airdrop_crate: {
        min: 1,
        max: 1,
        loot: [
            [
                { tier: "airdrop_equipment", weight: 1 }
            ],
            [
                { tier: "airdrop_scopes", weight: 1 }
            ],
            [
                { tier: "airdrop_healing_items", weight: 1 }
            ],
            [
                { tier: "airdrop_skins", weight: 1 }
            ],
            [
                { tier: "airdrop_melee", weight: 1 }
            ],
            [
                { tier: "ammo", weight: 1 }
            ],
            [
                { tier: "airdrop_guns", weight: 1 }
            ],
            [
                { item: "frag_grenade", count: 3, weight: 2 },
                { item: NullString, weight: 1 }
            ]
        ]
    },
    gold_airdrop_crate: {
        min: 1,
        max: 1,
        loot: [
            [
                { tier: "airdrop_equipment", weight: 1 }
            ],
            [
                { tier: "airdrop_scopes", weight: 1 }
            ],
            [
                { tier: "airdrop_healing_items", weight: 1 }
            ],
            [
                { tier: "airdrop_skins", weight: 1 }
            ],
            [
                { tier: "airdrop_melee", weight: 1 }
            ],
            [
                { tier: "ammo", weight: 1 }
            ],
            [
                { tier: "gold_airdrop_guns", weight: 1 }
            ],
            [
                { item: "frag_grenade",
                    count: 3, weight: 1 }
            ]
        ]
    },
    flint_stone: {
        min: 1,
        max: 1,
        loot: [
            { tier: "gold_airdrop_guns", weight: 1 }
        ]
    },
    christmas_tree: {
        min: 4,
        max: 5,
        loot: [
            { tier: "special_winter_skins", weight: 1 },
            { tier: "special_guns", weight: 1 },
            { tier: "special_equipment", weight: 0.65 },
            { tier: "special_healing_items", weight: 0.65 },
            { tier: "special_scopes", weight: 0.3 },
            { item: "radio", weight: 0.1 }
        ]
    },
    gun_case: {
        min: 1,
        max: 2,
        loot: [
            { tier: "special_guns", weight: 1 }
        ]
    },
    gun_locker: {
        min: 1,
        max: 2,
        loot: [
            { item: "ak47", weight: 1 },
            { item: "aug", weight: 1 },
            { item: "model_37", weight: 1 },
            { item: "mp40", weight: 1 },
            { item: "m3k", weight: 0.6 },
            { item: "flues", weight: 0.6 },
            { item: "m16a4", weight: 0.4 },
            { item: "cz600", weight: 0.4 },
            { item: "mcx_spear", weight: 0.1 },
            { item: "mg36", weight: 0.1 },
            { item: "vss", weight: 0.1 },
            { item: "mosin_nagant", weight: 0.1 },
            { item: "sr25", weight: 0.05 },
            { item: "mini14", weight: 0.05 },
            { item: "vepr12", weight: 0.05 },
            { item: "stoner_63", weight: 0.05 },
            { item: "vector", weight: 0.05 },
            { item: "tango_51", weight: 0.05 }
        ]
    },
    ammo_crate: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1 },
            { item: "50cal", count: 20, weight: 0.3 },
            { item: "338lap", count: 6, weight: 0.1 },
            { item: "curadell", weight: 0.1 }
        ]
    },
    rocket_box: {
        min: 1,
        max: 1,
        loot: [
            { item: "firework_rocket", count: 10, weight: 2 },
            { tier: "ammo", weight: 1 },
            { item: "curadell", weight: 0.02 }
        ]
    },
    falchion_case: {
        min: 1,
        max: 1,
        loot: [
            { item: "falchion", weight: 1 }
        ]
    },
    hatchet_stump: {
        min: 1,
        max: 1,
        loot: [
            { item: "hatchet", weight: 1 }
        ]
    },
    aegis_golden_case: {
        min: 1,
        max: 1,
        loot: [
            { item: "deagle", weight: 1 },
            { item: "rsh12", weight: 0.5 },
            { item: "dual_deagle", weight: 0.05 },
            { item: "dual_rsh12", weight: 0.025 },
            { item: "g19", weight: 0.0005 }
        ]
    },
    fire_hatchet_case: {
        min: 1,
        max: 1,
        loot: [
            { item: "fire_hatchet", weight: 1 }
        ]
    },
    confetti_grenade_box: {
        min: 1,
        max: 2,
        loot: [
            { item: "confetti_grenade", count: 4, weight: 2 },
            { tier: "throwables", weight: 1 }
        ]
    },
    cabinet: {
        min: 1,
        max: 1,
        loot: [
            { tier: "special_guns", weight: 1 },
            { tier: "special_healing_items", weight: 0.65 },
            { tier: "special_equipment", weight: 0.65 },
            { tier: "special_scopes", weight: 0.3 }
        ]
    },
    briefcase: {
        min: 1,
        max: 1,
        loot: [
            { item: "vector", weight: 3 },
            { item: "arx160", weight: 1 },
            { item: "vepr12", weight: 1 },
            { item: "stoner_63", weight: 0.2 },
            { item: "negev", weight: 0.15 },
            { item: "mg5", weight: 0.15 },
            { item: "g19", weight: 0.05 }
        ]
    },
    sink: {
        min: 1,
        max: 1,
        loot: [
            { tier: "healing_items", weight: 1.2 },
            { tier: "ammo", weight: 1 }
        ]
    },
    sink2: {
        min: 1,
        max: 1,
        loot: [
            { tier: "healing_items", weight: 1.2 },
            { tier: "ammo", weight: 1 },
            { tier: "guns", weight: 0.8 }
        ]
    },
    kitchen_unit_1: {
        min: 1,
        max: 1,
        loot: [
            { tier: "healing_items", weight: 1.2 },
            { tier: "ammo", weight: 1 },
            { tier: "guns", weight: 0.9 }
        ]
    },
    kitchen_unit_2: {
        min: 1,
        max: 1,
        loot: [
            { tier: "healing_items", weight: 1.2 },
            { tier: "ammo", weight: 1 },
            { tier: "guns", weight: 0.9 },
            { tier: "special_guns", weight: 0.5 }
        ]
    },
    kitchen_unit_3: {
        min: 1,
        max: 1,
        loot: [
            { tier: "healing_items", weight: 1.2 },
            { tier: "ammo", weight: 1 }
        ]
    },
    sea_traffic_control_floor: {
        min: 1,
        max: 1,
        loot: [
            { item: "radio", weight: 1 }
        ]
    },
    sea_traffic_control_outside: {
        min: 1,
        max: 1,
        loot: [
            { item: "peachy_breeze", weight: 1 }
        ]
    },
    tugboat_red_floor: {
        min: 1,
        max: 1,
        loot: [
            { item: "deep_sea", weight: 1 }
        ]
    },
    potted_plant: {
        min: 1,
        max: 1,
        loot: [
            { tier: "ammo", weight: 1 },
            { tier: "healing_items", weight: 0.5 },
            { tier: "equipment", weight: 0.3 }
        ]
    }
};

export const LootTiers: Record<string, readonly WeightedItem[]> = {
    guns: [
        { item: "g19", weight: 2 },
        { item: "m1895", weight: 1.75 },
        { item: "mp40", weight: 1.7 },
        { item: "saf200", weight: 1.5 },
        { item: "cz75a", weight: 1.5 },
        { item: "hp18", weight: 1.25 },
        { item: "micro_uzi", weight: 1 },
        { item: "ak47", weight: 1 },
        { item: "model_37", weight: 0.95 },
        { item: "aug", weight: 0.7 },
        { item: "m3k", weight: 0.3 },
        { item: "m16a4", weight: 0.1 },
        { item: "arx160", weight: 0.1 },
        { item: "flues", weight: 0.1 },
        { item: "lewis_gun", weight: 0.05 },
        { item: "vss", weight: 0.02 },
        { item: "mg36", weight: 0.015 },
        { item: "sr25", weight: 0.01 },
        { item: "mini14", weight: 0.01 },
        { item: "mcx_spear", weight: 0.01 },
        { item: "cz600", weight: 0.008 },
        { item: "vepr12", weight: 0.008 },
        { item: "stoner_63", weight: 0.005 },
        { item: "radio", weight: 0.005 },
        { item: "mosin_nagant", weight: 0.005 },
        { item: "vector", weight: 0.004 },
        { item: "deagle", weight: 0.004 },
        { item: "negev", weight: 0.003 },
        { item: "mg5", weight: 0.003 },
        { item: "tango_51", weight: 0.002 },
        { item: "dual_deagle", weight: 0.001 }
    ],
    healing_items: [
        { item: "gauze", count: 5, weight: 3 },
        { item: "cola", weight: 2 },
        { item: "tablets", weight: 1 },
        { item: "medikit", weight: 1 }
    ],
    scopes: [
        { item: "2x_scope", weight: 1 },
        { item: "4x_scope", weight: 0.5 },
        { item: "8x_scope", weight: 0.1 },
        { item: "15x_scope", weight: 0.00025 }
    ],
    equipment: [
        { item: "basic_helmet", weight: 1 },
        { item: "regular_helmet", weight: 0.2 },
        { item: "tactical_helmet", weight: 0.01 },

        { item: "basic_vest", weight: 1 },
        { item: "regular_vest", weight: 0.2 },
        { item: "tactical_vest", weight: 0.01 },

        { item: "basic_pack", weight: 1 },
        { item: "regular_pack", weight: 0.2 },
        { item: "tactical_pack", weight: 0.01 }
    ],
    ammo: [
        { item: "12g", count: 10, weight: 0.75 },
        { item: "556mm", count: 60, weight: 1 },
        { item: "762mm", count: 60, weight: 1 },
        { item: "9mm", count: 60, weight: 1 },
        { item: "50cal", count: 20, weight: 0.05 }
    ],
    throwables: [
        { item: "frag_grenade", count: 2, weight: 1 },
        { item: "smoke_grenade", count: 2, weight: 1 },
        { item: "c4", count: 2, weight: 0.2 }
    ],
    special_guns: [
        { item: "micro_uzi", weight: 1.25 },
        { item: "ak47", weight: 1.1 },
        { item: "aug", weight: 1.05 },
        { item: "hp18", weight: 1 },
        { item: "mp40", weight: 1 },
        { item: "model_37", weight: 1 },
        { item: "m3k", weight: 0.8 },
        { item: "arx160", weight: 0.8 },
        { item: "flues", weight: 0.8 },
        { item: "saf200", weight: 0.75 },
        { item: "cz75a", weight: 0.75 },
        { item: "m16a4", weight: 0.5 },
        { item: "lewis_gun", weight: 0.5 },
        { item: "g19", weight: 0.45 },
        { item: "m1895", weight: 0.45 },
        { item: "vss", weight: 0.07 },
        { item: "mg36", weight: 0.06 },
        { item: "sr25", weight: 0.05 },
        { item: "mini14", weight: 0.05 },
        { item: "mcx_spear", weight: 0.05 },
        { item: "vepr12", weight: 0.04 },
        { item: "cz600", weight: 0.03 },
        { item: "stoner_63", weight: 0.01 },
        { item: "radio", weight: 0.01 },
        { item: "mosin_nagant", weight: 0.01 },
        { item: "vector", weight: 0.008 },
        { item: "deagle", weight: 0.008 },
        { item: "negev", weight: 0.005 },
        { item: "mg5", weight: 0.005 },
        { item: "tango_51", weight: 0.004 },
        { item: "dual_deagle", weight: 0.003 }
    ],
    special_healing_items: [
        { item: "cola", weight: 3 },
        { item: "tablets", weight: 1 },
        { item: "medikit", weight: 1 },
        { item: "gauze", count: 5, weight: 3 }
    ],
    special_scopes: [
        { item: "2x_scope", weight: 1 },
        { item: "4x_scope", weight: 0.45 },
        { item: "8x_scope", weight: 0.1 },
        { item: "15x_scope", weight: 0.005 }
    ],
    special_equipment: [
        { item: "basic_helmet", weight: 1 },
        { item: "regular_helmet", weight: 0.3 },
        { item: "tactical_helmet", weight: 0.03 },

        { item: "basic_vest", weight: 1 },
        { item: "regular_vest", weight: 0.3 },
        { item: "tactical_vest", weight: 0.03 },

        { item: "basic_pack", weight: 1 },
        { item: "regular_pack", weight: 0.3 },
        { item: "tactical_pack", weight: 0.03 }
    ],
    melee: [
        { item: "baseball_bat", weight: 3 },
        { item: "sickle", weight: 0.5 },
        { item: "kbar", weight: 2 }
    ],
    airdrop_equipment: [
        { item: "tactical_helmet", weight: 1 },
        { item: "tactical_vest", weight: 1 },
        { item: "tactical_pack", weight: 1 }
    ],
    airdrop_scopes: [
        { item: "4x_scope", weight: 1 },
        { item: "8x_scope", weight: 0.5 },
        { item: "15x_scope", weight: 0.0025 }
    ],
    airdrop_healing_items: [
        { item: "gauze", count: 5, weight: 1.5 },
        { item: "medikit", weight: 1 },
        { item: "cola", weight: 1 },
        { item: "tablets", weight: 1 }
    ],
    airdrop_skins: [
        { item: NullString, weight: 1 },
        { item: "stardust", weight: 0.5 },
        { item: "aurora", weight: 0.5 },
        { item: "nebula", weight: 0.4 },
        { item: "ghillie_suit", weight: 0.1 },
        { item: "basic_outfit", weight: 0.001 }
    ],
    airdrop_melee: [
        { item: NullString, weight: 1 },
        { item: "crowbar", weight: 0.1 },
        { item: "hatchet", weight: 0.1 },
        { item: "sickle", weight: 0.1 },
        { item: "kbar", weight: 0.1 }
    ],
    airdrop_guns: [
        { item: "mini14", weight: 1 },
        { item: "sr25", weight: 1 },
        { item: "vss", weight: 1 },
        { item: "vector", weight: 1 },
        { item: "vepr12", weight: 1 },
        { item: "deagle", weight: 1 },
        { item: "cz600", weight: 1 },
        { item: "mcx_spear", weight: 0.95 },
        { item: "model_89", weight: 0.95 },
        { item: "mosin_nagant", weight: 0.95 },
        { item: "tango_51", weight: 0.9 },
        { item: "stoner_63", weight: 0.9 },
        { item: "radio", weight: 0.1 }
    ],
    gold_airdrop_guns: [
        { item: "m1_garand", weight: 1.1 },
        { item: "acr", weight: 1 },
        { item: "pp19", weight: 1 },
        { item: "negev", weight: 1 },
        { item: "mg5", weight: 1 },
        { item: "l115a1", weight: 0.5 },
        { item: "dual_rsh12", weight: 0.5 },
        { item: "g19", weight: 0.0005 }
    ],
    winter_skins: [
        { item: "peppermint", weight: 1 },
        { item: "spearmint", weight: 1 },
        { item: "coal", weight: 1 },
        { item: "henrys_little_helper", weight: 1 },
        { item: "candy_cane", weight: 1 }
    ],
    special_winter_skins: [
        { item: "christmas_tree", weight: 1 },
        { item: "gingerbread", weight: 1 }
    ],
    viking_chest_guns: [
        { item: "arx160", weight: 1 },
        { item: "m16a4", weight: 1 },
        { item: "m3k", weight: 1 },
        { item: "flues", weight: 0.9 },
        { item: "mini14", weight: 0.75 },
        { item: "sr25", weight: 0.75 },
        { item: "vss", weight: 0.75 },
        { item: "mcx_spear", weight: 0.75 },
        { item: "mg36", weight: 0.725 },
        { item: "cz600", weight: 0.7 },
        { item: "vepr12", weight: 0.6 },
        { item: "lewis_gun", weight: 0.6 },
        { item: "mosin_nagant", weight: 0.5 },
        { item: "vector", weight: 0.4 },
        { item: "stoner_63", weight: 0.15 },
        { item: "negev", weight: 0.1 },
        { item: "mg5", weight: 0.1 },
        { item: "tango_51", weight: 0.1 },
        { item: "deagle", weight: 0.1 },
        { item: "g19", weight: 0.05 },
        { item: "dual_deagle", weight: 0.04 }
    ],
    river_chest_guns: [
        { item: "m16a4", weight: 1 },
        { item: "cz600", weight: 0.75 },
        { item: "mini14", weight: 0.75 },
        { item: "mcx_spear", weight: 0.55 },
        { item: "sr25", weight: 0.5 },
        { item: "vss", weight: 0.5 },
        { item: "mg36", weight: 0.45 },
        { item: "mosin_nagant", weight: 0.45 },
        { item: "vector", weight: 0.4 },
        { item: "stoner_63", weight: 0.08 },
        { item: "tango_51", weight: 0.08 },
        { item: "g19", weight: 0.08 }
    ]
};
