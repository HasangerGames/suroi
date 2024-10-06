import { type DeepPartial } from "../utils/misc";
import { ItemType, ObjectDefinitions, type GetMissing, type ItemDefinition, type RawDefinition, type ReferenceTo } from "../utils/objectDefinitions";

export interface BasicPerk extends ItemDefinition {
    readonly itemType: ItemType.Perk
    readonly giveByDefault: boolean
}

const defaultTemplate = {
    itemType: ItemType.Perk as const,
    noDrop: false,
    giveByDefault: false
} satisfies DeepPartial<BasicPerk>;

/**
 *? **Lycanthropy**:         Transforms you into a werewolf with high speed, health, regeneration,
 *                           and melee damage, but become unable to use guns and grenades. Become
 *                           allies with other werewolves.
 *
 *  **Second Wind**:         Move faster below 50% health.
 *
 *  **Overstimulated**:      Gain permanent adrenaline, but have reduced max health.
 *
 *  **Fléchettes**:          All bullets splinter into 3 weaker versions.
 *
 *  **Sabot Rounds**:        Large velocity and range increase, but 20% lower damage
 *
 *  **Extended Magazines**:  Most weapons have larger mag sizes.
 *
 *  **Engorged**:            Gain max health and size with each kill.
 *
 *! **Precision Recycling**: Hitting an enemy with two bullets in a row refunds two bullets back in
 *                           your magazine
 *
 *! **Demolitions Expert**:  Grenades can be thrown twice as far, and show their detonation point.
 *
 *
 * |         Name        | Speed | Max HP | Size | Adren drain | HP regen |
 * |_____________________|_______|________|______|_____________|__________|
 * |     Lycanthropy     |   √   |   √    |   √  |             |     √    |
 * |     Second Wind     |   √   |        |      |             |          |
 * |    Overstimulated   |       |   √    |      |      √      |          |
 * |      Fléchettes     |       |        |      |             |          |
 * |     Sabot Rounds    |       |        |      |             |          |
 * |  Extended Magazines |       |        |      |             |          |
 * |       Engorged      |       |   √    |   √  |             |          |
 * | Precision Recycling |       |        |      |             |          |
 * |  Demolitions Expert |       |        |      |             |          |
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
    DemoExport = "demo_expert"
}

const perks = [
    {
        idString: PerkIds.Werewolf,
        name: "Lycanthropy",

        speedMod: 1.3,
        healthMod: 2,
        regenRate: 0.5,
        meleeMult: 2
    },
    {
        idString: PerkIds.SecondWind,
        name: "Second Wind",

        cutoff: 0.5,
        speedMod: 1.2
    },
    {
        idString: PerkIds.Overstimmed,
        name: "Overstimulated",

        adrenDecay: 0,
        adrenSet: 1,
        healthMod: 0.8
    },
    {
        idString: PerkIds.Splinter,
        name: "Fléchettes",

        split: 3,
        damageMod: 0.4,
        tracerWidthMod: 0.5
    },
    {
        idString: PerkIds.Sabot,
        name: "Sabot Rounds",

        rangeMod: 1.5,
        speedMod: 1.5,
        spreadMod: 0.6,
        damageMod: 0.8,
        tracerWidthMod: 1.5,
        tracerLengthMod: 1.2
    },
    {
        idString: PerkIds.HiCap,
        name: "Extended Magazines"

        // probably define for each weapon individually
    },
    {
        idString: PerkIds.Engorged,
        name: "Engorged",

        hpMod: 10, // additive
        sizeMod: 1.05 // multiplicative
    },
    {
        idString: PerkIds.Recycling,
        name: "Precision Recycling",

        hitReq: 2,
        accThreshold: 0.5,
        refund: 2,
        margin: 3 // times fireDelay
    },
    {
        idString: PerkIds.DemoExport,
        name: "Demolitions Expert",

        rangeMod: 2
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
