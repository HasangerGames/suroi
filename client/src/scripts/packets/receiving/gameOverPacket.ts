import { ReceivingPacket } from "../../types/receivingPacket";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";

export class GameOverPacket extends ReceivingPacket {
    public constructor(player: Player) {
        super(player);
    }

    deserialize(stream: SuroiBitStream): void {
        setTimeout(() => $("#game-over-screen").fadeIn(1000), 1000);
    }
}
