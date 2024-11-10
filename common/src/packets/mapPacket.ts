import { ObjectCategory } from "../constants";
import { Buildings } from "../definitions/buildings";
import { Obstacles, RotationMode } from "../definitions/obstacles";
import { type Orientation, type Variation } from "../typings";
import type { CommonGameObject } from "../utils/gameObject";
import { Angle, halfπ } from "../utils/math";
import { type Vector } from "../utils/vector";
import { createPacket } from "./packet";

export type MapObject = {
    readonly scale?: number
    readonly variation?: Variation
} & CommonGameObject;

export type MapPacketData = {
    readonly seed: number
    readonly width: number
    readonly height: number
    readonly oceanSize: number
    readonly beachSize: number

    readonly rivers: ReadonlyArray<{ readonly width: number, readonly points: readonly Vector[], readonly isTrail: boolean }>
    readonly objects: readonly MapObject[]
    readonly places: ReadonlyArray<{ readonly position: Vector, readonly name: string }>
};

export const MapPacket = createPacket("MapPacket")<MapPacketData>({
    serialize(strm, data) {
        strm.writeUint32(data.seed)
            .writeUint16(data.width)
            .writeUint16(data.height)
            .writeUint16(data.oceanSize)
            .writeUint16(data.beachSize)
            .writeArray(data.rivers, river => {
                strm.writeUint8(river.width)
                    .writeArray(
                        river.points,
                        point => { strm.writePosition(point); },
                        1
                    )
                    .writeUint8(river.isTrail ? -1 : 0);
            }, 1)
            .writeArray(data.objects, object => {
                strm.writeObjectType(object.type)
                    .writePosition(object.position);

                switch (object.type) {
                    case ObjectCategory.Obstacle: {
                        Obstacles.writeToStream(strm, object.definition);
                        // once again, we hit a deadspace optimization issue, but thankfully, it's easier this time
                        // once again, variation takes up to 3 bits, meaning that using an 8-bit integer leaves
                        // space for the limited and binary rotation modes, which take 2 and 1 bit respectively.
                        // for a rotation mode of full, well we just write that as-is and write the variation as-is too

                        let obstacleData = 0;
                        if (object.definition.variations !== undefined && object.variation !== undefined) {
                            // again, we'll make variation take up the MSB
                            obstacleData = object.variation << (8 - object.definition.variationBits);
                        }

                        switch (object.definition.rotationMode) {
                            case RotationMode.Full: {
                                // nothing to pack here
                                // as an aside, write obstacle data first to make deserialization easier
                                strm.writeUint8(obstacleData);
                                strm.writeRotation(object.rotation);
                                break;
                            }
                            case RotationMode.Limited:
                            case RotationMode.Binary: {
                                // pack the rotation data into the LSB's of obstacleData, then write that
                                strm.writeUint8(obstacleData + object.rotation);
                                break;
                            }
                            case RotationMode.None: {
                                // write the variation data (and even without it, deser expects a uint8 here)
                                strm.writeUint8(obstacleData);
                                break;
                            }
                        }
                        break;
                    }
                    case ObjectCategory.Building:
                        Buildings.writeToStream(strm, object.definition);
                        strm.writeObstacleRotation(object.orientation, RotationMode.Limited)
                            .writeLayer(object.layer);
                        break;
                }
            }, 2)
            .writeArray(data.places ?? [], place => {
                strm.writeString(24, place.name);
                strm.writePosition(place.position);
            }, 1);
    },
    deserialize(stream) {
        return {
            seed: stream.readUint32(),
            width: stream.readUint16(),
            height: stream.readUint16(),
            oceanSize: stream.readUint16(),
            beachSize: stream.readUint16(),
            rivers: stream.readArray(() => ({
                width: stream.readUint8(),
                points: stream.readArray(() => stream.readPosition(), 1),
                isTrail: stream.readUint8() !== 0
            }), 1),
            objects: stream.readArray(() => {
                const type = stream.readObjectType() as ObjectCategory.Obstacle | ObjectCategory.Building;
                const position = stream.readPosition();

                switch (type) {
                    case ObjectCategory.Obstacle: {
                        const definition = Obstacles.readFromStream(stream);
                        const scale = definition.scale?.spawnMax ?? 1;

                        // see comments in serialization method to better
                        // understand what's going on

                        const obstacleData = stream.readUint8();

                        let variation: Variation | undefined;
                        if (definition.variations !== undefined) {
                            const bits = 8 - definition.variationBits;
                            variation = ((obstacleData & (0xFF - (2 ** bits - 1)))) >> bits as Variation;
                            //                           ^^^^^^^^^^^^^^^^^^^^^^^^ mask the most significant bits
                        }

                        let rotation = 0;

                        switch (definition.rotationMode) {
                            case RotationMode.Full: {
                                rotation = stream.readRotation();
                                break;
                            }
                            case RotationMode.Limited:
                            case RotationMode.Binary: {
                                const orientation = (obstacleData & 0b11) as Orientation;

                                rotation = definition.rotationMode === RotationMode.Binary
                                    ? orientation * halfπ // sus
                                    : -Angle.normalize(orientation) * halfπ;
                                break;
                            }
                            // case RotationMode.None: {
                            //     break;
                            // }
                        }

                        return {
                            position,
                            type,
                            dead: false,
                            definition,
                            scale,
                            rotation,
                            variation,
                            isObstacle: true
                        };
                    }
                    case ObjectCategory.Building: {
                        const definition = Buildings.readFromStream(stream);
                        const { orientation } = stream.readObstacleRotation(RotationMode.Limited);
                        const layer = stream.readLayer();

                        return {
                            position,
                            type,
                            dead: false,
                            definition,
                            rotation: Angle.orientationToRotation(orientation),
                            orientation,
                            scale: 1,
                            layer,
                            isBuilding: true
                        };
                    }
                }
            }, 2),
            places: stream.readArray(() => ({
                name: stream.readString(24),
                position: stream.readPosition()
            }), 1)
        } as MapPacketData;
    }
});
