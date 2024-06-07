import { BitStream, type BitView } from "@damienvesper/bit-buffer";
import { GameConstants, ObjectCategory } from "../constants";
import { RotationMode } from "../definitions/obstacles";
import { type Orientation, type Variation } from "../typings";
import { Angle, Numeric } from "./math";
import { type Vector } from "./vector";

export const calculateEnumPacketBits = (enumeration: Record<string | number, string | number>): number => Math.ceil(Math.log2(Object.keys(enumeration).length / 2));

export const OBJECT_CATEGORY_BITS = calculateEnumPacketBits(ObjectCategory);
export const OBJECT_ID_BITS = 13;
export const VARIATION_BITS = 3;
export const MIN_OBJECT_SCALE = 0.25;
export const MAX_OBJECT_SCALE = 3;

export class SuroiBitStream extends BitStream {
    constructor(source: ArrayBuffer, byteOffset = 0, byteLength = 0) {
        super(source, byteOffset, byteLength);
    }

    /**
     * Allocs a new Suroi Bit Stream
     * @param length The size of the stream
     * @return The Suroi Bit Stream object
     */
    static alloc(length: number): SuroiBitStream {
        return new SuroiBitStream(new ArrayBuffer(length));
    }

    /**
     * Write a floating point number to the stream
     * @param value The number
     * @param min The minimum number
     * @param max The maximum number
     * @param bitCount The number of bits to write
     */
    writeFloat(value: number, min: number, max: number, bitCount: number): void {
        if (bitCount < 0 || bitCount >= 31) {
            throw new Error(`Invalid bit count ${bitCount}`);
        }
        const range = (1 << bitCount) - 1;
        const clamped = Numeric.clamp(value, min, max);
        this.writeBits(((clamped - min) / (max - min)) * range + 0.5, bitCount);
    }

    /**
     * Read a floating point number from the stream
     * @param min The minimum number
     * @param max The maximum number
     * @param bitCount The number of bits to read
     * @return The floating point number
     */
    readFloat(min: number, max: number, bitCount: number): number {
        if (bitCount < 0 || bitCount >= 31) {
            throw new Error(`Invalid bit count ${bitCount}`);
        }
        const range = (1 << bitCount) - 1;
        return min + (max - min) * this.readBits(bitCount) / range;
    }

    /**
     * Write a position Vector to the stream
     * @param vector The Vector
     * @param minX The minimum X position
     * @param minY The minimum Y position
     * @param maxX The maximum X position
     * @param maxY The maximum Y position
     * @param bitCount The number of bits to write
     */
    writeVector(vector: Vector, minX: number, minY: number, maxX: number, maxY: number, bitCount: number): void {
        this.writeVector2(vector.x, vector.y, minX, minY, maxX, maxY, bitCount);
    }

    /**
     * Write a position Vector to the stream
     * @param x The X position
     * @param y The Y position
     * @param minX The minimum X position
     * @param minY The minimum Y position
     * @param maxX The maximum X position
     * @param maxY The maximum Y position
     * @param bitCount The number of bits to write
     * @return The position Vector
     */
    writeVector2(x: number, y: number, minX: number, minY: number, maxX: number, maxY: number, bitCount: number): void {
        this.writeFloat(x, minX, maxX, bitCount);
        this.writeFloat(y, minY, maxY, bitCount);
    }

    /**
     * Read a position Vector from the stream
     * @param minX The minimum X position
     * @param minY The minimum Y position
     * @param maxX The maximum X position
     * @param maxY The maximum Y position
     * @param bitCount The number of bits to read
     */
    readVector(minX: number, minY: number, maxX: number, maxY: number, bitCount: number): Vector {
        return {
            x: this.readFloat(minX, maxX, bitCount),
            y: this.readFloat(minY, maxY, bitCount)
        };
    }

    /**
     * Write a game object type to the stream
     * @param type The ObjectType
     */
    writeObjectType(type: ObjectCategory): void {
        this.writeBits(type, OBJECT_CATEGORY_BITS);
    }

    /**
     * Read a game object type from stream
     * @return The object type
     */
    readObjectType(): ObjectCategory {
        return this.readBits(OBJECT_CATEGORY_BITS);
    }

    /**
     * Write an object ID to the stream
     * @param id The object ID to write
     */
    writeObjectID(id: number): void {
        this.writeBits(id, OBJECT_ID_BITS);
    }

    /**
     * Read an object ID from the stream
     * @return The object ID
     */
    readObjectID(): number {
        return this.readBits(OBJECT_ID_BITS);
    }

    /**
     * Write a position Vector to the stream with the game default max and minimum X and Y
     * @param vector The Vector to write
     */
    writePosition(vector: Vector): void {
        this.writePosition2(vector.x, vector.y);
    }

    /**
     * Write a position Vector to the stream with the game default max and minimum X and Y
     * @param x The x-coordinate of the vector to write
     * @param y The y-coordinate of the vector to write
     */
    writePosition2(x: number, y: number): void {
        this.writeVector2(x, y, 0, 0, GameConstants.maxPosition, GameConstants.maxPosition, 16);
    }

    /**
     * Read a position Vector from stream with the game default max and minimum X and Y
     * @return the position Vector
     */
    readPosition(): Vector {
        return this.readVector(0, 0, GameConstants.maxPosition, GameConstants.maxPosition, 16);
    }

    /**
     * Write a rotation to the stream
     * @param value The rotation to write, in radians
     * @param bitCount The number of bits to write
     */
    writeRotation(value: number, bitCount: number): void {
        this.writeFloat(value, -Math.PI, Math.PI, bitCount);
    }

    /**
     * Read a rotation from the stream
     * @param bitCount The number of bits to read
     * @return The rotation in radians
     */
    readRotation(bitCount: number): number {
        return this.readFloat(-Math.PI, Math.PI, bitCount);
    }

    /**
     * Write an obstacle rotation to the stream
     * @param value The rotation to write, in radians
     * @param mode The rotation mode
     */
    writeObstacleRotation(value: number, mode: RotationMode): void {
        switch (mode) {
            case RotationMode.Full:
                this.writeRotation(value, 4);
                break;
            case RotationMode.Limited: // 4 possible orientations
                this.writeBits(value, 2);
                break;
            case RotationMode.Binary: // 2 possible orientations
                this.writeBits(value, 1);
                break;
        }
    }

    /**
     * Read an obstacle rotation from the stream
     * @param mode The rotation mode
     * @return The rotation in radians
     */
    readObstacleRotation(mode: RotationMode): { rotation: number, orientation: Orientation } {
        let orientation: Orientation = 0;
        let rotation = 0;
        switch (mode) {
            case RotationMode.Full:
                rotation = this.readRotation(4);
                break;
            case RotationMode.Limited: // 4 possible orientations
                orientation = this.readBits(2) as Orientation;
                rotation = -Angle.normalize(orientation) * (Math.PI / 2);
                break;
            case RotationMode.Binary: // 2 possible orientations
                if (this.readBoolean()) {
                    rotation = Math.PI / 2;
                    orientation = 1;
                }
                break;
        }
        return {
            rotation,
            orientation
        };
    }

    /**
     * Write a game object scale to the stream
     * @param value The scale to write
     */
    writeScale(value: number): void {
        this.writeFloat(value, MIN_OBJECT_SCALE, MAX_OBJECT_SCALE, 8);
    }

    /**
     * Read a game object scale from the stream
     * @return The object scale
     */
    readScale(): number {
        return this.readFloat(MIN_OBJECT_SCALE, MAX_OBJECT_SCALE, 8);
    }

    /**
     * Write a game object variation to the stream
     * @param value The variation value to write
     */
    writeVariation(value: Variation): void {
        this.writeBits(value, VARIATION_BITS);
    }

    /**
     * Read a game object variation from the stream
     * @return The object variation
     */
    readVariation(): Variation {
        return this.readBits(VARIATION_BITS) as Variation;
    }

    /**
     * Write a player name to the stream
     * @param name The player name
     */
    writePlayerName(name: string): void {
        this.writeASCIIString(name, GameConstants.player.nameMaxLength);
    }

    /**
     * Read a player name from the stream
     * @return The player name
     */
    readPlayerName(): string {
        return this.readASCIIString(GameConstants.player.nameMaxLength);
    }

    /**
     * Write an array to the stream
     * @param arr An array containing the items to serialize
     * @param serializeFn The function to serialize each iterator item
     * @param size The iterator size (eg. array.length or set.size)
     */
    writeArray<T>(arr: readonly T[], bits: number, serializeFn: (item: T) => void): void {
        if (bits < 0 || bits >= 31) {
            throw new Error(`Invalid bit count ${bits}`);
        }

        const length = arr.length;
        this.writeBits(length, bits);

        const max = 1 << bits;
        for (let i = 0; i < length; i++) {
            if (i > max) {
                console.warn(`writeArray: iterator overflow: ${bits} bits, ${length} size`);
                break;
            }
            serializeFn(arr[i]);
        }
    }

    /**
     * Read an array from the stream
     * @param out The array to add the deserialized elements to
     * @param serializeFn The function to de-serialize each iterator item
     * @param bits The maximum length of bits to read
     * @see {@link SuroiBitStream.readAndCreateArray()}
     */
    readArray<T>(out: T[], bits: number, deserializeFn: () => T): void {
        const size = this.readBits(bits);

        for (let i = 0; i < size; i++) {
            out.push(deserializeFn());
        }
    }

    /**
     * Read an array from the stream
     * @param serializeFn The function to de-serialize each iterator item
     * @param bits The maximum length of bits to read
     * @returns An array with the desired elements
     */
    readAndCreateArray<T>(bits: number, deserializeFn: () => T): T[] {
        return Array.from(
            { length: this.readBits(bits) },
            () => deserializeFn()
        );
    }

    // does `src` need to be byte-aligned?
    /**
     * Copy bytes from a source stream to this stream
     *
     * **NOTE**: Both streams index must be byte aligned
     * @param src    The {@link BitStream} to copy from
     * @param offset The offset to start reading from
     * @param length How many bytes to read from the source
     */
    writeBytes(src: BitStream, offset: number, length: number): void {
        if (this.index % 8 !== 0) {
            throw new Error("writeBytes: target stream (`this`) must be byte aligned");
        }

        // HACK evil
        type UnPrivatizedBitStream = Omit<BitStream, "_view"> & { readonly _view: Omit<BitView, "_view"> & { readonly _view: Uint8Array } };

        (this as unknown as UnPrivatizedBitStream)._view._view.set(
            new Uint8Array(
                (src as unknown as UnPrivatizedBitStream)._view._view.buffer,
                offset,
                length
            ),
            this.index / 8
        );
        this.index += length * 8;
    }

    /**
     * Writes a byte alignment to the stream
     *
     * This is to ensure the stream index is a multiple of 8
     */
    writeAlignToNextByte(): void {
        const offset = 8 - this.index % 8;
        if (offset < 8) this.writeBits(0, offset);
    }

    /**
     * Read a byte alignment from the stream
     */
    readAlignToNextByte(): void {
        const offset = 8 - this.index % 8;
        if (offset < 8) this.readBits(offset);
    }
}
