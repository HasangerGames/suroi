import { RotationMode, ZIndexes } from "../constants";
import { DefinitionType, ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";

export interface DecalDefinition extends ObjectDefinition {
    readonly defType: DefinitionType.Decal
    readonly image?: string
    /**
     * @default {1}
     */
    readonly scale?: number
    readonly rotationMode: RotationMode
    readonly zIndex?: ZIndexes
}

export const Decals = new ObjectDefinitions<DecalDefinition>([
    {
        idString: "explosion_decal",
        name: "Explosion Decal",
        defType: DefinitionType.Decal,
        rotationMode: RotationMode.Full
    },
    {
        idString: "frag_explosion_decal",
        name: "Frag Explosion Decal",
        defType: DefinitionType.Decal,
        rotationMode: RotationMode.Full
    },
    {
        idString: "smoke_explosion_decal",
        name: "Smoke Explosion Decal",
        defType: DefinitionType.Decal,
        rotationMode: RotationMode.Full
    },
    {
        idString: "seed_decal",
        name: "Seed Decal",
        defType: DefinitionType.Decal,
        rotationMode: RotationMode.Full
    },
    {
        idString: "seed_explosion_decal",
        name: "Seed Explosion Decal",
        defType: DefinitionType.Decal,
        rotationMode: RotationMode.Full
    }
]);
