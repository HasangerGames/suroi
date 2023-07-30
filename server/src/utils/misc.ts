import { v, type Vector } from "../../../common/src/utils/vector";
import { LootTiers, type WeightedItem } from "../data/lootTables";
import { ObjectType } from "../../../common/src/utils/objectType";
import { ObjectCategory } from "../../../common/src/constants";
import { weightedRandom } from "../../../common/src/utils/random";
import { Vec2 } from "planck";
import { type RectangleHitbox } from "../../../common/src/utils/hitbox";
import { Obstacle } from "../objects/obstacle";
import { type Game } from "../game";

export function v2v(v: Vector): Vec2 {
    return Vec2(v.x, v.y);
}

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

export function createDebugMarkersForHitbox(hitbox: RectangleHitbox, game: Game): void {
    const createDebugMarker = (position: Vector): void => {
        game.dynamicObjects.add(new Obstacle(
            game,
            ObjectType.fromString(ObjectCategory.Obstacle, "debug_marker"),
            position,
            0,
            1
        ));
    };
    createDebugMarker(v(hitbox.min.x, hitbox.min.y));
    createDebugMarker(v(hitbox.max.x, hitbox.max.y));
    createDebugMarker(v(hitbox.min.x + hitbox.width, hitbox.min.y));
    createDebugMarker(v(hitbox.min.x, hitbox.min.y + hitbox.height));
    createDebugMarker(v(hitbox.min.x, hitbox.min.y + hitbox.height));
    game.dynamicObjects.add(new Obstacle(
        game,
        ObjectType.fromString(ObjectCategory.Obstacle, "debug_marker"),
        Vec2(hitbox.min.x + hitbox.width / 2, hitbox.min.y + hitbox.height / 2),
        0,
        1
    ));
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
