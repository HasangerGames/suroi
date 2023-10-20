import { Loots, type LootDefinition } from "../../../common/src/definitions/loots";
import { type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { weightedRandom } from "../../../common/src/utils/random";
import { LootTiers, type WeightedItem } from "../data/lootTables";

export class LootItem {
    readonly idString: ReferenceTo<LootDefinition>;
    readonly count: number;

    constructor(idString: ReferenceTo<LootDefinition>, count: number) {
        this.idString = idString;
        this.count = count;
    }
}

export function getLootTableLoot(loots: WeightedItem[]): LootItem[] {
    let loot: LootItem[] = [];

    const items: WeightedItem[] = [];
    const weights: number[] = [];
    for (const item of loots) {
        for (let i = 0; i < (item?.separate ? (item?.count ?? 1) : 1); i++) {
            items.push(item);
            weights.push(item.weight);
        }
    }

    const selectedItem = weightedRandom<WeightedItem>(items, weights);

    if ("tier" in selectedItem) {
        loot = loot.concat(getLootTableLoot(LootTiers[selectedItem.tier]));
    } else {
        const type = selectedItem.item;

        if (type === "nothing") return loot;

        loot.push(new LootItem(type, selectedItem.count ?? 1));

        const definition = Loots.getByIDString(type);
        if (definition === undefined) {
            throw new Error(`Unknown loot item: ${type}`);
        }

        if ("ammoSpawnAmount" in definition && "ammoType" in definition) {
            loot.push(new LootItem(definition.ammoType, definition.ammoSpawnAmount));
        }
    }

    return loot;
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
