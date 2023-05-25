import { type ObjectDefinitions } from "./objectDefinitions";
import { Obstacles } from "../definitions/obstacles";
import { Explosions } from "../definitions/explosions";
import { Loots } from "../definitions/loots";
import { Bullets } from "../definitions/bullets";

export const ObjectDefinitionsList: Array<ObjectDefinitions | undefined> = [
    undefined, // players
    Obstacles,
    Bullets,
    Explosions,
    undefined, // death markers
    Loots
];
