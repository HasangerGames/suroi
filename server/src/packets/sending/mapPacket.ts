import { ObjectCategory, PacketType } from "../../../../common/src/constants";
import { RotationMode } from "../../../../common/src/definitions/obstacles";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Game } from "../../game";
import { type Obstacle } from "../../objects/obstacle";
import { SendingPacket } from "../../types/sendingPacket";

export class MapPacket extends SendingPacket {
    override readonly allocBytes = 1 << 13;
    override readonly type = PacketType.Map;

    game: Game;

    constructor(game: Game) {
        // This packet is only created a single time and this.player is never used
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        super(undefined!);
        this.game = game;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        const map = this.game.map;

        stream.writeUint16(map.width);
        stream.writeUint16(map.height);

        stream.writeBits(this.game.minimapObjects.size, 11);

        for (const object of this.game.minimapObjects) {
            stream.writeObjectType(object.type);
            stream.writePosition(object.position);

            switch (object.type.category) {
                case ObjectCategory.Obstacle: {
                    const obstacle = object as Obstacle;
                    stream.writeScale(obstacle.maxScale);
                    stream.writeObstacleRotation(object.rotation, obstacle.definition.rotationMode);
                    if (obstacle.definition.variations !== undefined) {
                        stream.writeVariation(obstacle.variation);
                    }
                    break;
                }
                case ObjectCategory.Building:
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
