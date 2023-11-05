import { PROTOCOL_VERSION, PacketType } from "../../../../common/src/constants";
import { Emotes } from "../../../../common/src/definitions/emotes";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";

export class JoinedPacket extends SendingPacket {
    override readonly allocBytes = 34;
    override readonly type = PacketType.Joined;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        stream.writeUint16(PROTOCOL_VERSION);

        for (const emote of this.player.loadout.emotes) {
            Emotes.writeToStream(stream, emote);
        }

        const killLeader = this.player.game.killLeader;
        const hasKillLeader = killLeader !== undefined;
        stream.writeBoolean(hasKillLeader);
        if (hasKillLeader) {
            stream.writePlayerNameWithColor(killLeader);
            stream.writeBits(killLeader.kills, 7);
        }
    }
}
