import { ReceivingPacket } from "../../types/receivingPacket";
import { type Player } from "../../objects/player";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";

export class InputPacket extends ReceivingPacket {
    deserialize(stream: SuroiBitStream): void {
        const p: Player = this.player;
        p.movingUp = stream.readBoolean();
        p.movingDown = stream.readBoolean();
        p.movingLeft = stream.readBoolean();
        p.movingRight = stream.readBoolean();
        stream.readBoolean(); // Punching
        p.rotation = stream.readRotation();
    }
}
