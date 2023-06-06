import { ObjectDefinitions } from "../utils/objectDefinitions";
import { type MeleeDefinition, Melees } from "./melees";
import { type GunDefinition, Guns } from "./guns";
import { type HealingItemDefinition, HealingItems } from "./healingItems";

export type LootDefinition = MeleeDefinition | GunDefinition | HealingItemDefinition;

export const Loots = new ObjectDefinitions<LootDefinition>(
    3,
    Array.prototype.concat(Melees, Guns, HealingItems)
);
