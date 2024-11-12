import { createPacket } from "./packet";

export type GameOverData = {
    readonly playerID: number
    readonly kills: number
    readonly damageDone: number
    readonly damageTaken: number
    readonly timeAlive: number
} & ({
    readonly won: true
    readonly rank: 1
} | {
    readonly won: false
    readonly rank: number
});

export const GameOverPacket = createPacket("GameOverPacket")<GameOverData>({
    serialize(strm, data) {
        strm.writeUint8(data.rank)
            .writeObjectId(data.playerID)
            .writeUint8(data.kills)
            .writeUint16(data.damageDone)
            .writeUint16(data.damageTaken)
            .writeUint16(data.timeAlive);
    },

    deserialize(stream) {
        const rank = stream.readUint8();
        return {
            won: rank === 1,
            rank,
            playerID: stream.readObjectId(),
            kills: stream.readUint8(),
            damageDone: stream.readUint16(),
            damageTaken: stream.readUint16(),
            timeAlive: stream.readUint16()
        } as GameOverData;
    }
});
