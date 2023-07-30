import { type ObjectDefinitions } from "./objectDefinitions";
import { Obstacles } from "../definitions/obstacles";
import { Explosions } from "../definitions/explosions";
import { Loots } from "../definitions/loots";
import { Buildings } from "../definitions/buildings";
import { Emotes } from "../definitions/emotes";

export const ObjectDefinitionsList: Array<ObjectDefinitions | undefined> = [
    undefined, // players
    Obstacles,
    Explosions,
    undefined, // death markers
    Loots,
    Buildings,
    Emotes
];
