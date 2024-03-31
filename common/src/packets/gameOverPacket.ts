import { PacketType } from "../constants";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { AbstractPacket } from "./packet";

export class GameOverPacket extends AbstractPacket {
    override readonly allocBytes = 1 << 6;
    override readonly type = PacketType.GameOver;

    won!: boolean;
    playerID!: number;
    kills!: number;
    damageDone!: number;
    damageTaken!: number;
    timeAlive!: number;
    rank!: number;

    team!: boolean;
    teamRank!: number;
    teammates!: Array<{
        playerID: number
        kills: number
        damageDone: number
        damageTaken: number
        timeAlive: number
    }>;

    override serialize(stream: SuroiBitStream): void {
        stream.writeBoolean(this.won);
        stream.writeObjectID(this.playerID);
        stream.writeUint8(this.kills);
        stream.writeUint16(this.damageDone);
        stream.writeUint16(this.damageTaken);
        stream.writeUint16(this.timeAlive);
        if (!this.won) stream.writeBits(this.rank, 7);

        stream.writeBoolean(this.team);
        if (this.team) {
            if (!this.won) stream.writeBits(this.rank, 7);
            stream.writeArray(this.teammates, 2, player => {
                stream.writeObjectID(player.playerID);
                stream.writeUint8(player.kills);
                stream.writeUint16(player.damageDone);
                stream.writeUint16(player.damageTaken);
                stream.writeUint16(player.timeAlive);
            });
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        this.won = stream.readBoolean();
        this.playerID = stream.readObjectID();
        this.kills = stream.readUint8();
        this.damageDone = stream.readUint16();
        this.damageTaken = stream.readUint16();
        this.timeAlive = stream.readUint16();
        this.rank = this.won ? 1 : stream.readBits(7);

        this.team = stream.readBoolean();
        if (this.team) {
            this.teamRank = this.won ? 1 : stream.readBits(7);
            this.teammates = [];
            stream.readArray(this.teammates, 2, () => {
                return {
                    playerID: stream.readObjectID(),
                    kills: stream.readUint8(),
                    damageDone: stream.readUint16(),
                    damageTaken: stream.readUint16(),
                    timeAlive: stream.readUint16()
                };
            });
        }
    }
}
