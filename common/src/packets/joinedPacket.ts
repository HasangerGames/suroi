import { TeamMode } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { DataSplitTypes, Packet, PacketType } from "./packet";

export type JoinedData = {
    readonly type: PacketType.Joined
    readonly emotes: ReadonlyArray<EmoteDefinition | undefined>
} & (
    | { readonly teamMode: TeamMode.Solo }
    | {
        readonly teamMode: Exclude<TeamMode, TeamMode.Solo>
        readonly teamID: number
    }
);

export const JoinedPacket = new Packet<JoinedData>(PacketType.Joined, {
    serialize(stream, data) {
        stream.writeUint8(data.teamMode);
        if (data.teamMode !== TeamMode.Solo) {
            stream.writeUint8(data.teamID);
        }

        const emotes = data.emotes;
        stream.writeBooleanGroup(
            emotes[0] !== undefined,
            emotes[1] !== undefined,
            emotes[2] !== undefined,
            emotes[3] !== undefined,
            emotes[4] !== undefined,
            emotes[5] !== undefined,
            emotes[6] !== undefined,
            emotes[7] !== undefined
        );
        for (let i = 0; i < 8; i++) {
            const emote = emotes[i];
            if (emote === undefined) continue;
            Emotes.writeToStream(stream, emote);
        }
    },

    deserialize(stream, data, saveIndex, recordTo) {
        saveIndex();

        data.teamMode = stream.readUint8();
        if (data.teamMode !== TeamMode.Solo) {
            data.teamID = stream.readUint8();
        }

        const emotes = stream.readBooleanGroup();
        data.emotes = new Array(8);
        for (let i = 0; i < 8; i++) {
            if (!emotes[i]) continue;
            data.emotes[i] = Emotes.readFromStream(stream);
        }

        recordTo(DataSplitTypes.PlayerData);
    }
});
