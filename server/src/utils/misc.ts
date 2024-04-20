import { Loots, type LootDefinition } from "../../../common/src/definitions/loots";
import { ColorStyles, styleText } from "../../../common/src/utils/ansiColoring";
import { type ObjectDefinition, type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { weightedRandom } from "../../../common/src/utils/random";
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

export class LootItem {
    constructor(
        public readonly idString: ReferenceTo<LootDefinition>,
        public readonly count: number
    ) {}
}

export function getLootTableLoot(loots: WeightedItem[]): LootItem[] {
    let loot: LootItem[] = [];

    const items: Array<WeightedItem[] | WeightedItem> = [];
    const weights: number[] = [];
    for (const item of loots) {
        items.push(
            item.spawnSeparately && (item.count ?? 1) > 1
                ? new Array<WeightedItem>(item.count!).fill(item)
                : item
        );
        weights.push(item.weight);
    }

    const selectedItem = weightedRandom<WeightedItem | WeightedItem[]>(items, weights);

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
            const ammoSpawnAmount = definition.ammoSpawnAmount;
            if (ammoSpawnAmount > 1) {
                loot.push(
                    new LootItem(definition.ammoType, Math.floor(ammoSpawnAmount / 2)),
                    new LootItem(definition.ammoType, Math.ceil(ammoSpawnAmount / 2))
                );
            } else {
                loot.push(new LootItem(definition.ammoType, ammoSpawnAmount));
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
