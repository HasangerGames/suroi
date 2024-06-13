import { type SuroiBitStream } from "../utils/suroiBitStream";

export interface Packet {
    serialize(stream: SuroiBitStream): void
    deserialize(stream: SuroiBitStream): void
}
