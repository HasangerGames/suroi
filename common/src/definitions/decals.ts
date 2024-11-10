import { ZIndexes } from "../constants";
import { ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";
import { RotationMode } from "./obstacles";

export interface DecalDefinition extends ObjectDefinition {
    readonly image: string
    readonly scale: number
    /**
     * @default {RotationMode.Limited}
     */
    readonly rotationMode: RotationMode
    readonly zIndex?: ZIndexes
}

export const Decals = ObjectDefinitions.withDefault<DecalDefinition>()(
    "Decals",
    {
        scale: 1,
        rotationMode: RotationMode.Limited
    },
    () => [
        {
            name: "Explosion Decal",
            rotationMode: RotationMode.Full
        },
        {
            name: "Frag Explosion Decal",
            rotationMode: RotationMode.Full
        },
        {
            name: "Smoke Explosion Decal",
            rotationMode: RotationMode.Full
        }
    ].map(def => {
        const idString = def.name.toLowerCase().replace(/ /g, "_");

        return {
            idString,
            image: idString,
            ...def
        };
    })
);
