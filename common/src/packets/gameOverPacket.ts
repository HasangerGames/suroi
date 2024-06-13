import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Packet } from "./packet";

export class GameOverPacket implements Packet {
    won!: boolean;
    playerID!: number;
    kills!: number;
    damageDone!: number;
    damageTaken!: number;
    timeAlive!: number;
    rank!: number;

    serialize(stream: SuroiBitStream): void {
        stream.writeBoolean(this.won);
        stream.writeObjectID(this.playerID);
        stream.writeUint8(this.kills);
        stream.writeUint16(this.damageDone);
        stream.writeUint16(this.damageTaken);
        stream.writeUint16(this.timeAlive);
        if (!this.won) stream.writeBits(this.rank, 7);
    }

    deserialize(stream: SuroiBitStream): void {
        this.won = stream.readBoolean();
        this.playerID = stream.readObjectID();
        this.kills = stream.readUint8();
        this.damageDone = stream.readUint16();
        this.damageTaken = stream.readUint16();
        this.timeAlive = stream.readUint16();
        this.rank = this.won ? 1 : stream.readBits(7);
    }
}
