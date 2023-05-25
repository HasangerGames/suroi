import { type Player } from "../objects/player";

import { type PacketType } from "../../../common/src/constants";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";

export abstract class SendingPacket {
    abstract readonly allocBytes: number;
    abstract readonly type: PacketType;

    player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    serialize(stream: SuroiBitStream): void {
        stream.writePacketType(this.type);
    }
}
