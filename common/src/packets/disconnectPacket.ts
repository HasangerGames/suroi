import { SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class DisconnectPacket extends Packet {
    reason = "";

    serialize(stream: SuroiBitStream): void {
        stream.writeASCIIString(this.reason);
    }

    deserialize(stream: SuroiBitStream): void {
        this.reason = stream.readASCIIString();
    }
}
