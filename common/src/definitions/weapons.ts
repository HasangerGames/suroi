import { KillDamageSources } from "../packets/killPacket";
import { ObjectDefinitions } from "../utils/objectDefinitions";
import { Explosions } from "./explosions";
import { Guns } from "./items/guns";
import { Melees } from "./items/melees";
import { Throwables } from "./items/throwables";

// TODO remove me when refactoring killfeed stuff
export const Weapons = new ObjectDefinitions<KillDamageSources>([
    ...Guns,
    ...Melees,
    ...Throwables,
    ...Explosions
]);
