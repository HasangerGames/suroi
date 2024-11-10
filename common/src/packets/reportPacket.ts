import { createPacket } from "./packet";

export type ReportPacketData = {
    readonly playerName: string // TODO refactor to use player ID
    readonly reportID: string
};

export const ReportPacket = createPacket("ReportPacket")<ReportPacketData>({
    serialize(strm, data) {
        strm.writePlayerName(data.playerName)
            .writeString(8, data.reportID);
    },

    deserialize(stream) {
        return {
            playerName: stream.readPlayerName(),
            reportID: stream.readString(8)
        };
    }
});
