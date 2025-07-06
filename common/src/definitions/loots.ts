import { Ammos, type AmmoDefinition } from "./items/ammos";
import { Armors, type ArmorDefinition } from "./items/armors";
import { Backpacks, type BackpackDefinition } from "./items/backpacks";
import { Guns, type GunDefinition } from "./items/guns";
import { HealingItems, type HealingItemDefinition } from "./items/healingItems";
import { Melees, type MeleeDefinition } from "./items/melees";
import { ObjectDefinitions, type DefinitionType } from "../utils/objectDefinitions";
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

export type WeaponTypes = WeaponDefinition["defType"];

export type TypedLootDefinition<Type extends DefinitionType> = LootDefinition & { readonly defType: Type };

export type ItemType =
    | DefinitionType.Gun
    | DefinitionType.Ammo
    | DefinitionType.Melee
    | DefinitionType.Throwable
    | DefinitionType.HealingItem
    | DefinitionType.Armor
    | DefinitionType.Backpack
    | DefinitionType.Scope
    | DefinitionType.Skin
    | DefinitionType.Perk;

export type LootDefForType<K extends ItemType> = {
    [DefinitionType.Gun]: GunDefinition
    [DefinitionType.Ammo]: AmmoDefinition
    [DefinitionType.Melee]: MeleeDefinition
    [DefinitionType.Throwable]: ThrowableDefinition
    [DefinitionType.HealingItem]: HealingItemDefinition
    [DefinitionType.Armor]: ArmorDefinition
    [DefinitionType.Backpack]: BackpackDefinition
    [DefinitionType.Scope]: ScopeDefinition
    [DefinitionType.Skin]: SkinDefinition
    [DefinitionType.Perk]: PerkDefinition
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
