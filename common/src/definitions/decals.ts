import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { RotationMode } from "./obstacles";

export interface DecalDefinition extends ObjectDefinition {
    readonly image?: string
    readonly scale?: number
    readonly rotationMode?: RotationMode
    readonly zIndex?: number
}

export const Decals = new ObjectDefinitions<DecalDefinition>(
    [
        {
            idString: "explosion_decal",
            name: "Explosion Decal"
        },
        {
            idString: "floor_oil_01",
            name: "Floor Oil 1",
            rotationMode: RotationMode.Limited
        },
        {
            idString: "floor_oil_02",
            name: "Floor Oil 2",
            rotationMode: RotationMode.Limited
        },
        {
            idString: "floor_oil_03",
            name: "Floor Oil 3",
            rotationMode: RotationMode.Limited
        },
        {
            idString: "floor_oil_04",
            name: "Floor Oil 4",
            rotationMode: RotationMode.Limited
        },
        {
            idString: "floor_oil_05",
            name: "Floor Oil 5",
            rotationMode: RotationMode.Limited
        },
        {
            idString: "floor_oil_06",
            name: "Floor Oil 6",
            rotationMode: RotationMode.Limited
        },
        {
            idString: "floor_oil_07",
            name: "Floor Oil 7",
            rotationMode: RotationMode.Limited
        },
        {
            idString: "container_mark",
            name: "Container mark",
            rotationMode: RotationMode.Limited
        }
    ]
);
