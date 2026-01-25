import { ObjectCategory, RotationMode } from "../constants";
import { Buildings } from "../definitions/buildings";
import { Obstacles } from "../definitions/obstacles";
import { type Orientation } from "../typings";
import type { CommonGameObject } from "../utils/gameObject";
import { Angle, halfπ } from "../utils/math";
import { type Vector } from "../utils/vector";
import { DataSplitTypes, Packet, PacketType } from "./packet";

export type MapObject = {
    readonly id: number
    readonly scale?: number
} & CommonGameObject;

export interface MapData {
    readonly type: PacketType.Map
    readonly seed: number
    readonly width: number
    readonly height: number
    readonly oceanSize: number
    readonly beachSize: number

    readonly rivers: Array<{
        readonly width: number
        readonly points: readonly Vector[]
        readonly isTrail: boolean
    }>
    readonly objects: MapObject[]
    readonly places: ReadonlyArray<{ readonly position: Vector, readonly name: string }>
}

export const MapPacket = new Packet<MapData>(PacketType.Map, {
    serialize(strm, data) {
        strm.writeUint32(data.seed)
            .writeUint16(data.width)
            .writeUint16(data.height)
            .writeUint16(data.oceanSize)
            .writeUint16(data.beachSize)
            .writeArray(data.rivers, river => {
                strm.writeUint8(river.width)
                    .writeArray(river.points, point => strm.writePosition(point))
                    .writeUint8(river.isTrail ? -1 : 0);
            })
            .writeArray(data.objects, object => {
                strm.writeObjectType(object.type)
                    .writeObjectId(object.id)
                    .writePosition(object.position);

                switch (object.type) {
                    case ObjectCategory.Obstacle: {
                        Obstacles.writeToStream(strm, object.definition);
                        // Rotation data fits in the low bits; we still write a byte for parity with deserialization.
                        const obstacleData = 0;

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
                                // even without rotation data, deser expects a uint8 here
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
                strm.writeString(24, place.name)
                    .writePosition(place.position);
            });
    },
    deserialize(stream, data, saveIndex, recordTo) {
        saveIndex();

        data.seed = stream.readUint32();
        data.width = stream.readUint16();
        data.height = stream.readUint16();
        data.oceanSize = stream.readUint16();
        data.beachSize = stream.readUint16();

        data.rivers = stream.readArray(() => ({
            width: stream.readUint8(),
            points: stream.readArray(() => stream.readPosition()),
            isTrail: stream.readUint8() !== 0
        }));

        data.objects = stream.readArray(() => {
            const type = stream.readObjectType() as ObjectCategory.Obstacle | ObjectCategory.Building;
            const id = stream.readObjectId();
            const position = stream.readPosition();

            switch (type) {
                case ObjectCategory.Obstacle: {
                    const definition = Obstacles.readFromStream(stream);
                    const scale = definition.scale?.spawnMax ?? 1;

                    // see comments in serialization method to better
                    // understand what's going on

                    const obstacleData = stream.readUint8();

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
                        id,
                        type,
                        dead: false,
                        definition,
                        scale,
                        rotation,
                        isObstacle: true
                    };
                }
                case ObjectCategory.Building: {
                    const definition = Buildings.readFromStream(stream);
                    const { orientation } = stream.readObstacleRotation(RotationMode.Limited);
                    const layer = stream.readLayer();

                    return {
                        position,
                        id,
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
        }, 2) as MapData["objects"];

        data.places = stream.readArray(() => ({
            name: stream.readString(24),
            position: stream.readPosition()
        }));

        recordTo(DataSplitTypes.GameObjects);
    }
});
