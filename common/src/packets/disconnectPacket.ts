import { SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class DisconnectPacket extends Packet {
    reason = "";

    override serialize(stream: SuroiBitStream): void {
        stream.writeASCIIString(this.reason);
    }

    override deserialize(stream: SuroiBitStream): void {
        this.reason = stream.readASCIIString();
    }
}
