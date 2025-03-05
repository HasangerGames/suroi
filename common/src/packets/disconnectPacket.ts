import { Packet, PacketType } from "./packet";

export interface DisconnectData {
    readonly type: PacketType.Disconnect
    readonly reason: string
}

export const DisconnectPacket = new Packet<DisconnectData>(PacketType.Disconnect, {
    serialize(stream, data) {
        stream.writeString(64, data.reason);
    },

    deserialize(stream, data) {
        data.reason = stream.readString(64);
    }
});
