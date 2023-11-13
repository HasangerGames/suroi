import { PacketType } from "../constants";
import { PACKET_TYPE_BITS, type SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class PingPacket extends Packet {
    override readonly allocBytes = PACKET_TYPE_BITS;
    override readonly type = PacketType.Ping;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override deserialize(stream: SuroiBitStream): void { }
}
