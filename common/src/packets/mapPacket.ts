import { ObjectCategory, PacketType } from "../constants";
import { Buildings, type BuildingDefinition } from "../definitions/buildings";
import { Obstacles, RotationMode, type ObstacleDefinition } from "../definitions/obstacles";
import { type Variation } from "../typings";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";
import { Packet } from "./packet";

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

export class MapPacket extends Packet {
    override readonly allocBytes = 1 << 16;
    override readonly type = PacketType.Map;

    seed!: number;
    width!: number;
    height!: number;
    oceanSize!: number;
    beachSize!: number;

    private _rivers: Array<{ readonly width: number, readonly points: Vector[] }> = [];
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    get rivers() { return this._rivers; }

    private _objects: MapObject[] = [];
    get objects(): MapObject[] { return this._objects; }

    private _places: Array<{ readonly position: Vector, readonly name: string }> = [];
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    get places() { return this._places; }

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

        stream.writeUint32(this.seed);
        stream.writeUint16(this.width);
        stream.writeUint16(this.height);
        stream.writeUint16(this.oceanSize);
        stream.writeUint16(this.beachSize);

        stream.writeBits(this._rivers.length, 4);
        for (const river of this._rivers) {
            stream.writeUint8(river.width);

            stream.writeUint8(river.points.length);
            for (const point of river.points) {
                stream.writePosition(point);
            }
        }

        stream.writeUint16(this._objects.length);

        for (const object of this._objects) {
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
        }

        stream.writeBits(this._places.length, 4);

        for (const place of this._places) {
            stream.writeASCIIString(place.name, 24);
            stream.writePosition(place.position);
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        this.seed = stream.readUint32();
        this.width = stream.readUint16();
        this.height = stream.readUint16();
        this.oceanSize = stream.readUint16();
        this.beachSize = stream.readUint16();

        this._rivers = Array.from(
            { length: stream.readBits(4) },
            () => ({
                width: stream.readUint8(),
                points: Array.from(
                    { length: stream.readUint8() },
                    () => stream.readPosition()
                )
            })
        );

        this._objects = Array.from(
            { length: stream.readUint16() },
            // are you have stupid
            // eslint-disable-next-line array-callback-return
            () => {
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
            }
        );

        this._places = Array.from(
            { length: stream.readBits(4) },
            () => ({
                name: stream.readASCIIString(24),
                position: stream.readPosition()
            })
        );
    }
}
