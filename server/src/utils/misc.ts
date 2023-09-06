import { LootTiers, type WeightedItem } from "../data/lootTables";
import { ObjectType } from "../../../common/src/utils/objectType";
import { ObjectCategory } from "../../../common/src/constants";
import { weightedRandom } from "../../../common/src/utils/random";

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

    interface TempLootItem { item: string, count?: number, isTier: boolean }

    const addLoot = (type: string, count: number): void => {
        if (type === "nothing") return;

        loot.push(new LootItem(type, count));

        const definition = ObjectType.fromString(ObjectCategory.Loot, type).definition;
        if (definition === undefined) {
            throw new Error(`Unknown loot item: ${type}`);
        }

        if ("ammoSpawnAmount" in definition && "ammoType" in definition && definition.ammoSpawnAmount as number > 0) { // TODO Clean this up
            loot.push(new LootItem(definition.ammoType as string, definition.ammoSpawnAmount as number));
        }
    };

    const items: TempLootItem[] = [];
    const weights: number[] = [];
    for (const item of loots) {
        items.push({
            item: "tier" in item ? item.tier : item.item,
            count: "count" in item ? item.count : undefined,
            isTier: "tier" in item
        });
        weights.push(item.weight);
    }
    const selectedItem = weightedRandom<TempLootItem>(items, weights);

    if (selectedItem.isTier) {
        loot = loot.concat(getLootTableLoot(LootTiers[selectedItem.item]));
    } else {
        addLoot(selectedItem.item, selectedItem.count ?? 1);
    }

    return loot;
}

/**
 * Find and remove an element from an array.
 * @param array The array to iterate over.
 * @param value The value to check for.
 */
export function removeFrom<T>(array: T[], value: T): void {
    const index: number = array.indexOf(value);
    if (index !== -1) array.splice(index, 1);
}
