import { SendingPacket } from "../../types/sendingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { ObjectCategory, PacketType } from "../../../../common/src/constants";
import { Obstacle } from "../../objects/obstacle";
import { type Game } from "../../game";
import { Building } from "../../objects/building";
import { RotationMode } from "../../../../common/src/definitions/obstacles";

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

        const objects: Obstacle[] | Building[] = [...this.game.staticObjects].filter(object => {
            return (object instanceof Obstacle || object instanceof Building) && !object.definition.hideOnMap;
        }) as Obstacle[] | Building[];

        stream.writeBits(objects.length, 11);

        for (const object of objects) {
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
