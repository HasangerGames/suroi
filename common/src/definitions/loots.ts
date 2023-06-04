import { ObjectDefinitions } from "../utils/objectDefinitions";
import { type MeleeDefinition, Melees } from "./melees";
import { type GunDefinition, Guns } from "./guns";

export type LootDefinition = MeleeDefinition | GunDefinition;

export const Loots = new ObjectDefinitions<LootDefinition>(
    3,
    Array.prototype.concat(Melees, Guns)
);
