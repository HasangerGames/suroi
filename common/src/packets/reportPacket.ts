import { Packet, PacketType } from "./packet";

export interface ReportPacketData {
    readonly type: PacketType.Report
    readonly playerID: number
    readonly reportID: string
}

export const ReportPacket = new Packet<ReportPacketData>(PacketType.Report, {
    serialize(strm, data) {
        strm.writeObjectId(data.playerID)
            .writeString(8, data.reportID);
    },

    deserialize(stream, data) {
        data.playerID = stream.readObjectId();
        data.reportID = stream.readString(8);
    }
});
