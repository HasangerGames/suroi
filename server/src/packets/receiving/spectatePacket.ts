import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { SPECTATE_ACTIONS_BITS, SpectateActions } from "../../../../common/src/constants";

export class SpectatePacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        switch (stream.readBits(SPECTATE_ACTIONS_BITS)) {
            case SpectateActions.BeginSpectating:
                this.player.spectate(this.player.killedBy ?? [...this.player.game.livingPlayers][0]);
                break;
        }
    }
}
