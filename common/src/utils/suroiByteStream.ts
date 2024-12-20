import { Constants, Derived, ObjectCategory, type Layer } from "../constants";
import { RotationMode } from "../definitions/obstacles";
import { type Orientation } from "../typings";
import { ByteStream } from "./byteStream";
import { Angle, halfπ } from "./math";
import { type Vector } from "./vector";

export const calculateEnumPacketBits = (enumeration: Record<string | number, string | number>): number => Math.ceil(Math.log2(Object.keys(enumeration).length / 2));

// #region pre-flight checks
if (calculateEnumPacketBits(ObjectCategory) > 8) {
    throw new RangeError("FATAL: ObjectCategory enum contains too many keys for a single byte. Please update code accordingly");
}

// shut the fuck up
// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
if (Constants.PLAYER_NAME_MAX_LENGTH <= 0) {
    throw new RangeError("FATAL: Player name max. length must be greater than 0");
}
// #endregion pre-flight checks

export class SuroiByteStream extends ByteStream {
    /**
     * Writes a {@link Vector} object to the stream. Undefined behavior occurs if either `[minX, maxX]` or `[minY, maxY]` is degenerate.
     * Otherwise, both intervals are inclusive
     * @param vector The vector to write. Undefined behavior occurs if either component is out-of-bounds
     * @param minX The smallest x value
     * @param minY The largest x value
     * @param maxX The smallest y value
     * @param maxY The largest y value
     * @param bytes The number of bytes to use
     */
    writeVector(
        vector: Vector,
        minX: number, minY: number,
        maxX: number, maxY: number,
        bytes: 1 | 2 | 3 | 4
    ): this {
        this.writeFloat(vector.x, minX, maxX, bytes);
        this.writeFloat(vector.y, minY, maxY, bytes);
        return this;
    }

    /**
     * Reads a {@link Vector} object from the stream. Undefined behavior occurs if either `[minX, maxX]` or `[minY, maxY]` is degenerate.
     * Otherwise, both intervals are inclusive
     * @param minX The smallest x value
     * @param minY The largest x value
     * @param maxX The smallest y value
     * @param maxY The largest y value
     * @param bytes The number of bytes to use
     */
    readVector(
        minX: number, minY: number,
        maxX: number, maxY: number,
        bytes: 1 | 2 | 3 | 4
    ): Vector {
        return {
            x: this.readFloat(minX, maxX, bytes),
            y: this.readFloat(minY, maxY, bytes)
        };
    }

    /**
     * Writes an object category to the stream
     */
    writeObjectType(type: ObjectCategory): this {
        return this.writeUint8(type);
    }

    /**
     * Writes an object category to the stream
     */
    readObjectType(): ObjectCategory {
        return this.readUint8();
    }

    /**
     * Alias for {@link ByteStream.writeUint16}
     */
    writeObjectId(id: number): this {
        return this.writeUint16(id);
    }

    /**
     * Alias for {@link ByteStream.readUint16}
     */
    readObjectId(): number {
        return this.readUint16();
    }

    /**
     * Writes a position to the stream, using {@link GameConstants.maxPosition} as an upper bound.
     * @param vector The position
     *
     * Impl. note: inlined and optimized version of the expression: `vector => writeVector(vector, 0, GameConstants.maxPosition, 0, GameConstants.maxPosition, 2)`
     */
    writePosition(vector: Vector): this {
        this.writeUint16((vector.x / Constants.MAX_POSITION) * 65535 + 0.5);
        this.writeUint16((vector.y / Constants.MAX_POSITION) * 65535 + 0.5);
        return this;
    }

    /**
     * Reads a position from the stream, using {@link GameConstants.maxPosition} as an upper bound.
     *
     * Impl. note: inlined and optimized version of the expression: `() => readVector(0, GameConstants.maxPosition, 0, GameConstants.maxPosition, 2)`
     */
    readPosition(): Vector {
        return {
            x: Constants.MAX_POSITION * this.readUint16() / 65535,
            y: Constants.MAX_POSITION * this.readUint16() / 65535
        };
    }

    /**
     * Writes an obstacle rotation to the stream
     *
     * **Note**: This method is provided, but users should be aware that it is not space-efficient, and should
     * therefore investigate space optimization techniques
     * @param value The rotation value. Passing an invalid value for the given mode results in undefined behavior
     * @param mode The rotation mode to use
     */
    writeObstacleRotation(value: number, mode: RotationMode): this {
        switch (mode) {
            case RotationMode.Full: {
                this.writeRotation(value);
                break;
            }
            case RotationMode.Limited:
            case RotationMode.Binary: {
                this.writeUint8(value);
                break;
            }
            // case RotationMode.None: {
            //     break;
            // }
        }
        return this;
    }

    /**
     * Reads an obstacle rotation from the stream
     *
     * **Note**: This method is provided, but users should be aware that it is not space-efficient, and should
     * therefore investigate space optimization techniques
     * @param mode The mode to use
     */
    readObstacleRotation(mode: RotationMode): { rotation: number, orientation: Orientation } {
        let orientation: Orientation = 0;
        let rotation = 0;

        switch (mode) {
            case RotationMode.Full: {
                rotation = this.readRotation();
                break;
            }
            case RotationMode.Limited: {
                orientation = this.readUint8() as Orientation;
                rotation = -Angle.normalize(orientation) * halfπ;
                break;
            }
            case RotationMode.Binary: {
                if (this.readUint8() !== 0) {
                    rotation = halfπ; // sus
                    orientation = 1;
                }
                break;
            }
            // case RotationMode.None: {
            //     break;
            // }
        }

        return {
            rotation,
            orientation
        };
    }

    /**
     * Writes a scale to the stream
     * @param scale The scale to write. Must be within `[MIN_OBJECT_SCALE, MAX_OBJECT_SCALE]`
     *
     * Impl. note: inlined and optimized version of the expression: `scale => writeFloat(scale, MIN_OBJECT_SCALE, MAX_OBJECT_SCALE, 1)`
     */
    writeScale(scale: number): this {
        this.writeUint8(
            (
                (scale - Constants.MIN_OBJECT_SCALE) / Derived.OBJECT_SCALE_DIFF
            ) * 255 + 0.5
        );
        return this;
    }

    /**
     * Reads a scale from the stream
     * @returns A scale within `[MIN_OBJECT_SCALE, MAX_OBJECT_SCALE]`
     *
     * Impl. note: inlined and optimized version of the expression: `() => readFloat(MIN_OBJECT_SCALE, MAX_OBJECT_SCALE, 1)`
     */
    readScale(): number {
        return Constants.MIN_OBJECT_SCALE + Derived.OBJECT_SCALE_DIFF * this.readUint8() / 255;
    }

    /**
     * Alias for {@link ByteStream.writeUint8}
     */
    writeLayer(layer: Layer): this {
        return this.writeInt8(layer);
    }

    /**
     * Alias for {@link ByteStream.readUint8}
     */
    readLayer(): Layer {
        return this.readInt8();
    }

    /**
     * Writes a player's name to the stream, as if by `name => writeString(16, name)`
     */
    writePlayerName(name: string): this {
        const byteArray = ByteStream.encoder.encode(name);

        // you fuckin stupid or something?
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        for (let i = 0; i < Constants.PLAYER_NAME_MAX_LENGTH; i++) {
            const val = byteArray[i] ?? 0;
            this.writeUint8(val);

            if (val === 0) { break; }
        }

        return this;
    }

    /**
     * Reads a player's name to the stream, as if by `() => readString(16, name)`
     */
    readPlayerName(): string {
        const chars = [];
        let c: number;
        let i = 0;

        do {
            if ((c = this.readUint8()) === 0) {
                break;
            }

            chars[i++] = c;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        } while (i < Constants.PLAYER_NAME_MAX_LENGTH);

        return new TextDecoder().decode(new Uint8Array(chars));
    }
}
