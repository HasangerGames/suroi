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
    interface TempLootItem {
        readonly item: string
        readonly count?: number
        readonly isTier: boolean
    }

    const selectedItem = weightedRandom<TempLootItem>(
        loots.map(
            loot => "tier" in loot
                ? {
                    item: loot.tier,
                    isTier: true
                } satisfies TempLootItem
                : {
                    item: loot.item,
                    count: loot.count,
                    isTier: false
                } satisfies TempLootItem
        ),
        loots.map(l => l.weight)
    );

    if (selectedItem.isTier) {
        return getLootTableLoot(LootTiers[selectedItem.item]);
    }

    const type = selectedItem.item;

    if (type === "nothing") return [];

    const count = selectedItem.count ?? 1;
    const loot = [new LootItem(type, count)];

    const definition = Loots.getByIDString(type);
    if (definition === undefined) {
        throw new Error(`Unknown loot item: ${type}`);
    }

    if ("ammoSpawnAmount" in definition && "ammoType" in definition) {
        loot.push(new LootItem(definition.ammoType, definition.ammoSpawnAmount));
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
