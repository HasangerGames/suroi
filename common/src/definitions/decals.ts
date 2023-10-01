import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface DecalDefinition extends ObjectDefinition {
    image?: string
    scale?: number
    zIndex?: number
}

export const Decals = new ObjectDefinitions<DecalDefinition>(
    [
        {
            idString: "explosion_decal",
            name: "Explosion Decal"
        }
    ]);
