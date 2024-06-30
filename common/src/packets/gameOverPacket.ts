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
    serialize(stream, data) {
        stream.writeBoolean(data.won);
        if (!data.won) stream.writeBits(data.rank, 7);
        stream.writeObjectID(data.playerID);
        stream.writeUint8(data.kills);
        stream.writeUint16(data.damageDone);
        stream.writeUint16(data.damageTaken);
        stream.writeUint16(data.timeAlive);
    },

    deserialize(stream) {
        const won = stream.readBoolean();
        return {
            won,
            rank: won ? 1 as const : stream.readBits(7),
            playerID: stream.readObjectID(),
            kills: stream.readUint8(),
            damageDone: stream.readUint16(),
            damageTaken: stream.readUint16(),
            timeAlive: stream.readUint16()
        } as GameOverData;
    }
});
