import { ObjectCategory } from "../constants";
import { Buildings, type BuildingDefinition } from "../definitions/buildings";
import { Obstacles, RotationMode, type ObstacleDefinition } from "../definitions/obstacles";
import { type Variation } from "../typings";
import { type Vector } from "../utils/vector";
import { createPacket } from "./packet";

export type MapObject = {
    readonly position: Vector
    readonly rotation: number
    readonly scale?: number
    readonly variation?: Variation
} & ({
    readonly type: ObjectCategory.Obstacle
    readonly definition: ObstacleDefinition
} | {
    readonly type: ObjectCategory.Building
    readonly definition: BuildingDefinition
});

export type MapPacketData = {
    readonly seed: number
    readonly width: number
    readonly height: number
    readonly oceanSize: number
    readonly beachSize: number

    readonly rivers: ReadonlyArray<{ readonly width: number, readonly points: readonly Vector[] }>
    readonly objects: readonly MapObject[]
    readonly places: ReadonlyArray<{ readonly position: Vector, readonly name: string }>
};

export const MapPacket = createPacket("MapPacket")<MapPacketData>({
    serialize(stream, data) {
        stream.writeUint32(data.seed);
        stream.writeUint16(data.width);
        stream.writeUint16(data.height);
        stream.writeUint16(data.oceanSize);
        stream.writeUint16(data.beachSize);

        stream.writeArray(data.rivers, 4, river => {
            stream.writeUint8(river.width);
            stream.writeArray(river.points, 8, point => {
                stream.writePosition(point);
            });
        });

        stream.writeArray(data.objects, 16, object => {
            stream.writeObjectType(object.type);
            stream.writePosition(object.position);

            switch (object.type) {
                case ObjectCategory.Obstacle: {
                    Obstacles.writeToStream(stream, object.definition);
                    stream.writeObstacleRotation(object.rotation, object.definition.rotationMode);
                    if (object.definition.variations !== undefined && object.variation !== undefined) {
                        stream.writeVariation(object.variation);
                    }
                    break;
                }
                case ObjectCategory.Building:
                    Buildings.writeToStream(stream, object.definition);
                    stream.writeObstacleRotation(object.rotation, RotationMode.Limited);
                    break;
            }
        });

        stream.writeArray(data.places ?? [], 4, place => {
            stream.writeASCIIString(place.name);
            stream.writePosition(place.position);
        });
    },
    deserialize(stream) {
        return {
            seed: stream.readUint32(),
            width: stream.readUint16(),
            height: stream.readUint16(),
            oceanSize: stream.readUint16(),
            beachSize: stream.readUint16(),
            rivers: stream.readAndCreateArray(4, () => ({
                width: stream.readUint8(),
                points: stream.readAndCreateArray(8, () => stream.readPosition())
            })),
            objects: stream.readAndCreateArray(16, () => {
                const type = stream.readObjectType() as ObjectCategory.Obstacle | ObjectCategory.Building;
                const position = stream.readPosition();

                switch (type) {
                    case ObjectCategory.Obstacle: {
                        const definition = Obstacles.readFromStream(stream);
                        const scale = definition.scale?.spawnMax ?? 1;
                        const rotation = stream.readObstacleRotation(definition.rotationMode).rotation;

                        let variation: Variation | undefined;
                        if (definition.variations !== undefined) {
                            variation = stream.readVariation();
                        }
                        return {
                            position,
                            type,
                            definition,
                            scale,
                            rotation,
                            variation
                        };
                    }
                    case ObjectCategory.Building: {
                        const definition = Buildings.readFromStream(stream);
                        const { orientation } = stream.readObstacleRotation(RotationMode.Limited);

                        return {
                            position,
                            type,
                            definition,
                            rotation: orientation,
                            scale: 1
                        };
                    }
                }
            }),
            places: stream.readAndCreateArray(4, () => ({
                name: stream.readASCIIString(),
                position: stream.readPosition()
            }))
        } as MapPacketData;
    }
});
