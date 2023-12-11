import { PacketType } from "../constants.js";
import { PACKET_TYPE_BITS, type SuroiBitStream } from "../utils/suroiBitStream.js";
import { Packet } from "./packet.js";

export class PingPacket extends Packet {
    override readonly allocBytes = PACKET_TYPE_BITS;
    override readonly type = PacketType.Ping;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override deserialize(stream: SuroiBitStream): void { }
}
