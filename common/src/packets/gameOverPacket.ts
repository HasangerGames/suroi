import { createPacket } from "./packet";

export type GameOverData = {
    readonly numberTeammates: number
    readonly teammates: ReadonlyArray<{
        readonly playerID: number
        readonly kills: number
        readonly damageDone: number
        readonly damageTaken: number
        readonly timeAlive: number
    }>
} & ({
    readonly won: true
    readonly rank: 1
} | {
    readonly won: false
    readonly rank: number
});

export interface TeammateGameOverData {
    playerID: number
    kills: number
    damageDone: number
    damageTaken: number
    timeAlive: number
}

export const GameOverPacket = createPacket("GameOverPacket")<GameOverData>({
    serialize(strm, data) {
        strm.writeUint8(data.numberTeammates);
        strm.writeUint8(data.rank);
        for (let i = 0; i < data.numberTeammates; i++) {
            strm.writeObjectId(data.teammates[i].playerID)
                .writeUint8(data.teammates[i].kills)
                .writeUint16(data.teammates[i].damageDone)
                .writeUint16(data.teammates[i].damageTaken)
                .writeUint16(data.teammates[i].timeAlive);
        }
    },

    deserialize(stream) {
        const numberTeammates = stream.readUint8();
        const rank = stream.readUint8();
        const teammates: TeammateGameOverData[] = [];
        for (let i = 0; i < numberTeammates; i++) {
            const playerID = stream.readObjectId();
            const kills = stream.readUint8();
            const damageDone = stream.readUint16();
            const damageTaken = stream.readUint16();
            const timeAlive = stream.readUint16();
            teammates.push({
                playerID,
                kills,
                damageDone,
                damageTaken,
                timeAlive
            });
        }
        return {
            won: rank === 1,
            rank,
            numberTeammates: numberTeammates,
            teammates: teammates
        } as GameOverData;
    }
});
