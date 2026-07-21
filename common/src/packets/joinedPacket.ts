import { type EmoteDefinition, Emotes } from "../definitions/emotes";
import { TeamMode } from "../schemas/misc";
import { DataSplitTypes, Packet, PacketType } from "./packet";

export type JoinedData = {
    readonly type: PacketType.Joined
    readonly emotes: ReadonlyArray<EmoteDefinition | undefined>
} & (
    | { readonly teamMode: "solo" }
    | {
        readonly teamMode: Exclude<TeamMode, "solo">
        readonly teamId: number
    }
);

export const JoinedPacket = new Packet<JoinedData>(PacketType.Joined, {
    serialize(stream, data) {
        stream.writeTeamMode(data.teamMode);
        if (data.teamMode !== "solo") {
            stream.writeUint8(data.teamId);
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

        data.teamMode = stream.readTeamMode();
        if (data.teamMode !== "solo") {
            data.teamId = stream.readUint8();
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
