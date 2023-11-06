import { PacketType } from "../../../../common/src/constants";
import { Buildings } from "../../../../common/src/definitions/buildings";
import { Obstacles, RotationMode } from "../../../../common/src/definitions/obstacles";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Game } from "../../game";
import { Building } from "../../objects/building";
import { Obstacle } from "../../objects/obstacle";
import { SendingPacket } from "../../types/sendingPacket";

export class MapPacket extends SendingPacket {
    override readonly allocBytes = 1 << 14;
    override readonly type = PacketType.Map;

    readonly game: Game;

    constructor(game: Game) {
        // This packet is only created a single time and this.player is never used
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        super(undefined!);
        this.game = game;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        const map = this.game.map;

        stream.writeUint32(map.seed);
        stream.writeUint16(map.width);
        stream.writeUint16(map.height);
        stream.writeUint16(map.oceanSize);
        stream.writeUint16(map.beachSize);

        stream.writeBits(map.rivers.length, 4);
        for (const river of map.rivers) {
            stream.writeUint8(river.width);
            stream.writeUint8(river.bankWidth);

            stream.writeUint8(river.points.length);
            for (const point of river.points) {
                stream.writePosition(point);
            }
        }

        stream.writeBits(this.game.minimapObjects.size, 11);

        for (const object of this.game.minimapObjects) {
            stream.writeObjectType(object.type);
            stream.writePosition(object.position);

            switch (true) {
                case object instanceof Obstacle: {
                    Obstacles.writeToStream(stream, object.definition);
                    stream.writeScale(object.maxScale);
                    stream.writeObstacleRotation(object.rotation, object.definition.rotationMode);
                    if (object.definition.variations !== undefined) {
                        stream.writeVariation(object.variation);
                    }
                    break;
                }
                case object instanceof Building:
                    Buildings.writeToStream(stream, object.definition);
                    stream.writeObstacleRotation(object.rotation, RotationMode.Limited);
                    break;
            }
        }

        stream.writeBits(map.places.length, 4);

        for (const place of map.places) {
            stream.writeASCIIString(place.name, 24);
            stream.writePosition(place.position);
        }
    }
}
