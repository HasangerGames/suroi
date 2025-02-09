import { KillDamageSources } from "../packets/killFeedPacket";
import { ObjectDefinitions } from "../utils/objectDefinitions";
import { Explosions } from "./explosions";
import { Guns } from "./items/guns";
import { Melees } from "./items/melees";
import { Throwables } from "./items/throwables";

// TODO remove me when refactoring killfeed stuff
export const Weapons = new ObjectDefinitions<KillDamageSources>([
    ...Guns.definitions,
    ...Melees.definitions,
    ...Throwables.definitions,
    ...Explosions.definitions
]);
