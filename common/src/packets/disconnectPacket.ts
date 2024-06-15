import { SuroiBitStream } from "../utils/suroiBitStream";
import { type Packet } from "./packet";

export class DisconnectPacket implements Packet {
    reason = "";

    serialize(stream: SuroiBitStream): void {
        stream.writeASCIIString(this.reason);
    }

    deserialize(stream: SuroiBitStream): void {
        this.reason = stream.readASCIIString();
    }
}
