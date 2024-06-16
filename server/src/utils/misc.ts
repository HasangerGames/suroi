import { Loots, type LootDefinition } from "../../../common/src/definitions/loots";
import { ColorStyles, styleText } from "../../../common/src/utils/ansiColoring";
import { type ObjectDefinition, type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { weightedRandom } from "../../../common/src/utils/random";
import { Config } from "../config";
import { LootTiers, type WeightedItem } from "../data/lootTables";

export const Logger = {
    log(...message: string[]): void {
        internalLog(message.join(" "));
    },
    warn(...message: string[]): void {
        internalLog(styleText("[WARNING]", ColorStyles.foreground.yellow.normal), message.join(" "));
    }
};

function internalLog(...message: string[]): void {
    const date = new Date();

    console.log(
        styleText(`[${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString("en-US")}]`, ColorStyles.foreground.green.bright),
        message.join(" ")
    );
}

export const dragConst = (aggressiveness: number, base?: number): number => Math.pow(
    base ?? Math.E,
    -(aggressiveness + 1 / (1.78734 * Config.tps ** 2.32999)) / Config.tps
);

export class LootItem {
    constructor(
        public readonly idString: ReferenceTo<LootDefinition>,
        public readonly count: number
    ) {}
}

export function getLootTableLoot(loots: readonly WeightedItem[]): LootItem[] {
    let loot: LootItem[] = [];

    const items: Array<readonly WeightedItem[] | WeightedItem> = [];
    const weights: number[] = [];
    for (const item of loots) {
        items.push(
            item.spawnSeparately && (item.count ?? 1) > 1
                // a null-ish value would fail the conditional this branch is contingent on
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ? new Array<WeightedItem>(item.count!).fill(item)
                : item
        );
        weights.push(item.weight);
    }

    const selectedItem = weightedRandom<WeightedItem | readonly WeightedItem[]>(items, weights);

    for (const selection of [selectedItem].flat()) {
        if ("tier" in selection) {
            loot = loot.concat(getLootTableLoot(LootTiers[selection.tier]));
            continue;
        }

        const item = selection.item;
        if (item === null) continue;
        loot.push(new LootItem(item, selection.spawnSeparately ? 1 : (selection.count ?? 1)));

        const definition = Loots.fromStringSafe(item);
        if (definition === undefined) {
            throw new ReferenceError(`Unknown loot item: ${item}`);
        }

        if ("ammoType" in definition && definition.ammoSpawnAmount) {
            const { ammoType, ammoSpawnAmount } = definition;

            if (ammoSpawnAmount > 1) {
                const halfAmount = ammoSpawnAmount / 2;
                loot.push(
                    new LootItem(ammoType, Math.floor(halfAmount)),
                    new LootItem(ammoType, Math.ceil(halfAmount))
                );
            } else {
                loot.push(new LootItem(ammoType, ammoSpawnAmount));
            }
        }
    }

    return loot;
}

export function getRandomIDString<T extends ObjectDefinition>(table: Record<ReferenceTo<T>, number> | ReferenceTo<T>): ReferenceTo<T> {
    if (typeof table === "string") return table;

    const items: string[] = [];
    const weights: number[] = [];
    for (const item in table) {
        items.push(item);
        weights.push(table[item as ReferenceTo<T>]);
    }
    return weightedRandom(items, weights);
}

/**
 * Find and remove an element from an array.
 * @param array The array to iterate over.
 * @param value The value to check for.
 */
export function removeFrom<T>(array: T[], value: T): void {
    const index = array.indexOf(value);
    if (index !== -1) array.splice(index, 1);
}

export const CARDINAL_DIRECTIONS = Array.from({ length: 4 }, (_, i) => i / 2 * Math.PI);
