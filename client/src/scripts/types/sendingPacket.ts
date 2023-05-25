import { type Player } from "../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type PacketType } from "../../../../common/src/constants";

export abstract class SendingPacket {
    abstract allocBytes: number;
    abstract type: PacketType;
    player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    serialize(stream: SuroiBitStream): void {
        stream.writePacketType(this.type);
    }
}
