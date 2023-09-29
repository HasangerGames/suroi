import { Buildings } from "../definitions/buildings";
import { Emotes } from "../definitions/emotes";
import { Explosions } from "../definitions/explosions";
import { Loots } from "../definitions/loots";
import { Obstacles } from "../definitions/obstacles";
import { type ObjectDefinitions } from "./objectDefinitions";

export const ObjectDefinitionsList: Array<ObjectDefinitions | undefined> = [
    undefined, // players
    Obstacles,
    Explosions,
    undefined, // death markers
    Loots,
    Buildings,
    Emotes
];
