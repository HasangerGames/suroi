import { ObjectCategory } from "../../../common/src/constants";
import { type LootDefinition } from "../../../common/src/definitions/loots";
import { ObjectType } from "../../../common/src/utils/objectType";
import { weightedRandom } from "../../../common/src/utils/random";
import { LootTiers, type WeightedItem } from "../data/lootTables";

export class LootItem {
    idString: string;
    count: number;
    constructor(idString: string, count: number) {
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

        const definition = ObjectType.fromString<ObjectCategory.Loot, LootDefinition>(ObjectCategory.Loot, type).definition;
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
