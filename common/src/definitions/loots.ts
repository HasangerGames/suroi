import { Ammos, type AmmoDefinition } from "./items/ammos";
import { Armors, type ArmorDefinition } from "./items/armors";
import { Backpacks, type BackpackDefinition } from "./items/backpacks";
import { Guns, type GunDefinition } from "./items/guns";
import { HealingItems, type HealingItemDefinition } from "./items/healingItems";
import { Melees, type MeleeDefinition } from "./items/melees";
import { ObjectDefinitions, type ItemType } from "../utils/objectDefinitions";
import { Perks, type PerkDefinition } from "./items/perks";
import { Scopes, type ScopeDefinition } from "./items/scopes";
import { Skins, type SkinDefinition } from "./items/skins";
import { Throwables, type ThrowableDefinition } from "./items/throwables";

export type LootDefinition =
    | GunDefinition
    | AmmoDefinition
    | MeleeDefinition
    | HealingItemDefinition
    | ArmorDefinition
    | BackpackDefinition
    | ScopeDefinition
    | SkinDefinition
    | ThrowableDefinition
    | PerkDefinition;

export type WeaponDefinition =
    | GunDefinition
    | MeleeDefinition
    | ThrowableDefinition;

export type TypedLootDefinition<Type extends ItemType> = LootDefinition & { readonly itemType: Type };

export type LootDefForType<K extends ItemType> = {
    [ItemType.Gun]: GunDefinition
    [ItemType.Ammo]: AmmoDefinition
    [ItemType.Melee]: MeleeDefinition
    [ItemType.Throwable]: ThrowableDefinition
    [ItemType.Healing]: HealingItemDefinition
    [ItemType.Armor]: ArmorDefinition
    [ItemType.Backpack]: BackpackDefinition
    [ItemType.Scope]: ScopeDefinition
    [ItemType.Skin]: SkinDefinition
    [ItemType.Perk]: PerkDefinition
}[K];

export const Loots = new ObjectDefinitions<LootDefinition>([
    ...Guns,
    ...Ammos,
    ...Melees,
    ...Throwables,
    ...HealingItems,
    ...Armors,
    ...Backpacks,
    ...Scopes,
    ...Skins,
    ...Perks
]);
