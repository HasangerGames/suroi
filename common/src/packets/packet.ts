import { type SuroiBitStream } from "../utils/suroiBitStream";

export abstract class Packet {
    abstract serialize(stream: SuroiBitStream): void;
    abstract deserialize(stream: SuroiBitStream): void;
}
