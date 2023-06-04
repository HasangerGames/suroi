import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";

export class JoinPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        this.player.game.activatePlayer(this.player);
    }
}
