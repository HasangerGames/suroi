import { SpectateActions } from "../constants";
import { Packet, PacketType } from "./packet";

export type SpectatePacketData = {
    readonly type: PacketType.Spectate
} & (
    | {
        readonly spectateAction: SpectateActions.SpectateSpecific
        readonly playerID: number
    }
    | {
        readonly spectateAction: Exclude<SpectateActions, SpectateActions.SpectateSpecific>
        readonly playerID?: undefined
    }
);

export const SpectatePacket = new Packet<SpectatePacketData>(PacketType.Spectate, {
    serialize(stream, data) {
        stream.writeUint8(data.spectateAction);

        if (data.spectateAction === SpectateActions.SpectateSpecific) {
            stream.writeObjectId(data.playerID);
        }
    },

    deserialize(stream, data) {
        data.spectateAction = stream.readUint8();

        if (data.spectateAction === SpectateActions.SpectateSpecific) {
            data.playerID = stream.readObjectId();
        }
    }
});
