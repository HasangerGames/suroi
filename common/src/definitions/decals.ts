import { RotationMode, ZIndexes } from "../constants";
import { ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";

export interface DecalDefinition extends ObjectDefinition {
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
        rotationMode: RotationMode.Full
    },
    {
        idString: "frag_explosion_decal",
        name: "Frag Explosion Decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "smoke_explosion_decal",
        name: "Smoke Explosion Decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "seed_decal",
        name: "Seed Decal",
        rotationMode: RotationMode.Full
    },
    {
        idString: "seed_explosion_decal",
        name: "Seed Explosion Decal",
        rotationMode: RotationMode.Full
    }
]);
