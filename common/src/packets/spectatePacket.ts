import { SpectateActions } from "../constants";
import { createPacket } from "./packet";

export type SpectatePacketData = {
    readonly spectateAction: SpectateActions.SpectateSpecific
    readonly playerID: number
} | {
    readonly spectateAction: Exclude<SpectateActions, SpectateActions.SpectateSpecific>
    readonly playerID?: undefined
};

export const SpectatePacket = createPacket("SpectatePacket")<SpectatePacketData>({
    serialize(stream, data) {
        stream.writeUint8(data.spectateAction);

        if (data.spectateAction === SpectateActions.SpectateSpecific) {
            stream.writeObjectId(data.playerID);
        }
    },

    deserialize(stream) {
        const spectateAction: SpectateActions = stream.readUint8();

        return {
            spectateAction,
            ...(spectateAction === SpectateActions.SpectateSpecific ? { playerID: stream.readObjectId() } : {})
        } as SpectatePacketData;
    }
});
