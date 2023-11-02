import { ObjectCategory } from "../../../../../common/src/constants";
import { Buildings, type BuildingDefinition } from "../../../../../common/src/definitions/buildings";
import { type ObstacleDefinition, RotationMode, Obstacles } from "../../../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../../../common/src/typings";
import { River } from "../../../../../common/src/utils/mapUtils";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type Vector } from "../../../../../common/src/utils/vector";
import { ReceivingPacket } from "../../types/receivingPacket";

export class MapPacket extends ReceivingPacket {
    seed!: number;
    width!: number;
    height!: number;
    oceanSize!: number;
    beachSize!: number;

    private _rivers!: River[];
    get rivers(): River[] { return this._rivers; }

    readonly obstacles: Array<{
        readonly type: ObstacleDefinition
        readonly position: Vector
        readonly rotation: number
        readonly scale: number
        readonly variation?: Variation
    }> = [];

    readonly buildings: Array<{
        readonly type: BuildingDefinition
        readonly position: Vector
        readonly orientation: Orientation
        readonly rotation: number
    }> = [];

    readonly places: Array<{
        readonly position: Vector
        readonly name: string
    }> = [];

    override deserialize(stream: SuroiBitStream): void {
        this.seed = stream.readUint32();
        this.width = stream.readUint16();
        this.height = stream.readUint16();
        this.oceanSize = stream.readUint16();
        this.beachSize = stream.readUint16();

        this._rivers = Array.from(
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

        for (
            let i = 0, numObstacles = stream.readBits(11);
            i < numObstacles;
            i++
        ) {
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

                    this.obstacles.push({
                        position,
                        type: definition,
                        scale,
                        rotation,
                        variation
                    });
                    break;
                }
                case ObjectCategory.Building: {
                    const definition = Buildings.readFromStream(stream);
                    const { orientation, rotation } = stream.readObstacleRotation(RotationMode.Limited);
                    this.buildings.push({
                        position,
                        type: definition,
                        orientation,
                        rotation
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
