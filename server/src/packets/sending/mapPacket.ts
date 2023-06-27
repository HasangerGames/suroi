import { SendingPacket } from "../../types/sendingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";
import { Obstacle } from "../../objects/obstacle";
import { type Game } from "../../game";

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
        const objects: Obstacle[] = [...this.game.staticObjects].filter(object => {
            return object instanceof Obstacle && !object.definition.hideOnMap;
        }) as Obstacle[];
        stream.writeBits(objects.length, 10);
        for (const object of objects) {
            const definition = object.definition;
            stream.writeObjectType(object.type);
            stream.writePosition(object.position);
            stream.writeScale(object.maxScale);
            stream.writeObstacleRotation(object.rotation, definition.rotationMode);
            if (definition.variations !== undefined) {
                stream.writeVariation(object.variation);
            }
        }
    }
}
