import { Packet, PacketType } from "../packets/packet";

export interface GameOverData {
    readonly type: PacketType.GameOver
    readonly rank: number
    readonly teammates: ReadonlyArray<{
        readonly playerID: number
        readonly kills: number
        readonly damageDone: number
        readonly damageTaken: number
        readonly timeAlive: number
    }>
}

export const GameOverPacket = new Packet<GameOverData>(PacketType.GameOver, {
    serialize(strm, data) {
        strm.writeUint8(data.rank);
        strm.writeArray(data.teammates, teammate =>
            strm.writeObjectId(teammate.playerID)
                .writeUint8(teammate.kills)
                .writeUint16(teammate.damageDone)
                .writeUint16(teammate.damageTaken)
                .writeUint16(teammate.timeAlive)
        );
    },

    deserialize(stream, data) {
        data.rank = stream.readUint8();
        data.teammates = stream.readArray(() => ({
            playerID: stream.readObjectId(),
            kills: stream.readUint8(),
            damageDone: stream.readUint16(),
            damageTaken: stream.readUint16(),
            timeAlive: stream.readUint16()
        }));
    }
});
