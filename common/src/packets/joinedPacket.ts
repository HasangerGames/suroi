import { TeamSize } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { DataSplitTypes, Packet, PacketType } from "./packet";

export type JoinedPacketData = {
    readonly type: PacketType.Joined
    readonly emotes: ReadonlyArray<EmoteDefinition | undefined>
} & (
    | { readonly teamSize: TeamSize.Solo }
    | {
        readonly teamSize: Exclude<TeamSize, TeamSize.Solo>
        readonly teamID: number
    }
);

export const JoinedPacket = new Packet<JoinedPacketData>(PacketType.Joined, {
    serialize(stream, data) {
        stream.writeUint8(data.teamSize);
        if (data.teamSize !== TeamSize.Solo) {
            stream.writeUint8(data.teamID);
        }

        const emotes = data.emotes;
        stream.writeBooleanGroup(
            emotes[0] !== undefined,
            emotes[1] !== undefined,
            emotes[2] !== undefined,
            emotes[3] !== undefined,
            emotes[4] !== undefined,
            emotes[5] !== undefined
        );
        for (let i = 0; i < 6; i++) {
            const emote = emotes[i];
            if (emote !== undefined) {
                Emotes.writeToStream(stream, emote);
            }
        }
    },

    deserialize(stream, data, saveIndex, recordTo) {
        saveIndex();

        data.teamSize = stream.readUint8();
        if (data.teamSize !== TeamSize.Solo) {
            data.teamID = stream.readUint8();
        }

        const emotes = stream.readBooleanGroup();
        data.emotes = new Array(6);
        for (let i = 0; i < 6; i++) {
            if (emotes[i]) data.emotes[i] = Emotes.readFromStream(stream);
        }

        recordTo(DataSplitTypes.PlayerData);
    }
});
