import { SendingPacket } from "../../types/sendingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";
import { type ObstacleDefinition } from "../../../../common/src/definitions/obstacles";
import { Obstacle } from "../../objects/obstacle";

export class MapPacket extends SendingPacket {
    override readonly allocBytes = 1 << 13;
    override readonly type = PacketType.Map;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        const game = this.player.game;
        const objects: Obstacle[] = [...game.staticObjects].filter(object => object instanceof Obstacle) as Obstacle[];
        stream.writeUint16(objects.length);
        for (const object of objects) {
            stream.writeObjectType(object.type);
            const definition: ObstacleDefinition = object.type.definition as ObstacleDefinition;
            stream.writePosition(object.position);
            stream.writeScale(object.maxScale);
            stream.writeObstacleRotation(object.rotation, definition.rotationMode);
            if (definition.variations !== undefined) {
                stream.writeVariation(object.variation);
            }
        }
    }
}
