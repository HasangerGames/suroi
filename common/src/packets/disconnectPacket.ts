import { createPacket } from "./packet";

export type DisconnectData = {
    readonly reason: string
};

export const DisconnectPacket = createPacket("DisconnectPacket")<DisconnectData>({
    serialize(stream, data) {
        stream.writeString(64, data.reason);
    },

    deserialize(stream) {
        return {
            reason: stream.readString(64)
        };
    }
});
