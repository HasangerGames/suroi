import { ObjectCategory } from "../constants";
import { Buildings, type BuildingDefinition } from "../definitions/buildings";
import { Obstacles, RotationMode, type ObstacleDefinition } from "../definitions/obstacles";
import { type Variation } from "../typings";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";
import { type Packet } from "./packet";

type MapObject = {
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

export class MapPacket implements Packet {
    seed!: number;
    width!: number;
    height!: number;
    oceanSize!: number;
    beachSize!: number;

    rivers: Array<{ readonly width: number, readonly points: Vector[] }> = [];

    objects: MapObject[] = [];

    places: Array<{ readonly position: Vector, readonly name: string }> = [];

    serialize(stream: SuroiBitStream): void {
        stream.writeUint32(this.seed);
        stream.writeUint16(this.width);
        stream.writeUint16(this.height);
        stream.writeUint16(this.oceanSize);
        stream.writeUint16(this.beachSize);

        stream.writeArray(this.rivers, 4, river => {
            stream.writeUint8(river.width);
            stream.writeArray(river.points, 8, point => {
                stream.writePosition(point);
            });
        });

        stream.writeArray(this.objects, 16, object => {
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

        stream.writeArray(this.places, 4, place => {
            stream.writeASCIIString(place.name);
            stream.writePosition(place.position);
        });
    }

    deserialize(stream: SuroiBitStream): void {
        this.seed = stream.readUint32();
        this.width = stream.readUint16();
        this.height = stream.readUint16();
        this.oceanSize = stream.readUint16();
        this.beachSize = stream.readUint16();

        stream.readArray(this.rivers, 4, () => {
            const river = {
                width: stream.readUint8(),
                points: [] as Vector[]
            };
            stream.readArray(river.points, 8, () => stream.readPosition());
            return river;
        });

        stream.readArray(this.objects, 16, () => {
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
        });

        stream.readArray(this.places, 4, () => {
            return {
                name: stream.readASCIIString(),
                position: stream.readPosition()
            };
        });
    }
}
