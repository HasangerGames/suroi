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

export const Decals = ObjectDefinitions.create<DecalDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            scale: 1,
            rotationMode: RotationMode.Limited
        }),
        decal_factory: (name: string) => {
            const idString = name.toLowerCase().replace(/ /g, "_");
            return {
                idString,
                name,
                image: idString
            };
        }
    })
)(
    ({ apply }) => [
        apply(
            "decal_factory",
            { rotationMode: RotationMode.Full },
            "Explosion Decal"
        ),
        apply(
            "decal_factory",
            { rotationMode: RotationMode.Full },
            "Frag Explosion Decal"
        ),
        apply(
            "decal_factory",
            { rotationMode: RotationMode.Full },
            "Smoke Explosion Decal"
        )
    ]
);
