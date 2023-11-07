import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { RotationMode } from "./obstacles";
import { ZIndexes } from "../constants";

export interface DecalDefinition extends ObjectDefinition {
    readonly image?: string
    readonly scale?: number
    readonly rotationMode?: RotationMode // default is Limited
    readonly zIndex?: number
}

export const Decals = new ObjectDefinitions<DecalDefinition>(
    [
        {
            idString: "explosion_decal",
            name: "Explosion Decal",
            rotationMode: RotationMode.Full
        },
        {
            idString: "floor_oil_01",
            name: "Floor Oil 1"
        },
        {
            idString: "floor_oil_02",
            name: "Floor Oil 2"
        },
        {
            idString: "floor_oil_03",
            name: "Floor Oil 3"
        },
        {
            idString: "floor_oil_04",
            name: "Floor Oil 4"
        },
        {
            idString: "floor_oil_05",
            name: "Floor Oil 5"
        },
        {
            idString: "floor_oil_06",
            name: "Floor Oil 6"
        },
        {
            idString: "floor_oil_07",
            name: "Floor Oil 7"
        },
        {
            idString: "container_mark",
            name: "Container mark",
            zIndex: ZIndexes.Ground
        }
    ]
);
