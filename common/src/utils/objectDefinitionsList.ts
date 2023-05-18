import { Obstacles } from "../definitions/obstacles";
import { Explosions } from "../definitions/explosions";
import { type ObjectDefinitions } from "./objectDefinitions";

export const ObjectDefinitionsList: Array<ObjectDefinitions | undefined> = [
    undefined,
    Obstacles,
    Explosions
];
