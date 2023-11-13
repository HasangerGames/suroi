import { type PacketType } from "../constants";
import { SuroiBitStream } from "../utils/suroiBitStream";

export abstract class Packet {
    abstract readonly allocBytes: number;
    abstract readonly type: PacketType;

    stream!: SuroiBitStream;

    serialize(): void {
        this.stream = SuroiBitStream.alloc(this.allocBytes);
        this.stream.writePacketType(this.type);
    }

    abstract deserialize(stream: SuroiBitStream): void;

    getBuffer(): ArrayBuffer {
        return this.stream.buffer.slice(0, Math.ceil(this.stream.index / 8));
    }
}
