import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";

export class KillPacket extends SendingPacket {
    readonly killed: Player;

    constructor(player: Player, killed: Player) {
        super(player);
        this.type = PacketType.Kill;
        this.allocBytes = 1 << 5;

        this.killed = killed;
    }

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        stream.writeUint8(this.player.kills);
        stream.writeUTF8String(this.killed.name, 16);
    }
}
