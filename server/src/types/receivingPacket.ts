import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Player } from "../objects/player";

export abstract class ReceivingPacket {
    player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    abstract deserialize(stream: SuroiBitStream): void;
}
