import { DefinitionType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";
import { FloorTypes } from "../../utils/terrain";

interface BasePerkDefinition extends ItemDefinition {
    readonly defType: DefinitionType.Perk

    readonly category: PerkCategories
    readonly updateInterval?: number
    readonly quality?: PerkQualities
    readonly noSwap?: boolean
    readonly alwaysAllowSwap?: boolean
    readonly plumpkinGambleIgnore?: boolean
    readonly infectedEffectIgnore?: boolean
    readonly hideInHUD?: boolean
}

/**
 * As the name implies, loosens numeric literal type (e.g. 1.2) to be `number`
 */
type LoosenNumerics<T> = T extends object
    ? {
        [K in keyof T]: LoosenNumerics<T[K]>
    }
    : (
        T extends number
            ? number extends T
                ? T
                : number
            : T
    );

export type PerkDefinition = LoosenNumerics<typeof perks[number]> & BasePerkDefinition;

export const enum PerkCategories {
    Normal,
    Halloween,
    Hunted,
    Infection
}

export const enum PerkQualities {
    Positive = "positive",
    Neutral = "neutral",
    Negative = "negative"
}

export const enum PerkIds {
    //
    // Normal Perks
    //
    SecondWind = "second_wind",
    Flechettes = "flechettes",
    SabotRounds = "sabot_rounds",
    ExtendedMags = "extended_mags",
    DemoExpert = "demo_expert",
    AdvancedAthletics = "advanced_athletics",
    Toploaded = "toploaded",
    InfiniteAmmo = "infinite_ammo",
    FieldMedic = "field_medic",
    Berserker = "berserker",
    CloseQuartersCombat = "close_quarters_combat",
    LowProfile = "low_profile",
    CombatExpert = "combat_expert",
    PrecisionRecycling = "precision_recycling",
    LootBaron = "loot_baron",
    Overclocked = "overclocked",
    ReflectiveRounds = "reflective_rounds",

    //
    // Halloween Perks
    //
    PlumpkinGamble = "plumpkin_gamble",
    Lycanthropy = "lycanthropy",
    Bloodthirst = "bloodthirst",
    PlumpkinBomb = "plumpkin_bomb",
    Shrouded = "shrouded",
    ExperimentalTreatment = "experimental_treatment",
    Engorged = "engorged",
    BabyPlumpkinPie = "baby_plumpkin_pie",
    Costumed = "costumed",
    TornPockets = "torn_pockets",
    Claustrophobic = "claustrophobic",
    LacedStimulants = "laced_stimulants",
    RottenPlumpkin = "rotten_plumpkin",
    PriorityTarget = "priority_target",
    Butterfingers = "butterfingers",
    Overweight = "overweight",

    //
    // Infection
    //
    Infected = "infected",
    Necrosis = "necrosis",
    Immunity = "immunity",

    // H.U.N.T.E.D.
    HollowPoints = "hollow_points",
    ExperimentalForcefield = "experimental_forcefield",
    ThermalGoggles = "thermal_goggles",
    Overdrive = "overdrive"
}

const perks = [
    //
    // Normal Perks
    //
    {
        idString: PerkIds.SecondWind,
        name: "Second Wind",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        cutoff: 0.5,
        speedMod: 1.4
    },
    {
        idString: PerkIds.Flechettes,
        name: "Fléchettes",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        split: 3,
        deviation: 0.7,
        damageMod: 0.4
    },
    {
        idString: PerkIds.SabotRounds,
        name: "Sabot Rounds",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        rangeMod: 1.5,
        speedMod: 1.5,
        spreadMod: 0.6,
        damageMod: 0.9,
        tracerLengthMod: 1.2
    },
    {
        idString: PerkIds.ExtendedMags,
        name: "Extended Mags",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal

        // define for each weapon individually
    },
    {
        idString: PerkIds.DemoExpert,
        name: "Demo Expert",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        updateInterval: 10e3, // milliseconds
        rangeMod: 2,
        restoreAmount: 0.25 // times max capacity
    },
    {
        idString: PerkIds.AdvancedAthletics,
        name: "Advanced Athletics",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        // all multiplicative
        waterSpeedMod: (1 / (FloorTypes.water.speedMultiplier ?? 1)) * 1.3,
        smokeSpeedMod: 1.3
    },
    {
        idString: PerkIds.Toploaded,
        name: "Toploaded",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        thresholds: [
            [0.2, 1.25],
            [0.49, 1.1]
        ] as ReadonlyArray<readonly [number, number]>
    },
    {
        idString: PerkIds.InfiniteAmmo,
        name: "Infinite Ammo",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        airdropCallerLimit: 3
    },
    {
        idString: PerkIds.FieldMedic,
        name: "Field Medic",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        usageMod: 1.5 // divide
    },
    {
        idString: PerkIds.Berserker,
        name: "Berserker",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        speedMod: 1.2, // multiplicative
        damageMod: 1.2 // multiplicative
    },
    {
        idString: PerkIds.CloseQuartersCombat,
        name: "Close Quarters Combat",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        cutoff: 50,
        reloadMod: 1.3, // divide
        damageMod: 1.2 // multiplicative
    },
    {
        idString: PerkIds.LowProfile,
        name: "Low Profile",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,

        sizeMod: 0.8, // multiplicative
        explosionMod: 0.5 // multiplicative
    },
    {
        idString: PerkIds.CombatExpert,
        name: "Combat Expert",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,
        reloadMod: 1.25
    },
    {
        idString: PerkIds.PrecisionRecycling,
        name: "Precision Recycling",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,
        updateInterval: 1e3, // milliseconds
        hitReq: 2,
        accThreshold: 0.5,
        refund: 2,
        margin: 3 // times fireDelay
    },
    {
        idString: PerkIds.LootBaron,
        name: "Loot Baron",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,
        lootBonus: 1
    },
    {
        idString: PerkIds.Overclocked,
        name: "Overclocked",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal,
        fireRateMod: 0.5,
        spreadMod: 2.5
    },
    {
        idString: PerkIds.ReflectiveRounds,
        name: "Reflective Rounds",
        defType: DefinitionType.Perk,
        category: PerkCategories.Normal
    },
    //
    // Halloween perks
    //
    {
        idString: PerkIds.PlumpkinGamble,
        name: "Plumpkin Gamble",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,

        noDrop: true,
        plumpkinGambleIgnore: true,
        infectedEffectIgnore: true

        /*
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
            krr krr krr *buzzer* aw dang it! krr krr krr *buzzer* aw dang it!
        */
    },
    {
        idString: PerkIds.Lycanthropy,
        name: "Lycanthropy",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Positive,

        speedMod: 1.3,
        healthMod: 1.5,
        regenRate: 1,
        damageMod: 2,
        noDrop: true,
        infectedEffectIgnore: true
    },
    {
        idString: PerkIds.Bloodthirst,
        name: "Bloodthirst",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Positive,

        updateInterval: 1e3,
        speedMod: 1.5,
        speedBoostDuration: 2000, // sec
        healthLoss: 1,
        healBonus: 25,
        adrenalineBonus: 25,
        noDrop: true
    },
    {
        idString: PerkIds.PlumpkinBomb,
        name: "Plumpkin Bomb",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Positive,

        damageMod: 1.2, // for grenades
        noDrop: true
    },
    {
        idString: PerkIds.Shrouded,
        name: "Shrouded",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Positive,

        updateInterval: 100,
        noDrop: true
    },
    {
        idString: PerkIds.ExperimentalTreatment,
        name: "Experimental Treatment",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Neutral,

        adrenDecay: 0,
        adrenSet: 1,
        healthMod: 0.8,
        noDrop: true,
        infectedEffectIgnore: true
    },
    {
        idString: PerkIds.Engorged,
        name: "Engorged",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Neutral,

        healthMod: 10, // additive
        sizeMod: 1.05, // multiplicative
        killsLimit: 10,
        noDrop: true,
        infectedEffectIgnore: true
    },
    {
        idString: PerkIds.BabyPlumpkinPie,
        name: "Baby Plumpkin Pie",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Neutral, // how is this neutral it's annoying

        updateInterval: 10e3, // milliseconds
        noDrop: true
    },
    {
        idString: PerkIds.Costumed,
        name: "Costumed",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Neutral,

        choices: {
            oak_tree: 1,
            dormant_oak_tree: 1,
            maple_tree: 1,
            pine_tree: 1,
            birch_tree: 1,
            stump: 1,

            rock: 1,

            regular_crate: 1,

            barrel: 1,
            super_barrel: 1,

            vibrant_bush: 1,
            oak_leaf_pile: 1,
            hay_bale: 1,

            baby_plumpkin: 0.01,
            plumpkin: 0.01,
            diseased_plumpkin: 0.01
        },
        noDrop: true,
        alwaysAllowSwap: true,
        infectedEffectIgnore: true
    },
    {
        idString: PerkIds.TornPockets,
        name: "Torn Pockets",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Negative,

        updateInterval: 2e3,
        dropCount: 2,
        noDrop: true
    },
    {
        idString: PerkIds.Claustrophobic,
        name: "Claustrophobic",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Negative,

        speedMod: 0.75,
        noDrop: true
    },
    {
        idString: PerkIds.LacedStimulants,
        name: "Laced Stimulants",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Negative,

        healDmgRate: 0.5,
        lowerHpLimit: 5, // absolute
        noDrop: true
    },
    {
        idString: PerkIds.RottenPlumpkin,
        name: "Rotten Plumpkin",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Negative,

        updateInterval: 10e3, // milliseconds
        emote: "vomiting_face",
        adrenLoss: 5, // percentage
        healthLoss: 5, // absolute
        noDrop: true
    },
    {
        idString: PerkIds.PriorityTarget,
        name: "Priority Target",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Negative,
        mapIndicator: PerkIds.PriorityTarget,
        noDrop: true
    },
    {
        idString: PerkIds.Butterfingers,
        name: "Butterfingers",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Negative,
        reloadMod: 0.75,
        noDrop: true
    },
    {
        idString: PerkIds.Overweight,
        name: "Overweight",
        defType: DefinitionType.Perk,
        category: PerkCategories.Halloween,
        quality: PerkQualities.Negative,
        sizeMod: 1.5,
        noDrop: true
    },
    //
    // Infection Mode
    //
    {
        idString: PerkIds.Infected,
        name: "Infected",
        defType: DefinitionType.Perk,
        category: PerkCategories.Infection,
        quality: PerkQualities.Negative,
        updateInterval: 30000,
        noDrop: true,
        plumpkinGambleIgnore: true
    },
    {
        idString: PerkIds.Necrosis,
        name: "Necrosis",
        defType: DefinitionType.Perk,
        category: PerkCategories.Infection,
        updateInterval: 1000,
        dps: 0.78,
        infectionRadius: 20,
        infectionUnits: 5,
        minHealth: 5,
        hideInHUD: true,
        noDrop: true
        // what are you looking at? i dont wanna be added in the wiki im not even visible to you
    },
    {
        idString: PerkIds.Immunity,
        name: "Immunity",
        defType: DefinitionType.Perk,
        category: PerkCategories.Infection,
        quality: PerkQualities.Positive,
        duration: 15000,
        noDrop: true,
        plumpkinGambleIgnore: true
    },
    //
    // Hunted Mode
    //
    {
        idString: PerkIds.HollowPoints,
        name: "Hollow Points",
        defType: DefinitionType.Perk,
        category: PerkCategories.Hunted,
        damageMod: 1.1,
        soundMod: 75,
        highlightDuration: 5000,
        noDrop: true,
        infectedEffectIgnore: true
    },
    {
        idString: PerkIds.ExperimentalForcefield,
        name: "Experimental Forcefield",
        defType: DefinitionType.Perk,
        category: PerkCategories.Hunted,
        noDrop: true,
        shieldRegenRate: 1,
        shieldRespawnTime: 20e3, // seconds

        shieldObtainSound: "shield_obtained",
        shieldDestroySound: "shield_destroyed",
        shieldHitSound: "glass", // "_hit_1/2" is added by the client
        shieldParticle: "window_particle",
        infectedEffectIgnore: true
    },
    {
        idString: PerkIds.ThermalGoggles,
        name: "Thermal Goggles",
        defType: DefinitionType.Perk,
        category: PerkCategories.Hunted,
        noDrop: true,
        detectionRadius: 100,
        infectedEffectIgnore: true
    },
    {
        idString: PerkIds.Overdrive,
        name: "Overdrive",
        defType: DefinitionType.Perk,
        category: PerkCategories.Hunted,
        quality: PerkQualities.Negative,
        plumpkinGambleIgnore: true,
        infectedEffectIgnore: true,
        noDrop: true,

        particle: "charged_particle",
        activatedSound: "overdrive",
        requiredKills: 0, // its actually 1 i know but code works with 0 (it takes it as 1)
        speedMod: 1.25,
        speedBoostDuration: 10e3, // msec
        sizeMod: 1.05,
        healBonus: 25,
        adrenalineBonus: 25,
        // achieveTime: 30e3, // msec
        cooldown: 12e3 // msec
    }
] as const satisfies ReadonlyArray<BasePerkDefinition & Record<string, unknown>>;

export const Perks = new ObjectDefinitions<PerkDefinition>(perks);
export const PerkData = Perks.idStringToDef as { [K in PerkIds]: Extract<PerkDefinition, { idString: K }> };
