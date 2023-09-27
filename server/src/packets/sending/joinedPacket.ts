import { SendingPacket } from "../../types/sendingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";

export class JoinedPacket extends SendingPacket {
    override readonly allocBytes = 32;
    override readonly type = PacketType.Joined;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        for (let i = 0; i < this.player.loadout.emotes.length; i++) {
            stream.writeObjectTypeNoCategory(this.player.loadout.emotes[i]);
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
