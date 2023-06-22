import { ObjectDefinitions } from "../utils/objectDefinitions";
import { type MeleeDefinition, Melees } from "./melees";
import { type GunDefinition, Guns } from "./guns";
import { type HealingItemDefinition, HealingItems } from "./healingItems";
import { type AmmoDefinition, Ammos } from "./ammos";

export type LootDefinition = GunDefinition | AmmoDefinition | MeleeDefinition | HealingItemDefinition;

export const Loots = new ObjectDefinitions<LootDefinition>(
    Array.prototype.concat(Guns, Ammos, Melees, HealingItems)
);
