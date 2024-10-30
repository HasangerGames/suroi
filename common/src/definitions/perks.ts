import { type DeepPartial } from "../utils/misc";
import { ItemType, ObjectDefinitions, type GetMissing, type ItemDefinition, type RawDefinition, type ReferenceTo } from "../utils/objectDefinitions";

export interface BasicPerk extends ItemDefinition {
    readonly itemType: ItemType.Perk
    readonly description: string
    readonly giveByDefault: boolean
    readonly categories: readonly PerkCategories[]
    readonly type?: string
}

const defaultTemplate = {
    itemType: ItemType.Perk as const,
    noDrop: false,
    giveByDefault: false,
    categories: [] as readonly PerkCategories[]
} satisfies DeepPartial<BasicPerk>;

export const updateInterval: unique symbol = Symbol.for("update interval");

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
    Splinter = "splinter",
    Sabot = "sabot",
    HiCap = "hi_cap",
    DemoExpert = "demo_expert",
    AdvancedAthletics = "advanced_athletics",
    Toploaded = "toploaded",
    InfiniteAmmo = "infinite_ammo",
    FieldMedic = "field_medic",
    Berserker = "stark_melee_gauntlet",
    CloseQuartersCombat = "cqc",
    LowProfile = "low_profile",

    //
    // Halloween Perks
    //
    PlumpkinGamble = "lets_go_gambling",
    Lycanthropy = "werewolf",
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
        categories: [PerkCategories.Normal],

        cutoff: 0.5,
        speedMod: 1.4
    },
    {
        idString: PerkIds.Splinter,
        name: "Fléchettes",
        description: "All bullets splinter into 3 weaker versions.",
        categories: [PerkCategories.Normal],

        split: 3,
        damageMod: 0.4
    },
    {
        idString: PerkIds.Sabot,
        name: "Sabot Rounds",
        description: "Large increase to range, velocity, and accuracy, but at the cost of lower damage.",
        categories: [PerkCategories.Normal],

        rangeMod: 1.5,
        speedMod: 1.5,
        spreadMod: 0.6,
        damageMod: 0.9,
        tracerLengthMod: 1.2
    },
    {
        idString: PerkIds.HiCap,
        name: "Extended Mags",
        description: "Most weapons have increased bullet capacity.",
        categories: [PerkCategories.Normal]

        // define for each weapon individually
    },
    {
        idString: PerkIds.DemoExpert,
        name: "Demo Expert",
        description: "Grenades have a greater throwing range and visible detonation point.",
        categories: [PerkCategories.Normal],

        rangeMod: 2,
        [updateInterval]: 10e3, // milliseconds
        restoreAmount: 0.25 // times max capacity
    },
    {
        idString: PerkIds.AdvancedAthletics,
        name: "Advanced Athletics",
        description: "Move faster in water and smoke, walk through trees, and vault through windows.",
        categories: [PerkCategories.Normal],

        // all multiplicative
        waterSpeedMod: (1 / 0.7) * 1.3,
        smokeSpeedMod: 1.2
    },
    {
        idString: PerkIds.Toploaded,
        name: "Toploaded",
        description: "Do more damage with the top half of your magazine.",
        categories: [PerkCategories.Normal],

        thresholds: [
            [0.2, 1.25],
            [0.49, 1.1]
        ] as ReadonlyArray<readonly [number, number]>
    },
    {
        idString: PerkIds.InfiniteAmmo,
        name: "Infinite Ammo",
        description: "All weapons have unlimited ammo. Electronic devices may break if overused.",
        categories: [PerkCategories.Normal],

        airdropCallerLimit: 3
    },
    {
        idString: PerkIds.FieldMedic,
        name: "Field Medic",
        description: "All consumable items can be used faster. Teammates can be revived more quickly.",
        categories: [PerkCategories.Normal],

        usageMod: 1.5 // divide
    },
    {
        idString: PerkIds.Berserker,
        name: "Berserker",
        description: "Melee weapons make you move faster when equipped, and deal more damage.",
        categories: [PerkCategories.Normal],

        speedMod: 1.3, // multiplicative
        damageMod: 1.3 // multiplicative
    },
    {
        idString: PerkIds.CloseQuartersCombat,
        name: "Close Quarters Combat",
        description: "Weapons do more damage and reload faster at close range.",
        categories: [PerkCategories.Normal],

        cutoff: 60,
        reloadMod: 1.2, // divide
        damageMod: 1.1 // multiplicative
    },
    {
        idString: PerkIds.LowProfile,
        name: "Low Profile",
        description: "Become smaller and take less damage from explosions.",
        categories: [PerkCategories.Normal],

        sizeMod: 0.8, // multiplicative
        explosionMod: 0.7 // multiplicative
    },

    //
    // Halloween perks
    //
    {
        idString: PerkIds.PlumpkinGamble,
        name: "Plumpkin Gamble",
        description: "Picks a random Halloween perk.",
        categories: [PerkCategories.Halloween]

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
        description: "Become a werewolf with high speed, health, regeneration, and melee damage, but can't use guns & grenades. Ally with other werewolves.",
        categories: [PerkCategories.Halloween],

        speedMod: 1.3,
        healthMod: 2,
        regenRate: 0.5,
        meleeMult: 2,
        noDrop: true,
        type: "positive"
    },
    {
        idString: PerkIds.Bloodthirst,
        name: "Bloodthirst",
        description: "Gain 25% adrenaline, 25% health, and a speed boost on kill. Slowly lose health over time.",
        categories: [PerkCategories.Halloween],

        speedMod: 1.5,
        speedBoostDuration: 2000, // sec
        healthLoss: 1,
        [updateInterval]: 1e3,
        healBonus: 25,
        adrenalineBonus: 25,
        noDrop: true,
        type: "positive"
    },
    {
        idString: PerkIds.PlumpkinBomb,
        name: "Plumpkin Bomb",
        description: "All plumpkins/pumpkins explode when destroyed. Throwables have a special appearance and do extra damage.",
        categories: [PerkCategories.Halloween],

        damageMod: 1.2, // for grenades
        plumpkinExplosionDmg: 100,
        noDrop: true,
        type: "positive"
    },
    {
        idString: PerkIds.Shrouded,
        name: "Shrouded",
        description: "Emit a trail of thick fog that other players have difficulty seeing through.",
        categories: [PerkCategories.Halloween],

        smokeAlpha: 0.7,
        smokeAlphaSelf: 0.1,
        noDrop: true,
        type: "positive"
    },
    {
        idString: PerkIds.ExperimentalTreatment,
        name: "Experimental Treatment",
        description: "Permanent adrenaline, but reduced max health.",
        categories: [PerkCategories.Halloween],

        adrenDecay: 0,
        adrenSet: 1,
        healthMod: 0.8,
        noDrop: true,
        type: "neutral"
    },
    {
        idString: PerkIds.Engorged,
        name: "Engorged",
        description: "Increased max health and size with each kill.",
        categories: [PerkCategories.Halloween],

        hpMod: 10, // additive
        sizeMod: 1.05, // multiplicative
        killsLimit: 10,
        noDrop: true,
        type: "neutral"
    },
    {
        idString: PerkIds.BabyPlumpkinPie,
        name: "Baby Plumpkin Pie",
        description: "Your held weapon randomizes every 20 seconds and after every kill.",
        categories: [PerkCategories.Halloween],

        [updateInterval]: 20e3, // milliseconds
        noDrop: true,
        type: "neutral" // how is this neutral its annoying
    },
    {
        idString: PerkIds.Costumed,
        name: "Costumed",
        description: "Become a Pumpkin, or very rarely, a Plumpkin.",
        categories: [PerkCategories.Halloween],

        plumpkinVariantChance: 0.01,
        noDrop: true,
        type: "neutral"
    },
    {
        idString: PerkIds.TornPockets,
        name: "Torn Pockets",
        description: "Every second, drop 2 of a random ammo on the ground.",
        categories: [PerkCategories.Halloween],

        [updateInterval]: 1e3,
        dropCount: 2,
        noDrop: true,
        type: "negative"
    },
    {
        idString: PerkIds.Claustrophobic,
        name: "Claustrophobic",
        description: "Move slower inside buildings and bunkers.",
        categories: [PerkCategories.Halloween],

        speedMod: 0.9,
        noDrop: true,
        type: "negative"
    },
    {
        idString: PerkIds.LacedStimulants,
        name: "Laced Stimulants",
        description: "Instead of healing you, adrenaline damages you at half the normal healing rate.",
        categories: [PerkCategories.Halloween],

        healDmgRate: 0.5,
        lowerHpLimit: 5, // absolute
        noDrop: true,
        type: "negative"
    },
    {
        idString: PerkIds.RottenPlumpkin,
        name: "Rotten Plumpkin",
        description: "Every 10 seconds, you send the vomit emote and lose 5% adrenaline and 5 health.",
        categories: [PerkCategories.Halloween],

        [updateInterval]: 10e3, // milliseconds
        emote: "vomiting_face",
        adrenLoss: 5, // percentage
        healthLoss: 5, // absolute
        noDrop: true,
        type: "negative"
    },
    {
        idString: PerkIds.PriorityTarget,
        name: "Priority Target",
        description: "All players on the map can see your location.",
        categories: [PerkCategories.Halloween],

        noDrop: true,
        type: "negative"
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

    /**
     *  There are two ways to write a set of perks to the
     *  stream: either as a bitfield, or by writing the number
     *  of perks and then each perk's id.
     *
     *  Let's say there are `n` total perks. (`Perks.definitions.length === n`)\
     *  Let the bit count therefore be `b`. (`ceil(log2(n)) === b === Perks.bitCount`)
     *
     *  Writing a bitfield will always take `n` bits.\
     *  Writing the number of perks followed by the perks' ids will take `b • (x + 1)` bits,
     *  where `x` is the number of perks being sent.
     *
     *  Thus, we land on an optimization problem—when is one method better than another.
     *  The solution is pretty easy—solving for `x` in `n ≤ b(x + 1)` gives `x ≤ (n / b) - 1`.
     *  We write a boolean to the stream to indicate which method we're using, and our
     *  new cutoff is `x ≤ n / b`.
     *
     * Since `n / b` is a constant, we store it in this attribute
     *
     * [Source](https://www.desmos.com/calculator/llvgo1v32i)
     */
    readonly bitfieldCutoff: number;

    // forward as public
    declare readonly idStringToNumber: Readonly<Record<PerkNames, number>>;

    constructor(definitions: ReadonlyArray<GetMissing<BasicPerk, typeof defaultTemplate>>) {
        super(definitions as ReadonlyArray<RawDefinition<PerkDefinition>>, defaultTemplate as DeepPartial<PerkDefinition>);

        this.bitfieldCutoff = ~~(this.bitCount / this.definitions.length);

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
