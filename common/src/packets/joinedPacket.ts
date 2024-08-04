import { TeamSize } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { createPacket } from "./packet";

export type JoinedPacketData = {
    readonly emotes: ReadonlyArray<EmoteDefinition | undefined>
} & ({
    readonly maxTeamSize: TeamSize.Solo
} | {
    readonly maxTeamSize: Exclude<TeamSize, TeamSize.Solo>
    readonly teamID: number
});

export const JoinedPacket = createPacket("JoinedPacket")<JoinedPacketData>({
    serialize(stream, data) {
        stream.writeBits(data.maxTeamSize, 3);
        if (data.maxTeamSize !== TeamSize.Solo) {
            stream.writeUint8(data.teamID);
        }

        for (const emote of data.emotes) {
            Emotes.writeOptional(stream, emote);
        }
    },
    deserialize(stream) {
        const maxTeamSize: TeamSize = stream.readBits(3);
        return {
            maxTeamSize,
            ...(maxTeamSize !== TeamSize.Solo ? { teamID: stream.readUint8() } : {}),
            emotes: Array.from({ length: 6 }, () => Emotes.readOptional(stream))
        } as JoinedPacketData;
    }
});
