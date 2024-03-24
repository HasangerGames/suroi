import { PacketType } from "../constants";
import { PACKET_TYPE_BITS, type SuroiBitStream } from "../utils/suroiBitStream";
import { AbstractPacket } from "./packet";

export class PingPacket extends AbstractPacket {
    override readonly allocBytes = PACKET_TYPE_BITS;
    override readonly type = PacketType.Ping;

    // eslint-disable @typescript-eslint/no-empty-function
    override serialize(_stream: SuroiBitStream): void {}
    override deserialize(_stream: SuroiBitStream): void { }
}
