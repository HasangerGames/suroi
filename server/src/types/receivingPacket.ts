import { type Player } from "../objects/player";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";

export abstract class ReceivingPacket {
    player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    abstract deserialize(stream: SuroiBitStream): void;
}
