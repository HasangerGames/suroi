import { BitStream } from "bit-buffer";

import { type Vector } from "./vector";
import { ObjectType } from "./objectType";

import { type ObjectDefinitions } from "./objectDefinitions";
import { ObjectDefinitionsList } from "./objectDefinitionsList";

import {
    MAX_OBJECT_SCALE,
    MIN_OBJECT_SCALE,
    OBJECT_CATEGORY_BITS,
    type ObjectCategory, PACKET_TYPE_BITS,
    type PacketType,
    VARIATION_BITS
} from "../constants";
import { type Variation } from "../typings";

export class SuroiBitStream extends BitStream {
    constructor(source: ArrayBuffer, byteOffset = 0, byteLength = 0) {
        super(source, byteOffset, byteLength);
    }

    static alloc(length: number): SuroiBitStream {
        return new SuroiBitStream(new ArrayBuffer(length));
    }

    writeFloat(value: number, min: number, max: number, bitCount: number): void {
        const range = (1 << bitCount) - 1;
        const x = value < max ? (value > min ? value : min) : max;
        const t = (x - min) / (max - min);

        this.writeBits(t * range + 0.5, bitCount);
    }

    readFloat(min: number, max: number, bitCount: number): number {
        const range = (1 << bitCount) - 1;
        return min + (max - min) * this.readBits(bitCount) / range;
    }

    writeVector(vector: Vector, minX: number, minY: number, maxX: number, maxY: number, bitCount: number): void {
        this.writeFloat(vector.x, minX, maxX, bitCount);
        this.writeFloat(vector.y, minY, maxY, bitCount);
    }

    writeVector2(x: number, y: number, minX: number, minY: number, maxX: number, maxY: number, bitCount: number): void {
        this.writeFloat(x, minX, maxX, bitCount);
        this.writeFloat(y, minY, maxY, bitCount);
    }

    readVector(minX: number, minY: number, maxX: number, maxY: number, bitCount: number): Vector {
        return {
            x: this.readFloat(minX, maxX, bitCount),
            y: this.readFloat(minY, maxY, bitCount)
        };
    }

    writePacketType(value: PacketType): void {
        this.writeBits(value, PACKET_TYPE_BITS);
    }

    readPacketType(): PacketType {
        return this.readBits(PACKET_TYPE_BITS) as PacketType;
    }

    readObjectType(): ObjectType {
        const category: ObjectCategory = this.readBits(OBJECT_CATEGORY_BITS);
        const definitions: ObjectDefinitions | undefined = ObjectDefinitionsList[category];
        if (definitions !== undefined) {
            const idNumber: number = this.readBits(definitions.bitCount);
            return ObjectType.fromNumber(category, idNumber);
        } else {
            return ObjectType.categoryOnly(category);
        }
    }

    writeObjectType(type: ObjectType): void {
        this.writeBits(type.category, OBJECT_CATEGORY_BITS);

        const definitions: ObjectDefinitions | undefined = ObjectDefinitionsList[type.category];
        if (definitions !== undefined) {
            this.writeBits(type.idNumber, definitions.bitCount);
        }
    }

    writePosition(vector: Vector): void {
        this.writeVector2(vector.x, 720 - vector.y, 0, 0, 1024, 1024, 16);
    }

    writePosition2(x: number, y: number): void {
        this.writeVector2(x, 720 - y, 0, 0, 1024, 1024, 16);
    }

    readPosition(): Vector {
        return this.readVector(0, 0, 1024, 1024, 16);
    }

    writeRotation(value: number): void {
        this.writeFloat(value, -3.2, 3.2, 8);
    }

    readRotation(): number {
        return this.readFloat(-3.2, 3.2, 8);
    }

    writeScale(value: number): void {
        this.writeFloat(value, MIN_OBJECT_SCALE, MAX_OBJECT_SCALE, 8);
    }

    readScale(): number {
        return this.readFloat(MIN_OBJECT_SCALE, MAX_OBJECT_SCALE, 8);
    }

    writeVariation(value: Variation): void {
        this.writeBits(value, VARIATION_BITS);
    }

    readVariation(): Variation {
        return this.readBits(VARIATION_BITS) as Variation;
    }
}
