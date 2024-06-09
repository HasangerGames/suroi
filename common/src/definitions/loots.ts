import { ObjectDefinitions, type ItemType, type RawDefinition } from "../utils/objectDefinitions";
import { Ammos, type AmmoDefinition } from "./ammos";
import { Armors, type ArmorDefinition } from "./armors";
import { Backpacks, type BackpackDefinition } from "./backpacks";
import { Guns, type GunDefinition } from "./guns";
import { HealingItems, type HealingItemDefinition } from "./healingItems";
import { Melees, type MeleeDefinition } from "./melees";
import { Scopes, type ScopeDefinition } from "./scopes";
import { Skins, type SkinDefinition } from "./skins";
import { Throwables, type ThrowableDefinition } from "./throwables";

export type LootDefinition =
    GunDefinition |
    AmmoDefinition |
    MeleeDefinition |
    HealingItemDefinition |
    ArmorDefinition |
    BackpackDefinition |
    ScopeDefinition |
    SkinDefinition |
    ThrowableDefinition;

export type WeaponDefinition =
    GunDefinition |
    MeleeDefinition |
    ThrowableDefinition;

export type TypedLootDefinition<Type extends ItemType> = LootDefinition & { readonly itemType: Type };

/**
 * Specialized subclass of {@linkcode ObjectDefinitions} that provides facilities for getting
 * a set of definitions according to their item type
 */
export class LootDefinitions extends ObjectDefinitions<LootDefinition> {
    private readonly _byTypeMapping: {
        [K in ItemType]?: ReadonlyArray<TypedLootDefinition<K>>
    };

    constructor(definitions: ReadonlyArray<RawDefinition<LootDefinition>>) {
        super(undefined, definitions);

        this._byTypeMapping = {};
        for (const def of this.definitions) {
            (
                (this._byTypeMapping[def.itemType] ??= []) as Array<TypedLootDefinition<typeof def.itemType>>
            ).push(def);
        }
    }

    /**
     * Returns all item definitions with the given item type
     * @param itemType The item type to filter by
     * @returns All definitions whose `itemType` property match the given one
     */
    byType<Type extends ItemType>(itemType: Type): ReadonlyArray<TypedLootDefinition<Type>> {
        return [...(this._byTypeMapping[itemType] ?? [])];
    }
}

export const Loots = new LootDefinitions(
    [
        ...Guns,
        ...Ammos,
        ...Melees,
        ...Throwables,
        ...HealingItems,
        ...Armors,
        ...Backpacks,
        ...Scopes,
        ...Skins
    ]
);
