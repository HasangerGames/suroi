import { createPacket } from "./packet";

export type ReportPacketData = {
    readonly playerID: number
    readonly reportID: string
};

export const ReportPacket = createPacket("ReportPacket")<ReportPacketData>({
    serialize(strm, data) {
        strm.writeObjectId(data.playerID)
            .writeString(8, data.reportID);
    },

    deserialize(stream) {
        return {
            playerID: stream.readObjectId(),
            reportID: stream.readString(8)
        };
    }
});
