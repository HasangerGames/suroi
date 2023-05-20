import { type ObjectDefinitions } from "./objectDefinitions";
import { Obstacles } from "../definitions/obstacles";
import { Explosions } from "../definitions/explosions";

export const ObjectDefinitionsList: Array<ObjectDefinitions | undefined> = [
    undefined,
    Obstacles,
    Explosions
];
