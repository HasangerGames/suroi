import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface DecalDefinition extends ObjectDefinition {
    readonly image?: string
    readonly scale?: number
    readonly zIndex?: number
}

export const Decals = new ObjectDefinitions<DecalDefinition>(
    [
        {
            idString: "explosion_decal",
            name: "Explosion Decal"
        }
    ]
);
