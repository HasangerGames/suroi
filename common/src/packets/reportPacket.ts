import { createPacket } from "./packet";

export type ReportPacketData = {
    readonly playerName: string // TODO refactor to use player ID
    readonly reportID: string
};

export const ReportPacket = createPacket("ReportPacket")<ReportPacketData>({
    serialize(stream, data) {
        stream.writePlayerName(data.playerName);
        stream.writeASCIIString(data.reportID, 8);
    },

    deserialize(stream) {
        return {
            playerName: stream.readPlayerName(),
            reportID: stream.readASCIIString(8)
        };
    }
});
