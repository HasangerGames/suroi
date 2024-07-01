import { SpectateActions } from "../constants";
import { calculateEnumPacketBits } from "../utils/suroiBitStream";
import { createPacket } from "./packet";

const SPECTATE_ACTIONS_BITS = calculateEnumPacketBits(SpectateActions);

export type SpectatePacketData = {
    readonly spectateAction: SpectateActions.SpectateSpecific
    readonly playerID: number
} | {
    readonly spectateAction: Exclude<SpectateActions, SpectateActions.SpectateSpecific>
};

export const SpectatePacket = createPacket("SpectatePacket")<SpectatePacketData>({
    serialize(stream, data) {
        stream.writeBits(data.spectateAction, SPECTATE_ACTIONS_BITS);

        if (data.spectateAction === SpectateActions.SpectateSpecific) {
            stream.writeObjectID(data.playerID);
        }
    },

    deserialize(stream) {
        const spectateAction: SpectateActions = stream.readBits(SPECTATE_ACTIONS_BITS);

        return {
            spectateAction,
            ...(spectateAction === SpectateActions.SpectateSpecific ? { playerID: stream.readObjectID() } : {})
        } as SpectatePacketData;
    }
});
