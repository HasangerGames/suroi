import { ObjectDefinitions } from "../utils/objectDefinitions";
import { MeleeDefinition, Melees } from "./melees";
import { GunDefinition, Guns } from "./guns";

export type LootDefinition = MeleeDefinition | GunDefinition;

export const Loots = new ObjectDefinitions<LootDefinition>(
    2,
    Array.prototype.concat(Melees, Guns),
);
