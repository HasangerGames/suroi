import { type PacketType } from "../constants";
import { type SuroiBitStream } from "../utils/suroiBitStream";

export abstract class AbstractPacket {
    abstract readonly allocBytes: number;
    abstract readonly type: PacketType;

    abstract serialize(stream: SuroiBitStream): void;
    abstract deserialize(stream: SuroiBitStream): void;
}
