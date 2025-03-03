import { TeamSize } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { createPacket, DataSplitTypes } from "./packet";

export type JoinedPacketData = {
    readonly emotes: ReadonlyArray<EmoteDefinition | undefined>
} & ({
    readonly teamSize: TeamSize.Solo
} | {
    readonly teamSize: Exclude<TeamSize, TeamSize.Solo>
    readonly teamID: number
});

export const JoinedPacket = createPacket("JoinedPacket")<JoinedPacketData>({
    serialize(stream, data) {
        stream.writeUint8(data.teamSize);
        if (data.teamSize !== TeamSize.Solo) {
            stream.writeUint8(data.teamID);
        }

        const { emotes } = data;

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
    deserialize(stream, [saveIndex, recordTo]) {
        saveIndex();
        const teamSize: TeamSize = stream.readUint8();
        const teamID = teamSize !== TeamSize.Solo ? stream.readUint8() : undefined;

        const emoteSlots = stream.readBooleanGroup();

        const data = {
            teamSize,
            teamID,
            emotes: Array.from({ length: 6 }, (_, i) => emoteSlots[i] ? Emotes.readFromStream(stream) : undefined)
        } as JoinedPacketData;

        recordTo(DataSplitTypes.PlayerData);
        return data;
    }
});
