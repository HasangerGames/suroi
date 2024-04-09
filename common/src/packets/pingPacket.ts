import { type SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class PingPacket extends Packet {
    // eslint-disable @typescript-eslint/no-empty-function
    override serialize(_stream: SuroiBitStream): void {}
    override deserialize(_stream: SuroiBitStream): void { }
}
