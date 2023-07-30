import { SendingPacket } from "../../types/sendingPacket";

import { PacketType, SPECTATE_ACTIONS_BITS, type SpectateActions } from "../../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type PlayerManager } from "../../utils/playerManager";

export class SpectatePacket extends SendingPacket {
    override readonly allocBytes = 2;
    override readonly type = PacketType.Spectate;
    readonly spectateAction: SpectateActions;

    constructor(player: PlayerManager, spectateAction: SpectateActions) {
        super(player);
        this.spectateAction = spectateAction;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        stream.writeBits(this.spectateAction, SPECTATE_ACTIONS_BITS);
    }
}
