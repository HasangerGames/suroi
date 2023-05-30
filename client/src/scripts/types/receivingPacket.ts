import { type PlayerManager } from "../utils/playerManager";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";

export abstract class ReceivingPacket {
    playerManager: PlayerManager;

    constructor(player: PlayerManager) {
        this.playerManager = player;
    }

    abstract deserialize(stream: SuroiBitStream): void;
}
