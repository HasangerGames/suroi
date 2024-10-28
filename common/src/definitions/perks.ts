import { type DeepPartial } from "../utils/misc";
import { ItemType, ObjectDefinitions, type GetMissing, type ItemDefinition, type RawDefinition, type ReferenceTo } from "../utils/objectDefinitions";

export interface BasicPerk extends ItemDefinition {
    readonly itemType: ItemType.Perk
    readonly description: string
    readonly giveByDefault: boolean
    readonly categories: readonly PerkCategories[]
}

const defaultTemplate = {
    itemType: ItemType.Perk as const,
    noDrop: false,
    giveByDefault: false,
    categories: [] as readonly PerkCategories[]
} satisfies DeepPartial<BasicPerk>;

export const updateInterval: unique symbol = Symbol.for("update interval");

/**
 *? **Lycanthropy**:           Transforms you into a werewolf with high speed, health, regeneration,
 *?                            and melee damage, but become unable to use guns and grenades. Become
 *?                            allies with other werewolves.
 *
 *  **Second Wind**:           Move faster below 50% health.
 *
 *  **Overstimulated**:        Gain permanent adrenaline, but have reduced max health.
 *
 *  **Fléchettes**:            All bullets splinter into 3 weaker versions.
 *
 *  **Sabot Rounds**:          Large velocity and range increase, but 20% lower damage
 *
 *  **Extended Magazines**:    Most weapons have larger mag sizes.
 *
 *  **Engorged**:              Gain max health and size with each kill.
 *
 *! **Precision Recycling**:   Hitting an enemy with two bullets in a row refunds two bullets back in
 *!                            your magazine
 *
 *
 *  **Demolitions Expert**:    Grenades can be thrown twice as far and slowly recharge over time. (If
 *                             possible to implement, add "and show their detonation point")
 *
 *! **Plumpkin Bomb**:         All plumpkins, jack-o-lanterns, and pumpkins you destroy explode. Frag Grenades,
 *!                            smokes, and C4 have a special plumpkin sprite and do additional damage.
 *
 *! **Wraith**:                Emit a trail of thick fog that other players have difficulty seeing through. (Smoke
 *!                            with high but not solid opacity for other players, very low opacity for you)
 *
 *! **Plumpkin Gamble**:       Picks a random perk from the halloween perks.
 *
 *! **Baby Plumpkin Pie**:     Your held weapon randomizes every 20 seconds and after every kill.
 *
 *! **Costumed**:              Become a Pumpkin. (Very rare chance to turn into any Plumpkin variant instead).
 *
 *! **Torn Pockets**:          Every second, drop 2 of a random ammo on the ground. (weighted by amount, the more
 *!                            ammo of a specific type, the more likely to be dropped)
 *
 *  **Claustrophobic**:        Move slower inside buildings and bunkers.
 *
 *  **Laced Stimulants**:      Adrenaline damages instead of healing you. (damage = half the normal healing rate)
 *
 *! **Hexxed**:                All players on the map can see your location.
 *
 *! **Rotten Plumpkin**:       Every ten seconds, force the vomit emote, lose 5% adrenaline, and 5 health.
 *
 *  **Advanced Athletics**:    Move faster in water and smoke, walk through trees, and vault through windows.
 *
 *  **Toploaded**:             Do more damage with the top half of your magazine. (The first 20% of your magazine
 *                             does 25% extra damage, the next 30% does 10% extra damage, the rest is normal)
 *
 *  **Infinite Ammo**:         Works exactly like Surviv
 *
 *  **Field Medic**:           All consumable items can be used faster
 *
 *  **Berserker**:             Move faster with melee weapons equipped and deal more damage with them
 *
 *? **Close Quarters Combat**: Weapons do more damage and reload faster when used at close range. (60 units, 1.2x
 *?                            reload speed and 10% extra damage)
 *
 *  **Low Profile**:           Become smaller and take less damage from explosions.
 *
 *
 * |          Name         | Speed | Max HP | Size | Adren drain | HP regen | Stateful |
 * |_______________________|_______|________|______|_____________|__________|__________|
 * |      Lycanthropy      |   √   |   √    |   √  |             |     √    |          |
 * |      Second Wind      |   √   |        |      |             |          |          |
 * |     Overstimulated    |       |   √    |      |      √      |          |          |
 * |       Fléchettes      |       |        |      |             |          |          |
 * |      Sabot Rounds     |       |        |      |             |          |          |
 * |   Extended Magazines  |       |        |      |             |          |          |
 * |        Engorged       |       |   √    |   √  |             |          |          |
 * |  Precision Recycling  |       |        |      |             |          |    √     |
 * |   Demolitions Expert  |       |        |      |             |          |    √     |
 * |     Plumpkin Bomb     |       |        |      |             |          |          |
 * |        Wraith         |       |        |      |             |          |          |
 * |    Plumpkin Gamble    |       |        |      |             |          |          |
 * |   Baby Plumpkin Pie   |       |        |      |             |          |          |
 * |        Costumed       |       |        |      |             |          |          |
 * |      Torn Pockets     |       |        |      |             |          |          |
 * |     Claustrophobic    |       |        |      |             |          |          |
 * |    Laced Stimulants   |       |        |      |             |          |          |
 * |        Hexxed         |       |        |      |             |          |          |
 * |    Rotten Plumpkin    |       |        |      |             |          |    √     |
 * |   Advanced Athletics  |       |        |      |             |          |          |
 * |       Toploaded       |       |        |      |             |          |          |
 * |     Infinite Ammo     |       |        |      |             |          |          |
 * |      Field Medic      |       |        |      |             |          |          |
 * |       Berserker       |   √   |        |      |             |          |          |
 * | Close Quarters Combat |       |        |      |             |          |          |
 * |      Low Profile      |       |        |   √  |             |          |          |
 */

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
    Werewolf = "werewolf",
    SecondWind = "second_wind",
    Overstimmed = "overstimmed",
    Splinter = "splinter",
    Sabot = "sabot",
    HiCap = "hi_cap",
    Engorged = "engorged",
    Recycling = "recycling",
    DemoExpert = "demo_expert",
    PlumpkinBomb = "plumpkin_bomb",
    Wraith = "wraith",
    PlumpkinGamble = "lets_go_gambling",
    BabyPlumpkinPie = "baby_plumpkin_pie",
    Costumed = "costumed",
    TornPockets = "torn_pockets",
    Claustrophobic = "claustrophobic",
    LacedStimulants = "laced_stimulants",
    Hexxed = "hexxed",
    RottenPlumpkin = "rotten_plumpkin",
    Toploaded = "toploaded",
    AdvancedAthletics = "advanced_athletics",
    InfiniteAmmo = "infinite_ammo",
    FieldMedic = "field_medic",
    Berserker = "stark_melee_gauntlet",
    CloseQuartersCombat = "cqc",
    LowProfile = "low_profile"
}

export const enum PerkCategories {
    Normal,
    Halloween
}

const perks = [
    {
        idString: PerkIds.Werewolf,
        name: "Lycanthropy",
        description: "Become a werewolf with high speed, health, regeneration, and melee damage, but can't use guns & grenades. Ally with other werewolves.",
        categories: [PerkCategories.Halloween],

        speedMod: 1.3,
        healthMod: 2,
        regenRate: 0.5,
        meleeMult: 2
    },
    {
        idString: PerkIds.SecondWind,
        name: "Second Wind",
        description: "Move faster below half health.",
        categories: [PerkCategories.Normal],

        cutoff: 0.5,
        speedMod: 1.4
    },
    {
        idString: PerkIds.Overstimmed,
        name: "Overstimulated",
        description: "Permanent adrenaline, but reduced max health.",
        categories: [PerkCategories.Halloween],

        adrenDecay: 0,
        adrenSet: 1,
        healthMod: 0.8
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
        idString: PerkIds.Engorged,
        name: "Engorged",
        description: "Increased max health and size with each kill.",
        categories: [PerkCategories.Halloween],

        hpMod: 10, // additive
        sizeMod: 1.05, // multiplicative
        killsLimit: 10
    },
    {
        idString: PerkIds.Recycling,
        name: "Precision Recycling",
        description: "Hitting an enemy with two bullets in a row refunds two bullets back in your magazine.",
        categories: [PerkCategories.Normal],

        hitReq: 2,
        accThreshold: 0.5,
        refund: 2,
        margin: 3 // times fireDelay
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
        idString: PerkIds.PlumpkinBomb,
        name: "Plumpkin Bomb",
        description: "All plumpkins/pumpkins explode when destroyed. Throwables have a special appearance and do extra damage.",
        categories: [PerkCategories.Halloween],

        damageMod: 1.2, // for grenades
        plumpkinExplosionDmg: 100
    },
    {
        idString: PerkIds.Wraith,
        name: "Wraith",
        description: "Emit a trail of thick fog that other players have difficulty seeing through.",
        categories: [PerkCategories.Halloween],

        smokeAlpha: 0.7,
        smokeAlphaSelf: 0.1
    },
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
        idString: PerkIds.BabyPlumpkinPie,
        name: "Baby Plumpkin Pie",
        description: "Your held weapon randomizes every 20 seconds and after every kill.",
        categories: [PerkCategories.Halloween],

        [updateInterval]: 20e3 // milliseconds
    },
    {
        idString: PerkIds.Costumed,
        name: "Costumed",
        description: "Become a Pumpkin, or very rarely, a Plumpkin.",
        categories: [PerkCategories.Halloween],

        plumpkinVariantChance: 0.01
    },
    {
        idString: PerkIds.TornPockets,
        name: "Torn Pockets",
        description: "Every second, drop 2 of a random ammo on the ground.",
        categories: [PerkCategories.Halloween],

        [updateInterval]: 1e3,
        dropCount: 2
    },
    {
        idString: PerkIds.Claustrophobic,
        name: "Claustrophobic",
        description: "Move slower inside buildings and bunkers.",
        categories: [PerkCategories.Halloween],

        speedMod: 0.9
    },
    {
        idString: PerkIds.LacedStimulants,
        name: "Laced Stimulants",
        description: "Instead of healing you, adrenaline damages you at half the normal healing rate.",
        categories: [PerkCategories.Halloween],

        healDmgRate: 0.5
    },
    {
        idString: PerkIds.Hexxed,
        name: "Hexxed",
        description: "All players on the map can see your location.",
        categories: [PerkCategories.Halloween]
    },
    {
        idString: PerkIds.RottenPlumpkin,
        name: "Rotten Plumpkin",
        description: "Every 10 seconds, you send the vomit emote and lose 5% adrenaline and 5 health.",
        categories: [PerkCategories.Halloween],

        [updateInterval]: 10e3, // milliseconds
        emote: "vomiting_face",
        adrenLoss: 5, // percentage
        healthLoss: 5 // absolute
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
