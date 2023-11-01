import { BitStream } from "@damienvesper/bit-buffer";
import { InputActions, KillFeedMessageType, MAX_OBJECT_SCALE, MIN_OBJECT_SCALE, ObjectCategory, PLAYER_NAME_MAX_LENGTH, PacketType, SpectateActions } from "../constants";
import { RotationMode } from "../definitions/obstacles";
import { type Orientation, type Variation } from "../typings";
import { normalizeAngle } from "./math";
import { type Vector } from "./vector";

export const calculateEnumPacketBits = (enumeration: Record<string | number, string | number>): number => Math.ceil(Math.log2(Object.keys(enumeration).length / 2));

export const PACKET_TYPE_BITS = calculateEnumPacketBits(PacketType);
export const OBJECT_CATEGORY_BITS = calculateEnumPacketBits(ObjectCategory);
export const OBJECT_ID_BITS = 12;
export const VARIATION_BITS = 3;
export const INPUT_ACTIONS_BITS = calculateEnumPacketBits(InputActions);
export const SPECTATE_ACTIONS_BITS = calculateEnumPacketBits(SpectateActions);
export const KILL_FEED_MESSAGE_TYPE_BITS = calculateEnumPacketBits(KillFeedMessageType);

export class SuroiBitStream extends BitStream {
    constructor(source: ArrayBuffer, byteOffset = 0, byteLength = 0) {
        super(source, byteOffset, byteLength);
    }

    /**
     * Allocs a new Suroi Bit Stream.
     * @param length The size of the stream.
     * @return The Suroi Bit Stream object.
     */
    static alloc(length: number): SuroiBitStream {
        return new SuroiBitStream(new ArrayBuffer(length));
    }

    /**
     * Write a floating point number to the stream.
     * @param value The number.
     * @param min The minimum number.
     * @param max The maximum number.
     * @param bitCount The number of bits to write
     */
    writeFloat(value: number, min: number, max: number, bitCount: number): void {
        const range = (1 << bitCount) - 1;
        const clamped = value < max ? (value > min ? value : min) : max;
        this.writeBits(((clamped - min) / (max - min)) * range + 0.5, bitCount);
    }

    /**
     * Read a floating point number from the stream.
     * @param min The minimum number.
     * @param max The maximum number.
     * @param bitCount The number of bits to read
     * @return The floating point number.
     */
    readFloat(min: number, max: number, bitCount: number): number {
        const range = (1 << bitCount) - 1;
        return min + (max - min) * this.readBits(bitCount) / range;
    }

    /**
     * Write a position Vector to the stream.
     * @param vector The Vector.
     * @param minX The minimum X position.
     * @param minY The minimum Y position.
     * @param maxX The maximum X position.
     * @param maxY The maximum Y position.
     * @param bitCount The number of bits to write.
     */
    writeVector(vector: Vector, minX: number, minY: number, maxX: number, maxY: number, bitCount: number): void {
        this.writeVector2(vector.x, vector.y, minX, minY, maxX, maxY, bitCount);
    }

    /**
     * Write a position Vector to the stream.
     * @param x The X position.
     * @param y The Y position.
     * @param minX The minimum X position.
     * @param minY The minimum Y position.
     * @param maxX The maximum X position.
     * @param maxY The maximum Y position.
     * @param bitCount The number of bits to write.
     * @return The position Vector.
     */
    writeVector2(x: number, y: number, minX: number, minY: number, maxX: number, maxY: number, bitCount: number): void {
        this.writeFloat(x, minX, maxX, bitCount);
        this.writeFloat(y, minY, maxY, bitCount);
    }

    /**
     * Read a position Vector from the stream.
     * @param minX The minimum X position.
     * @param minY The minimum Y position.
     * @param maxX The maximum X position.
     * @param maxY The maximum Y position.
     * @param bitCount The number of bits to read
     */
    readVector(minX: number, minY: number, maxX: number, maxY: number, bitCount: number): Vector {
        return {
            x: this.readFloat(minX, maxX, bitCount),
            y: this.readFloat(minY, maxY, bitCount)
        };
    }

    /**
     * Write a packet type to the stream.
     * @param value The packet type.
     */
    writePacketType(value: PacketType): void {
        this.writeBits(value, PACKET_TYPE_BITS);
    }

    /**
     * Read a packet type from stream.
     * @return The packet type.
     */
    readPacketType(): PacketType {
        return this.readBits(PACKET_TYPE_BITS) as PacketType;
    }

    /**
     * Write a game object type to the stream.
     * @param type The ObjectType
     */
    writeObjectType(type: ObjectCategory): void {
        this.writeBits(type, OBJECT_CATEGORY_BITS);
    }

    /**
     * Read a game object type from stream.
     * @return The object type.
     */
    readObjectType(): ObjectCategory {
        return this.readBits(OBJECT_CATEGORY_BITS);
    }

    /**
     * Write an object ID to the stream.
     * @param id The object ID to write
     */
    writeObjectID(id: number): void {
        this.writeBits(id, OBJECT_ID_BITS);
    }

    /**
     * Read an object ID from the stream.
     * @return The object ID
     */
    readObjectID(): number {
        return this.readBits(OBJECT_ID_BITS);
    }

    /**
     * Write a position Vector to the stream with the game default max and minimum X and Y.
     * @param vector The Vector to write.
     */
    writePosition(vector: Vector): void {
        this.writePosition2(vector.x, vector.y);
    }

    /**
     * Write a position Vector to the stream with the game default max and minimum X and Y.
     * @param x The x-coordinate of the vector to write
     * @param y The y-coordinate of the vector to write
     */
    writePosition2(x: number, y: number): void {
        this.writeVector2(x, y, 0, 0, 1344, 1344, 16);
    }

    /**
     * Read a position Vector from stream with the game default max and minimum X and Y.
     * @return the position Vector.
     */
    readPosition(): Vector {
        return this.readVector(0, 0, 1344, 1344, 16);
    }

    /**
     * Write a rotation to the stream.
     * @param value The rotation to write, in radians
     * @param bitCount The number of bits to write
     */
    writeRotation(value: number, bitCount: number): void {
        this.writeFloat(value, -Math.PI, Math.PI, bitCount);
    }

    /**
     * Read a rotation from the stream.
     * @param bitCount The number of bits to read
     * @return The rotation in radians.
     */
    readRotation(bitCount: number): number {
        return this.readFloat(-Math.PI, Math.PI, bitCount);
    }

    /**
     * Write an obstacle rotation to the stream.
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
     * Read an obstacle rotation from the stream.
     * @param mode The rotation mode
     * @return The rotation in radians.
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
                rotation = -normalizeAngle(orientation) * (Math.PI / 2);
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
     * Write a game object scale to the stream.
     * @param value The scale to write.
     */
    writeScale(value: number): void {
        this.writeFloat(value, MIN_OBJECT_SCALE, MAX_OBJECT_SCALE, 8);
    }

    /**
     * Read a game object scale from the stream.
     * @return The object scale.
     */
    readScale(): number {
        return this.readFloat(MIN_OBJECT_SCALE, MAX_OBJECT_SCALE, 8);
    }

    /**
     * Write a game object variation to the stream.
     * @param value The variation value to write.
     */
    writeVariation(value: Variation): void {
        this.writeBits(value, VARIATION_BITS);
    }

    /**
     * Read a game object variation from the stream.
     * @return The object variation.
     */
    readVariation(): Variation {
        return this.readBits(VARIATION_BITS) as Variation;
    }

    /**
     * Write a player name to the stream
     * @param name The player name.
     */
    writePlayerName(name: string): void {
        this.writeASCIIString(name, PLAYER_NAME_MAX_LENGTH);
    }

    /**
     * Read a player name from the stream
     * @return The player name.
     */
    readPlayerName(): string {
        return this.readASCIIString(PLAYER_NAME_MAX_LENGTH);
    }

    /**
     * Write a player name with dev colors to the stream.
     * @param player The player to write the name of
     */
    writePlayerNameWithColor(player: { name: string, isDev: boolean, nameColor: string }): void {
        this.writePlayerName(player.name);

        const hasColor = player.isDev && player.nameColor.length > 0;

        this.writeBoolean(hasColor);
        if (hasColor) {
            this.writeUTF8String(player.nameColor, 10);
        }
    }

    /**
     * Read a player name with dev colors from the stream.
     * @return A player name wrapped in a span element, with color if it's a dev
     */
    readPlayerNameWithColor(): string {
        const playerName = this.readPlayerName();
        const hasColor = this.readBoolean();
        const style = hasColor ? `style="color: ${this.readUTF8String(10)}"` : "";

        return `<span ${style}>${playerName}</span>`;
    }
}
