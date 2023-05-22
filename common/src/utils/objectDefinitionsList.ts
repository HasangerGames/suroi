import { type ObjectDefinitions } from "./objectDefinitions";
import { Obstacles } from "../definitions/obstacles";
import { Explosions } from "../definitions/explosions";
import { Melees } from "../definitions/melees";

export const ObjectDefinitionsList: Array<ObjectDefinitions | undefined> = [
    undefined, // players
    Obstacles,
    Explosions,
    undefined, // death markers
    Melees
];
