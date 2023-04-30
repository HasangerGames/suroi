import { Vector } from "../utils/vector";
import { SuroiBitStream } from "../utils/suroiBitStream";

export abstract class GameObject {

    position: Vector;

    abstract deserializePartial(stream: SuroiBitStream): void;
    abstract deserializeFull(stream: SuroiBitStream): void;

    abstract serializePartial(stream: SuroiBitStream): void;
    abstract serializeFull(stream: SuroiBitStream): void;

}
