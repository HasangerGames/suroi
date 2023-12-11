import { ObjectDefinitions } from "../utils/objectDefinitions.js";
import { type AmmoDefinition, Ammos } from "./ammos.js";
import { type ArmorDefinition, Armors } from "./armors.js";
import { type BackpackDefinition, Backpacks } from "./backpacks.js";
import { type GunDefinition, Guns } from "./guns.js";
import { type HealingItemDefinition, HealingItems } from "./healingItems.js";
import { type MeleeDefinition, Melees } from "./melees.js";
import { type ScopeDefinition, Scopes } from "./scopes.js";
import { type SkinDefinition, Skins } from "./skins.js";

export type LootDefinition = GunDefinition | AmmoDefinition | MeleeDefinition | HealingItemDefinition | ArmorDefinition | BackpackDefinition | ScopeDefinition | SkinDefinition;
export type WeaponDefinition = GunDefinition | MeleeDefinition;

export const Loots = new ObjectDefinitions<LootDefinition>(
    [
        ...Guns,
        ...Ammos,
        ...Melees,
        ...HealingItems,
        ...Armors,
        ...Backpacks,
        ...Scopes,
        ...Skins
    ]
);
