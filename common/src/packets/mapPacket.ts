import { ObjectCategory, PacketType } from "../constants";
import { Buildings, type BuildingDefinition } from "../definitions/buildings";
import { type ObstacleDefinition, RotationMode, Obstacles } from "../definitions/obstacles";
import { type Variation } from "../typings";
import { River } from "../utils/mapUtils";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";
import { Packet } from "./packet";

type MapObject = {
    readonly position: Vector
    readonly rotation: number
    readonly scale: number
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

    rivers!: River[];

    readonly objects: MapObject[] = [];

    readonly places: Array<{
        readonly position: Vector
        readonly name: string
    }> = [];

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

        stream.writeUint32(this.seed);
        stream.writeUint16(this.width);
        stream.writeUint16(this.height);
        stream.writeUint16(this.oceanSize);
        stream.writeUint16(this.beachSize);

        stream.writeBits(this.rivers.length, 4);
        for (const river of this.rivers) {
            stream.writeUint8(river.width);
            stream.writeUint8(river.bankWidth);

            stream.writeUint8(river.points.length);
            for (const point of river.points) {
                stream.writePosition(point);
            }
        }

        stream.writeUint16(this.objects.length);

        for (const object of this.objects) {
            stream.writeObjectType(object.type);
            stream.writePosition(object.position);

            switch (object.type) {
                case ObjectCategory.Obstacle: {
                    Obstacles.writeToStream(stream, object.definition);
                    stream.writeScale(object.definition.scale.spawnMax);
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

        stream.writeBits(this.places.length, 4);

        for (const place of this.places) {
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

        this.rivers = Array.from(
            { length: stream.readBits(4) },
            () => new River(
                stream.readUint8(),
                stream.readUint8(),
                Array.from(
                    { length: stream.readUint8() },
                    stream.readPosition.bind(stream)
                )
            )
        );

        const objectCount = stream.readUint16();
        for (let i = 0; i < objectCount; i++) {
            const type = stream.readObjectType();
            const position = stream.readPosition();

            switch (type) {
                case ObjectCategory.Obstacle: {
                    const definition = Obstacles.readFromStream(stream);
                    const scale = stream.readScale();
                    const rotation = stream.readObstacleRotation(definition.rotationMode).rotation;

                    let variation: Variation | undefined;
                    if (definition.variations !== undefined) {
                        variation = stream.readVariation();
                    }

                    this.objects.push({
                        position,
                        type,
                        definition,
                        scale,
                        rotation,
                        variation
                    });
                    break;
                }
                case ObjectCategory.Building: {
                    const definition = Buildings.readFromStream(stream);
                    const { orientation } = stream.readObstacleRotation(RotationMode.Limited);

                    this.objects.push({
                        position,
                        type,
                        definition,
                        rotation: orientation,
                        scale: 1
                    });
                    break;
                }
            }
        }

        for (
            let i = 0, placesSize = stream.readBits(4);
            i < placesSize;
            i++
        ) {
            const name = stream.readASCIIString(24);
            const position = stream.readPosition();
            this.places.push({ position, name });
        }
    }
}
