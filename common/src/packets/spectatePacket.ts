import { PacketType, SpectateActions } from "../constants";
import { type SuroiBitStream, calculateEnumPacketBits } from "../utils/suroiBitStream";
import { Packet } from "./packet";

const SPECTATE_ACTIONS_BITS = calculateEnumPacketBits(SpectateActions);

export class SpectatePacket extends Packet {
    override readonly allocBytes = 3;
    override readonly type = PacketType.Spectate;

    spectateAction!: SpectateActions;
    playerID?: number;

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

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
