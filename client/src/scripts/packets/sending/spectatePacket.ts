import { PacketType, type SpectateActions } from "../../../../../common/src/constants";
import { SPECTATE_ACTIONS_BITS, type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";
import { type PlayerManager } from "../../utils/playerManager";

export class SpectatePacket extends SendingPacket {
    override readonly allocBytes = 130;
    override readonly type = PacketType.Spectate;
    readonly spectateAction: SpectateActions;
    readonly playerID?: number;

    constructor(player: PlayerManager, spectateAction: SpectateActions, playerID?: number) {
        super(player);
        this.spectateAction = spectateAction;
        this.playerID = playerID;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        stream.writeBits(this.spectateAction, SPECTATE_ACTIONS_BITS);
        if (this.playerID !== undefined) stream.writeObjectID(this.playerID);
    }
}
