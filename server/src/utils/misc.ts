import {
    type Body,
    Box,
    Circle,
    Vec2,
    type World
} from "planck";

import { type Obstacle } from "../objects/obstacle";

import { CircleHitbox, type Hitbox, RectangleHitbox, ComplexHitbox } from "../../../common/src/utils/hitbox";
import { type Vector } from "../../../common/src/utils/vector";
import { type WeightedItem, LootTiers } from "../data/lootTables";
import { ObjectType } from "../../../common/src/utils/objectType";
import { ObjectCategory } from "../../../common/src/constants";
import { weightedRandom } from "../../../common/src/utils/random";

export function v2v(v: Vector): Vec2 {
    return Vec2(v.x, v.y);
}

export function bodyFromHitbox(world: World,
    hitbox: Hitbox,
    scale = 1,
    noCollisions = false,
    obstacle: Obstacle
): Body | undefined {
    const body = world.createBody({
        type: "static",
        fixedRotation: true
    });

    const createFixture = (hitbox: Hitbox): void => {
        if (hitbox instanceof CircleHitbox) {
            body.createFixture({
                shape: Circle(hitbox.radius * scale),
                userData: obstacle,
                isSensor: noCollisions
            });
        } else if (hitbox instanceof RectangleHitbox) {
            const width = hitbox.width / 2;
            const height = hitbox.height / 2;

            if (width === 0 || height === 0) return undefined;

            body.createFixture({
                shape: Box(width, height),
                userData: obstacle,
                isSensor: noCollisions
            });
        }
    };

    if (hitbox instanceof CircleHitbox) {
        body.setPosition(Vec2(hitbox.position));
        createFixture(hitbox);
    } else if (hitbox instanceof RectangleHitbox) {
        const width = hitbox.width / 2;
        const height = hitbox.height / 2;

        if (width === 0 || height === 0) return undefined;

        // obstacle.collision.halfWidth = width;
        // obstacle.collision.halfHeight = height;

        body.setPosition(Vec2(hitbox.min.x + width, hitbox.min.y + height));
        createFixture(hitbox);
    } else if (hitbox instanceof ComplexHitbox) {
        for (const hitBox of hitbox.hitBoxes) {
            if (hitBox instanceof CircleHitbox) {
                 body.setPosition(Vec2(hitBox.position));
                 createFixture(hitBox);
            } else if (hitBox instanceof RectangleHitbox) {
                 const width = hitBox.width / 2;
                 const height = hitBox.height / 2;

                 if (width === 0 || height === 0) return undefined;

                 // obstacle.collision.halfWidth = width;
                // obstacle.collision.halfHeight = height;

                 body.setPosition(Vec2(hitBox.min.x + width, hitBox.min.y + height));
                 createFixture(hitBox);
            }
        }
    }
    return body;
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
