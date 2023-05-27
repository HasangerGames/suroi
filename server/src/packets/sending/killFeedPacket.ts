import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";

export class KillFeedPacket extends SendingPacket {
    override readonly allocBytes = 1 << 6;
    override readonly type = PacketType.KillFeed;

    readonly killed: Player;
    readonly killedBy?: Player;

    constructor(player: Player, killed: Player) {
        super(player);

        this.killed = killed;
        this.killedBy = player.killedBy;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        // *NOTE: WIP, will change later
        const killedBy = this.killed?.killedBy?.name ?? "Player";

        stream.writeUTF8String(this.killed.name, 16);
        stream.writeUTF8String(killedBy, 16);
    }
}
