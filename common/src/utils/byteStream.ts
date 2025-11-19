import { Numeric, τ } from "./math";

// note: the code in this file is optimized for speed, not for readability nor safety
// methods document the situations which may lead to undefined behavior

export class ByteStream {
    static readonly decoder = new TextDecoder();
    static readonly encoder = new TextEncoder();

    private readonly _view: DataView<ArrayBuffer>;
    private readonly _u8Array: Uint8Array;

    get buffer(): ArrayBuffer { return this._view.buffer; }

    index = 0;

    constructor(
        source: ArrayBuffer,
        byteOffset?: number,
        byteLength?: number
    ) {
        this._view = new DataView(source, byteOffset, byteLength);
        this._u8Array = new Uint8Array(source, byteOffset, byteLength);
    }

    /**
     * @returns An integer in `[0, 256]`
     */
    readUint8(): number {
        const val = this._view.getUint8(this.index);
        this.index += 1;
        return val;
    }

    /**
     * @param value An integer in range `[0, 256]` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * Negative values cause underflow, and decimals are truncated.
     *
     * Integers larger than 255 have their least significant byte written
     */
    writeUint8(value: number): this {
        this._view.setUint8(this.index, value);
        this.index += 1;
        return this;
    }

    /**
     * @returns An integer in `[0, 65536]`
     */
    readUint16(): number {
        const val = this._view.getUint16(this.index);
        this.index += 2;
        return val;
    }

    /**
     * @param value An integer in range `[0, 65536]` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * Negative values cause underflow, and decimals are truncated.
     *
     * Integers larger than 65535 have their 2 least significant bytes written
     */
    writeUint16(value: number): this {
        this._view.setUint16(this.index, value);
        this.index += 2;
        return this;
    }

    /**
     * **Warning**: This is not a native DataView method
     * @returns An integer in `[0, 16777216]`
     */
    readUint24(): number {
        const val = (this._view.getUint16(this.index) << 8) + this._view.getUint8(this.index + 2);
        this.index += 3;
        return val;
    }

    /**
     * **Warning**: This is not a native DataView method
     * @param value An integer in range `[0, 16777216]` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * Negative values cause underflow, and decimals are truncated.
     *
     * Integers larger than 16777215 have their 4 least significant bytes written
     */
    writeUint24(value: number): this {
        this._view.setUint16(this.index, value >> 8);
        this.index += 2;
        this._view.setUint8(this.index++, value);
        return this;
    }

    /**
     * @returns An integer in `[0, 4294967296]`
     */
    readUint32(): number {
        const val = this._view.getUint32(this.index);
        this.index += 4;
        return val;
    }

    /**
     * @param value An integer in range `[0, 4294967296]` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * Negative values cause underflow, and decimals are truncated.
     *
     * Integers larger than 4294967295 have their 4 least significant bytes written
     */
    writeUint32(value: number): this {
        this._view.setUint32(this.index, value);
        this.index += 4;
        return this;
    }

    /**
     * @returns An integer in `[0, 18446744073709551616]`
     */
    readUint64(): bigint {
        const val = this._view.getBigUint64(this.index);
        this.index += 8;
        return val;
    }

    /**
     * @param value An integer in range `[0, 18446744073709551616]` to write. `value` being negative
     * causes underflow
     *
     * Integers larger than 18446744073709551615 have their 8 least significant bytes written
     */
    writeUint64(value: bigint): this {
        this._view.setBigUint64(this.index, value);
        this.index += 8;
        return this;
    }

    /**
     * @returns An integer in `[-128, 128]`
     */
    readInt8(): number {
        const val = this._view.getInt8(this.index);
        this.index += 1;
        return val;
    }

    /**
     * @param value An integer in range `[-128, 128]` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * - `value` not being an integer
     * - `value` being out-of-range
     */
    writeInt8(value: number): this {
        this._view.setInt8(this.index, value);
        this.index += 1;
        return this;
    }

    /**
     * @returns An integer in `[-32768, 32768]`
     */
    readInt16(): number {
        const val = this._view.getInt16(this.index);
        this.index += 2;
        return val;
    }

    /**
     * @param value An integer in range `[-32768, 32768]` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * - `value` being negative
     * - `value` not being an integer
     * - `value` being out-of-range
     */
    writeInt16(value: number): this {
        this._view.setInt16(this.index, value);
        this.index += 2;
        return this;
    }

    /**
     * @returns An integer in `[-2147483648, 2147483648]`
     */
    readInt32(): number {
        const val = this._view.getInt32(this.index);
        this.index += 4;
        return val;
    }

    /**
     * @param value An integer in range `[-2147483648, 2147483648]` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * - `value` being negative
     * - `value` not being an integer
     * - `value` being out-of-range
     */
    writeInt32(value: number): this {
        this._view.setInt32(this.index, value);
        this.index += 4;
        return this;
    }

    /**
     * @returns An integer in `[-9223372036854775808, 9223372036854775808]`
     */
    readInt64(): bigint {
        const val = this._view.getBigInt64(this.index);
        this.index += 8;
        return val;
    }

    /**
     * @param value An integer in range `[-9223372036854775808, 9223372036854775808]` to write. `value` being out-of-range
     * leads to undefined behavior
     */
    writeInt64(value: bigint): this {
        this._view.setBigInt64(this.index, value);
        this.index += 8;
        return this;
    }

    /**
     * @returns An IEEE-754 single-precision float which may be `NaN` or ±`Infinity`
     */
    readFloat32(): number {
        const val = this._view.getFloat32(this.index);
        this.index += 4;
        return val;
    }

    /**
     * @param value Any floating point value, including `NaN`, ±`Infinity`, and any integer
     */
    writeFloat32(value: number): this {
        this._view.setFloat32(this.index, value);
        this.index += 4;
        return this;
    }

    /**
     * @returns An IEEE-754 double-precision float (same format natively used by Javascript) which may be `NaN` or ±`Infinity`
     */
    readFloat64(): number {
        const val = this._view.getFloat64(this.index);
        this.index += 8;
        return val;
    }

    /**
     * @param value Any floating point value, including `NaN`, ±`Infinity`, and any integer
     */
    writeFloat64(value: number): this {
        this._view.setFloat64(this.index, value);
        this.index += 8;
        return this;
    }

    /**
     * Reads a UTF-8 string using the [TextDecoder API](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder)
     * @param bytes The number of bytes to read. Undefined behavior occurs if this value is:
     * - not an integer
     * - negative
     * - `NaN`
     * - non-finite
     *
     * @returns A UTF-8 string conforming to the output of {@link TextDecoder#decode}, with the decoder's encoding set to UTF-8
     */
    readString(bytes: number): string {
        if (bytes === 0) {
            return "";
        }

        const chars = [];
        let c: number;
        let i = 0;

        do {
            if ((c = this.readUint8()) === 0) {
                break;
            }

            chars[i++] = c;
        } while (i < bytes);

        return ByteStream.decoder.decode(new Uint8Array(chars));
    }

    /**
     * Writes a UTF-8 string using the [TextEncoder API](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder)
     * @param bytes The number of bytes to write. Undefined behavior occurs if this value is:
     * - not an integer
     * - negative
     * - `NaN`
     * - non-finite
     * @param string The string to encode. Any null character (equivalently, `\x00`, `\0`, or `\u0000`) will immediately terminate writing,
     * as if the string had no characters beyond it. In other words, any string `s` will be treated as if it were `s.substring(0, s.indexOf("\0"))`
     * Any string whose encoding exceeds the provided byte count will have the excess bits truncated silently
     */
    writeString(bytes: number, string: string): this {
        if (bytes === 0) return this;

        const byteArray = ByteStream.encoder.encode(string);

        for (let i = 0; i < bytes; i++) {
            const val = byteArray[i] ?? 0;
            this.writeUint8(val);

            if (val === 0) { break; }
        }

        return this;
    }

    /**
     * Writes a float value constrained to an interval. Undefined behavior occurs if the interval described by
     * `min` and `max` is degenerate (in other words, if `min ≥ max`). The interval is inclusive, and reads/writes of the
     * bounds are guaranteed to be 100% accurate.
     * @param value The value to write. Undefined behavior occurs if it is `NaN`, non-finite, or outside the interval `[min, max]`
     * @param min The lower bound of the interval. Undefined behavior occurs if it is `NaN` or non-finite
     * @param max The upper bound of the interval. Undefined behavior occurs if it is `NaN` or non-finite
     * @param bytes The amount of bytes to used. Must be an integer in [1, 4]. Undefined behavior happens for any other value.
     */
    writeFloat(value: number, min: number, max: number, bytes: 1 | 2 | 3 | 4): this {
        const range = (2 ** (8 * bytes)) - 1;

        const val = ((value - min) / (max - min)) * range + 0.5;
        switch (bytes) {
            case 1: {
                this.writeUint8(val);
                return this;
            }
            case 2: {
                this.writeUint16(val);
                return this;
            }
            case 3: {
                this.writeUint24(val);
                return this;
            }
            case 4: {
                this.writeUint32(val);
                return this;
            }
        }
    }

    /**
     * Reads a float value constrained to an interval. Undefined behavior occurs if the interval described by
     * `min` and `max` is degenerate (in other words, if `min ≥ max`). The interval is inclusive, and reads/writes of the
     * bounds are guaranteed to be 100% accurate.
     * @param min The lower bound of the interval. Undefined behavior occurs if it is `NaN` or non-finite
     * @param max The upper bound of the interval. Undefined behavior occurs if it is `NaN` or non-finite
     * @param bytes The amount of bytes to used. Must be an integer in [1, 4]. Undefined behavior happens for any other value.
     */
    readFloat(min: number, max: number, bytes: 1 | 2 | 3 | 4): number {
        const range = (2 ** (8 * bytes)) - 1;

        let val: number;
        switch (bytes) {
            case 1: {
                val = this.readUint8();
                break;
            }
            case 2: {
                val = this.readUint16();
                break;
            }
            case 3: {
                val = this.readUint24();
                break;
            }
            case 4: {
                val = this.readUint32();
                break;
            }
        }

        return min + (max - min) * val / range;
    }

    /**
     * Writes an angle in radians over one byte, with the angle falling inside `[-π, π]`
     * @param value The angle to write. Undefined behavior occurs if this value is not inside `[-π, π]`
     *
     * Impl. note: inlined and optimized version of the expression: `value => writeFloat(value, -π, π, 1)`
     */
    writeRotation(value: number): this {
        return this.writeUint8((value / τ + 0.5) * 255 + 0.5);
    }

    /**
     * Reads an angle in radians over two bytes, with the angle falling inside `[-π, π]`
     * @returns A float guaranteed to be finite, not `NaN`, and falling within `[-π, π]`
     *
     * Impl. note: inlined and optimized version of the expression: `() => readFloat(-π, π, 1)`
     */
    readRotation(): number {
        return τ * (this.readUint8() / 255 - 0.5);
    }

    /**
     * Writes an angle in radians over one byte, with the angle falling inside `[-π, π]`
     * @param value The angle to write. Undefined behavior occurs if this value is not inside `[-π, π]`
     *
     * Impl. note: inlined and optimized version of the expression: `value => writeFloat(value, -π, π, 2)`
     */
    writeRotation2(value: number): this {
        return this.writeUint16((value / τ + 0.5) * 65535 + 0.5);
    }

    /**
     * Reads an angle in radians over two bytes, with the angle falling inside `[-π, π]`
     * @returns A float guaranteed to be finite, not `NaN`, and falling within `[-π, π]`
     *
     * Impl. note: inlined and optimized version of the expression: `() => readFloat(-π, π, 2)`
     */
    readRotation2(): number {
        return τ * (this.readUint16() / 65535 - 0.5);
    }

    /**
     * Writes a group of 8 booleans. Any omitted booleans are interpreted as "don't care" terms—however, they
     * will always be written as `false` to the stream.
     */
    writeBooleanGroup(
        b0 : boolean, b1?: boolean, b2?: boolean, b3?: boolean,
        b4?: boolean, b5?: boolean, b6?: boolean, b7?: boolean
    ): this {
        return this.writeUint8(
            (b0 ? 1 : 0)
            + (b1 ? 2 : 0)
            + (b2 ? 4 : 0)
            + (b3 ? 8 : 0)
            + (b4 ? 16 : 0)
            + (b5 ? 32 : 0)
            + (b6 ? 64 : 0)
            + (b7 ? 128 : 0)
        );
    }

    /**
     * Reads a group of 8 booleans. "Don't care" terms will have been encoded as `false`.
     * Intended to be used with destructuring:
     * ```ts
     * // … somewhere on server …
     * stream.writeBooleanGroup(isAlive, isBoosted, hasItem);
     *
     * // … somewhere on client …
     * const [isAlive, isBoosted, hasItem] = stream.readBooleanGroup();
     * // the other 5 elements are "don't care" elements, but will always be 0 nevertheless
     * ```
     *
     * Note: can be used on an 8-bit integer. In this case, *the bit order will be reversed*.
     * In other words, the integer's LSB will be in this array's first position, and its MSB
     * will be in this array's last position
     */
    readBooleanGroup(): boolean[] & { length: 8 } {
        const packedGroup = this.readUint8();
        return [
            (packedGroup & 1) !== 0,
            (packedGroup & 2) !== 0,
            (packedGroup & 4) !== 0,
            (packedGroup & 8) !== 0,
            (packedGroup & 16) !== 0,
            (packedGroup & 32) !== 0,
            (packedGroup & 64) !== 0,
            (packedGroup & 128) !== 0
        ];
    }

    /**
     * Writes a group of 16 booleans over 2 bytes. Any omitted booleans are interpreted as "don't care" terms—however, they
     * will always be written as `false` to the stream.
     */
    writeBooleanGroup2(
        b0 : boolean, b1?: boolean, b2?: boolean, b3?: boolean,
        b4?: boolean, b5?: boolean, b6?: boolean, b7?: boolean,
        b8?: boolean, b9?: boolean, bA?: boolean, bB?: boolean,
        bC?: boolean, bD?: boolean, bE?: boolean, bF?: boolean
    ): this {
        return this.writeUint16(
            (b0 ? 1 : 0)
            + (b1 ? 2 : 0)
            + (b2 ? 4 : 0)
            + (b3 ? 8 : 0)
            + (b4 ? 16 : 0)
            + (b5 ? 32 : 0)
            + (b6 ? 64 : 0)
            + (b7 ? 128 : 0)
            + (b8 ? 256 : 0)
            + (b9 ? 512 : 0)
            + (bA ? 1024 : 0)
            + (bB ? 2048 : 0)
            + (bC ? 4096 : 0)
            + (bD ? 8192 : 0)
            + (bE ? 16384 : 0)
            + (bF ? 32768 : 0)
        );
    }

    /**
     * Reads a group of 16 booleans over 2 bytes. "Don't care" terms will have been encoded as `false`.
     * Intended to be used with destructuring:
     * ```ts
     * // … somewhere on server …
     * stream.writeBooleanGroup2(isAlive, isBoosted, hasItem);
     *
     * // … somewhere on client …
     * const [isAlive, isBoosted, hasItem] = stream.readBooleanGroup2();
     * // the other 13 elements are "don't care" elements, but will always be 0 nevertheless
     * ```
     *
     *  Note: can be used on a 16-bit integer. In this case, *the bit order will be reversed*.
     * In other words, the integer's LSB will be in this array's first position
     */
    readBooleanGroup2(): boolean[] & { length: 16 } {
        const packedGroup = this.readUint16();
        return [
            (packedGroup & 1) !== 0,
            (packedGroup & 2) !== 0,
            (packedGroup & 4) !== 0,
            (packedGroup & 8) !== 0,
            (packedGroup & 16) !== 0,
            (packedGroup & 32) !== 0,
            (packedGroup & 64) !== 0,
            (packedGroup & 128) !== 0,
            (packedGroup & 256) !== 0,
            (packedGroup & 512) !== 0,
            (packedGroup & 1024) !== 0,
            (packedGroup & 2048) !== 0,
            (packedGroup & 4096) !== 0,
            (packedGroup & 8192) !== 0,
            (packedGroup & 16384) !== 0,
            (packedGroup & 32768) !== 0
        ];
    }

    /**
     * Writes an array's elements to the stream, with a maximum length depending on the chosen byte count
     * @param source The source array. Arrays exceeding the maximum length will be truncated silently (see below for maximum lengths)
     * @param elementWriter A function allowing the serialization of any given element in the array
     * @param bytes The amount of bytes to use to signal the array's length. 1 byte allows for up to 255 elements, while 2 bytes allows for up to 65,535.
     */
    writeArray<T>(source: ArrayLike<T>, elementWriter: (item: T, stream: this) => void, bytes: 1 | 2 = 1): this {
        const length = Numeric.min(source.length, bytes === 1 ? 255 : 65535);

        if (bytes === 1) {
            this.writeUint8(length);
        } else if (bytes === 2) {
            this.writeUint16(length);
        }

        for (let i = 0; i < length; i++) {
            elementWriter(source[i], this);
        }

        return this;
    }

    /**
     * Writes an Set's elements to the stream, with a maximum length depending on the chosen byte count
     * @param source The source Set. Sets exceeding the maximum length will be truncated silently (see below for maximum lengths)
     * @param elementWriter A function allowing the serialization of any given element in the Set
     * @param bytes The amount of bytes to use to signal the Set's size. 1 byte allows for up to 255 elements, while 2 bytes allows for up to 65,535.
     */
    writeSet<T>(source: Set<T>, elementWriter: (item: T, stream: this) => void, bytes: 1 | 2 = 1): this {
        const length = Numeric.min(source.size, bytes === 1 ? 255 : 65535);

        if (bytes === 1) {
            this.writeUint8(length);
        } else if (bytes === 2) {
            this.writeUint16(length);
        }

        let i = 0;
        for (const item of source) {
            if (i >= length) break;
            elementWriter(item, this);
            i++;
        }

        return this;
    }

    /**
     * Reads and creates an array based on the contents of this stream. The length depends on the byte count provided
     * @param bytes The number of bytes to read to obtain the array's length
     * @param elementReader A function allowing to read any given element from the stream
     */
    readArray<T>(elementReader: (stream: this) => T, bytes: 1 | 2 = 1): T[] {
        let length: number;

        if (bytes === 1) {
            length = this.readUint8();
        } else { // if (bytes === 2) {
            length = this.readUint16();
        }

        const array = new Array<T>(length);
        for (let i = 0; i < length; i++) {
            array[i] = elementReader(this);
        }
        return array;
    }

    // full implementations of writeArray and readArray for >65535 elements below (currently unused)
    // /**
    //  * Writes an array's elements to the stream, with a maximum length depending on the chosen byte count
    //  * @param source The source array. Arrays exceeding the maximum length will be truncated silently (see below for maximum lengths)
    //  * @param elementWriter A function allowing the serialization of any given element in the array
    //  * @param bytes The amount of bytes to use to signal the array's length. The maximum lengths for a given byte count are as follows:
    //  * | Bytes             | Max. array length |
    //  * | :---------------: | :---------------: |
    //  * | 1                 | 255               |
    //  * | 2                 | 65535             |
    //  * | 3                 | 16777215          |
    //  * | 4                 | 4294967295        |
    //  * | `n`               | 2 ** 8`n`         |
    //  */
    // writeArray<T>(source: ArrayLike<T>, elementWriter: (item: T, stream: this) => void, bytes: 1 | 2 | 3 | 4 = 1): this {
    //     const length = Numeric.min(source.length, 2 ** (8 * bytes) - 1);
    //     switch (bytes) {
    //         case 1: {
    //             this.writeUint8(length);
    //             break;
    //         }
    //         case 2: {
    //             this.writeUint16(length);
    //             break;
    //         }
    //         case 3: {
    //             this.writeUint24(length);
    //             break;
    //         }
    //         case 4: {
    //             this.writeUint32(length);
    //             break;
    //         }
    //     }

    //     for (let i = 0; i < length; i++) {
    //         elementWriter(source[i], this);
    //     }

    //     return this;
    // }

    // /**
    //  * Reads and creates an array based on the contents of this stream. The length depends on the byte count provided
    //  * @param bytes The number of bytes to read to obtain the array's length
    //  * @param elementReader A function allowing to read any given element from the stream
    //  */
    // readArray<T>(elementReader: (stream: this) => T, bytes: 1 | 2 | 3 | 4): T[] {
    //     return Array.from(
    //         {
    //             length: (() => {
    //                 switch (bytes) {
    //                     case 1: return this.readUint8();
    //                     case 2: return this.readUint16();
    //                     case 3: return this.readUint24();
    //                     case 4: return this.readUint32();
    //                 }
    //             })()
    //         },
    //         () => elementReader(this)
    //     );
    // }

    /**
     * Copies a section of a stream into this one. By default, the entire source stream is read and copied
     * @param src The ByteStream to copy from
     * @param offset The offset to start copying from. Undefined behavior occurs if this is not a positive
     * integer strictly less than the length of `src`'s buffer
     * @param length How many bytes, starting from the given offset, to copy. Undefined behavior
     * occurs if this is not a positive integer such that `offset + length` is smaller than the length of `src`'s buffer
     */
    writeStream(src: ByteStream, offset = 0, length = src.index - offset): this {
        this._u8Array.set(src._u8Array.slice(offset, offset + length), this.index);
        this.index += length;
        return this;
    }
}
