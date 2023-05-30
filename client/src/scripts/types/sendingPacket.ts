import { type PlayerManager } from "../utils/playerManager";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type PacketType } from "../../../../common/src/constants";

export abstract class SendingPacket {
    abstract allocBytes: number;
    abstract type: PacketType;
    playerManager: PlayerManager;

    constructor(player: PlayerManager) {
        this.playerManager = player;
    }

    serialize(stream: SuroiBitStream): void {
        stream.writePacketType(this.type);
    }
}
