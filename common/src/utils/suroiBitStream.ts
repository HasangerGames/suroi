import { BitStream, type BitView } from "bit-buffer";
import { Vector } from "./vector";

export class SuroiBitStream extends BitStream {
    constructor (source: ArrayBuffer | BitView, byteOffset = 0, byteLength = 0) {
        super(source, byteOffset, byteLength);
    }

    static alloc (length: number): SuroiBitStream {
        return new SuroiBitStream(Buffer.alloc(length));
    }

    writeString (str: string): void { this.writeASCIIString(str); }
    writeStringFixedLength (str: string, len?: number): void { this.writeASCIIString(str, len); }
    readString (): string { return this.readASCIIString(); }

    readStringFixedLength (len?: number): string { return this.readASCIIString(len); }

    writeFloat (val: number, min: number, max: number, bitCount: number): void {
        const range = (1 << bitCount) - 1;
        const x = val < max ? (val > min ? val : min) : max;
        const t = (x - min) / (max - min);
        this.writeBits(t * range + 0.5, bitCount);
    }

    readFloat (min: number, max: number, bitCount: number): number {
        const range = (1 << bitCount) - 1;
        return min + (max - min) * this.readBits(bitCount) / range;
    }

    writeVec (vec: Vector, minX: number, minY: number, maxX: number, maxY: number, bitCount: number): void {
        this.writeFloat(vec.x, minX, maxX, bitCount);
        this.writeFloat(vec.y, minY, maxY, bitCount);
    }

    readVec (minX: number, minY: number, maxX: number, maxY: number, bitCount: number): Vector {
        return Vector.create(this.readFloat(minX, maxX, bitCount), this.readFloat(minY, maxY, bitCount));
    }

    writeUnitVec (vec: Vector, bitCount: number): void {
        this.writeVec(vec, -1, -1, 1, 1, bitCount);
    }

    readUnitVec (bitCount: number): Vector {
        return this.readVec(-1, -1, 1, 1, bitCount);
    }

    writeVec32 (vector: Vector): void {
        this.writeFloat32(vector.x);
        this.writeFloat32(vector.y);
    }

    readVec32 (): Vector {
        return Vector.create(this.readFloat32(), this.readFloat32());
    }

    writeAlignToNextByte (): void {
        const offset = 8 - this.index % 8;
        if (offset < 8) this.writeBits(0, offset);
    }

    readAlignToNextByte (): void {
        const offset = 8 - this.index % 8;
        if (offset < 8) this.readBits(offset);
    }
}
