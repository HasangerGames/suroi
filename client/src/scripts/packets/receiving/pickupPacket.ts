import { ReceivingPacket } from "../../types/receivingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

export class PickupPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        this.playerManager.game.activePlayer.scene.playSound("pickup");
    }
}
