import { type DeepPartial } from "../utils/misc";
import { ItemType, ObjectDefinitions, type GetMissing, type ItemDefinition, type RawDefinition, type ReferenceTo } from "../utils/objectDefinitions";

export const enum PerkQualities {
    Positive = "positive",
    Neutral = "neutral",
    Negative = "negative"
}

export interface BasicPerk extends ItemDefinition {
    readonly itemType: ItemType.Perk
    readonly description: string
    readonly giveByDefault: boolean
    readonly category: PerkCategories
    readonly updateInterval?: number
    readonly type?: PerkQualities
    readonly noSwap?: boolean
    readonly alwaysAllowSwap?: boolean
    readonly plumpkinGambleIgnore?: boolean
}

const defaultTemplate = {
    itemType: ItemType.Perk as const,
    noDrop: false,
    giveByDefault: false
} satisfies DeepPartial<BasicPerk>;

/**
 * As the name implies, loosens numeric literal type to be `number`
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
    Berserker = "stark_melee_gauntlet",
    CloseQuartersCombat = "close_quarters_combat",
    LowProfile = "low_profile",

    //
    // Halloween Perks
    //
    PlumpkinGamble = "lets_go_gambling",
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
    PriorityTarget = "priority_target"
}

export const enum PerkCategories {
    Normal,
    Halloween
}

const perks = [
    //
    // Normal Perks
    //
    {
        idString: PerkIds.SecondWind,
        name: "Second Wind",
        description: "Move faster below half health.",
        category: PerkCategories.Normal,

        cutoff: 0.5,
        speedMod: 1.4
    },
    {
        idString: PerkIds.Flechettes,
        name: "Fléchettes",
        description: "All bullets splinter into 3 weaker versions.",
        category: PerkCategories.Normal,

        split: 3,
        deviation: 0.7,
        damageMod: 0.4
    },
    {
        idString: PerkIds.SabotRounds,
        name: "Sabot Rounds",
        description: "Large increase to range, velocity, and accuracy, but at the cost of lower damage.",
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
        description: "Most weapons have increased bullet capacity.",
        category: PerkCategories.Normal

        // define for each weapon individually
    },
    {
        idString: PerkIds.DemoExpert,
        name: "Demo Expert",
        description: "Grenades have a greater throwing range and visible detonation point.",
        category: PerkCategories.Normal,

        updateInterval: 10e3, // milliseconds
        rangeMod: 2,
        restoreAmount: 0.25 // times max capacity
    },
    {
        idString: PerkIds.AdvancedAthletics,
        name: "Advanced Athletics",
        description: "Move faster in water and smoke, walk through trees, and vault through windows.",
        category: PerkCategories.Normal,

        // all multiplicative
        waterSpeedMod: (1 / 0.7) * 1.3,
        smokeSpeedMod: 1.3
    },
    {
        idString: PerkIds.Toploaded,
        name: "Toploaded",
        description: "Do more damage with the top half of your magazine.",
        category: PerkCategories.Normal,

        thresholds: [
            [0.2, 1.25],
            [0.49, 1.1]
        ] as ReadonlyArray<readonly [number, number]>
    },
    {
        idString: PerkIds.InfiniteAmmo,
        name: "Infinite Ammo",
        description: "All weapons have unlimited ammo. Electronic devices may break if overused.",
        category: PerkCategories.Normal,

        airdropCallerLimit: 3
    },
    {
        idString: PerkIds.FieldMedic,
        name: "Field Medic",
        description: "All consumable items can be used faster. Teammates can be revived more quickly.",
        category: PerkCategories.Normal,

        usageMod: 1.5 // divide
    },
    {
        idString: PerkIds.Berserker,
        name: "Berserker",
        description: "Melee weapons make you move faster when equipped, and deal more damage.",
        category: PerkCategories.Normal,

        speedMod: 1.2, // multiplicative
        damageMod: 1.2 // multiplicative
    },
    {
        idString: PerkIds.CloseQuartersCombat,
        name: "Close Quarters Combat",
        description: "Weapons do more damage and reload faster at close range.",
        category: PerkCategories.Normal,

        cutoff: 50,
        reloadMod: 1.3, // divide
        damageMod: 1.2 // multiplicative
    },
    {
        idString: PerkIds.LowProfile,
        name: "Low Profile",
        description: "Become smaller and take less damage from explosions.",
        category: PerkCategories.Normal,

        sizeMod: 0.8, // multiplicative
        explosionMod: 0.5 // multiplicative
    },

    //
    // Halloween perks
    //
    {
        idString: PerkIds.PlumpkinGamble,
        name: "Plumpkin Gamble",
        description: "Picks a random Halloween perk.",
        category: PerkCategories.Halloween,

        noDrop: true,
        plumpkinGambleIgnore: true

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
        description: "Become a werewolf with high speed, health, regeneration, and melee damage, but can't use guns & grenades.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Positive,

        speedMod: 1.3,
        healthMod: 1.5,
        regenRate: 1,
        damageMod: 2.5,
        noDrop: true,
        noSwap: false
    },
    {
        idString: PerkIds.Bloodthirst,
        name: "Bloodthirst",
        description: "Gain 25% adrenaline, 25% health, and a speed boost on kill. Slowly lose health over time.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Positive,

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
        description: "All plumpkins/pumpkins explode when destroyed. Throwables have a special appearance and do extra damage.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Positive,

        damageMod: 1.2, // for grenades
        noDrop: true
    },
    {
        idString: PerkIds.Shrouded,
        name: "Shrouded",
        description: "Emit a trail of thick fog that other players have difficulty seeing through.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Positive,

        updateInterval: 100,
        noDrop: true
    },
    {
        idString: PerkIds.ExperimentalTreatment,
        name: "Experimental Treatment",
        description: "Permanent adrenaline, but reduced max health.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Neutral,

        adrenDecay: 0,
        adrenSet: 1,
        healthMod: 0.8,
        noDrop: true
    },
    {
        idString: PerkIds.Engorged,
        name: "Engorged",
        description: "Increased max health and size with each kill.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Neutral,

        hpMod: 10, // additive
        sizeMod: 1.05, // multiplicative
        killsLimit: 10,
        noDrop: true
    },
    {
        idString: PerkIds.BabyPlumpkinPie,
        name: "Baby Plumpkin Pie",
        description: "Your held weapon randomizes every 10 seconds and after every kill.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Neutral, // how is this neutral it's annoying

        updateInterval: 10e3, // milliseconds
        noDrop: true,
        noSwap: false
    },
    {
        idString: PerkIds.Costumed,
        name: "Costumed",
        description: "Become a random obstacle. Rare chance to become a Plumpkin variant.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Neutral,

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
        alwaysAllowSwap: true
    },
    {
        idString: PerkIds.TornPockets,
        name: "Torn Pockets",
        description: "Every two seconds, drop 2 of a random ammo on the ground.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Negative,

        updateInterval: 2e3,
        dropCount: 2,
        noDrop: true
    },
    {
        idString: PerkIds.Claustrophobic,
        name: "Claustrophobic",
        description: "Move slower inside buildings and bunkers.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Negative,

        speedMod: 0.75,
        noDrop: true
    },
    {
        idString: PerkIds.LacedStimulants,
        name: "Laced Stimulants",
        description: "Instead of healing you, adrenaline damages you at half the normal healing rate.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Negative,

        healDmgRate: 0.5,
        lowerHpLimit: 5, // absolute
        noDrop: true
    },
    {
        idString: PerkIds.RottenPlumpkin,
        name: "Rotten Plumpkin",
        description: "Every 10 seconds, you send the vomit emote and lose 5% adrenaline and 5 health.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Negative,

        updateInterval: 10e3, // milliseconds
        emote: "vomiting_face",
        adrenLoss: 5, // percentage
        healthLoss: 5, // absolute
        noDrop: true
    },
    {
        idString: PerkIds.PriorityTarget,
        name: "Priority Target",
        description: "All players on the map can see your location.",
        category: PerkCategories.Halloween,
        type: PerkQualities.Negative,

        noDrop: true,
        plumpkinGambleIgnore: true
    }
] as const satisfies ReadonlyArray<
    GetMissing<
        BasicPerk,
        typeof defaultTemplate
    > & Record<string, unknown>
>;

export type PerkDefinition = LoosenNumerics<(typeof perks)[number]> & BasicPerk;

export type PerkNames = ReferenceTo<PerkDefinition>;

class PerkDefinitions extends ObjectDefinitions<PerkDefinition> {
    readonly defaults: readonly PerkDefinition[];

    readonly idStringToNumber: Readonly<Record<PerkNames, number>>;

    constructor(definitions: ReadonlyArray<GetMissing<BasicPerk, typeof defaultTemplate>>) {
        super(
            "Perks",
            definitions as ReadonlyArray<RawDefinition<PerkDefinition>>,
            defaultTemplate as DeepPartial<PerkDefinition>
        );

        this.idStringToNumber = {} as Record<PerkNames, number>;
        for (let i = 0, defLength = this.definitions.length; i < defLength; i++) {
            const idString = this.definitions[i].idString;

            // @ts-expect-error init code
            this.idStringToNumber[idString] = i;
        }

        this.defaults = this.definitions.filter(({ giveByDefault }) => giveByDefault);
    }
};

export const Perks = new PerkDefinitions(perks);

export const PerkData = Object.freeze(
    perks.reduce(
        (acc, cur) => {
            // @ts-expect-error ts2590 gaming
            acc[cur.idString] = cur;
            return acc;
        },
        {} as {
            [K in PerkNames]: PerkDefinition & { readonly idString: K }
        }
    )
);
