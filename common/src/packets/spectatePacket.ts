import { PacketType, SpectateActions } from "../constants";
import { calculateEnumPacketBits, type SuroiBitStream } from "../utils/suroiBitStream";
import { AbstractPacket } from "./packet";

const SPECTATE_ACTIONS_BITS = calculateEnumPacketBits(SpectateActions);

export class SpectatePacket extends AbstractPacket {
    override readonly allocBytes = 3;
    override readonly type = PacketType.Spectate;

    spectateAction!: SpectateActions;
    playerID?: number;

    override serialize(stream: SuroiBitStream): void {
        stream.writeBits(this.spectateAction, SPECTATE_ACTIONS_BITS);
        if (this.playerID !== undefined && this.spectateAction === SpectateActions.SpectateSpecific) {
            stream.writeObjectID(this.playerID);
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        this.spectateAction = stream.readBits(SPECTATE_ACTIONS_BITS);

        if (this.spectateAction === SpectateActions.SpectateSpecific) {
            this.playerID = stream.readObjectID();
        }
    }
}
