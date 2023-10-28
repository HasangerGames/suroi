import { ObjectDefinitions } from "../utils/objectDefinitions";
import { type AmmoDefinition, Ammos } from "./ammos";
import { type ArmorDefinition, Armors } from "./armors";
import { type BackpackDefinition, Backpacks } from "./backpacks";
import { type GunDefinition, Guns } from "./guns";
import { type HealingItemDefinition, HealingItems } from "./healingItems";
import { type MeleeDefinition, Melees } from "./melees";
import { type ScopeDefinition, Scopes } from "./scopes";
import { type SkinDefinition, Skins } from "./skins";

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
