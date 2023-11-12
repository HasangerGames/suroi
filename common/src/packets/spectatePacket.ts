import { Packet } from "./packet";
import { PacketType, SpectateActions } from "../constants";
import { SPECTATE_ACTIONS_BITS, type SuroiBitStream } from "../utils/suroiBitStream";

export class SpectatePacket extends Packet {
    override readonly allocBytes = 3;
    override readonly type = PacketType.Spectate;

    spectateAction!: SpectateActions;
    playerID?: number;

    override serialize(): void {
        super.serialize();
        this.stream.writeBits(this.spectateAction, SPECTATE_ACTIONS_BITS);
        if (this.playerID !== undefined) this.stream.writeObjectID(this.playerID);
    }

    override deserialize(stream: SuroiBitStream): void {
        this.spectateAction = stream.readBits(SPECTATE_ACTIONS_BITS);
        if (this.spectateAction === SpectateActions.SpectateSpecific) this.playerID = stream.readObjectID();
    }
}
