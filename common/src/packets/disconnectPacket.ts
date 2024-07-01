import { createPacket } from "./packet";

export type DisconnectData = {
    readonly reason: string
};

export const DisconnectPacket = createPacket("DisconnectPacket")<DisconnectData>({
    serialize(stream, data) {
        stream.writeASCIIString(data.reason);
    },

    deserialize(stream) {
        return {
            reason: stream.readASCIIString()
        };
    }
});
