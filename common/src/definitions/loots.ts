import { ObjectDefinitions } from "../utils/objectDefinitions";
import { type MeleeDefinition, Melees } from "./melees";
import { type GunDefinition, Guns } from "./guns";
import { type HealingItemDefinition, HealingItems } from "./healingItems";
import { type AmmoDefinition, Ammos } from "./ammos";
import { type ArmorDefinition, Armors } from "./armors";
import { type ScopeDefinition, Scopes } from "./scopes";
import { type BackpackDefinition, Backpacks } from "./backpacks";

export type LootDefinition = GunDefinition | AmmoDefinition | MeleeDefinition | HealingItemDefinition | ArmorDefinition | BackpackDefinition | ScopeDefinition;

export const Loots = new ObjectDefinitions<LootDefinition>(
    Array.prototype.concat(Guns, Ammos, Melees, HealingItems, Armors, Backpacks, Scopes)
);
