import z from "zod";
import { type DefinitionType, ObjectDefinitions } from "../utils/objectDefinitions";
import { type AmmoDefinition, Ammos } from "./items/ammos";
import { type ArmorDefinition, Armors } from "./items/armors";
import { type BackpackDefinition, Backpacks } from "./items/backpacks";
import { type GunDefinition, Guns } from "./items/guns";
import { type HealingItemDefinition, HealingItems } from "./items/healingItems";
import { type MeleeDefinition, Melees } from "./items/melees";
import { type PerkDefinition, Perks } from "./items/perks";
import { type ScopeDefinition, Scopes } from "./items/scopes";
import { type SkinDefinition, Skins } from "./items/skins";
import { type ThrowableDefinition, Throwables } from "./items/throwables";

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

export type TypedLootDefinition<Type extends DefinitionType> = LootDefinition & { readonly defType: Type };

export const ItemType = z.enum([
    "gun",
    "ammo",
    "melee",
    "throwable",
    "healingItem",
    "armor",
    "backpack",
    "scope",
    "skin",
    "perk",
]);
export type ItemType = z.infer<typeof ItemType>;

export const WeaponType = z.enum(["gun", "melee", "throwable"]);
export type WeaponType = z.infer<typeof WeaponType>;

export type LootDefForType<K extends ItemType> = {
    gun: GunDefinition;
    ammo: AmmoDefinition;
    melee: MeleeDefinition;
    throwable: ThrowableDefinition;
    healingItem: HealingItemDefinition;
    armor: ArmorDefinition;
    backpack: BackpackDefinition;
    scope: ScopeDefinition;
    skin: SkinDefinition;
    perk: PerkDefinition;
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
