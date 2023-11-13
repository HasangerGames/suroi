import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";

export abstract class ReceivingPacket {
    game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    abstract deserialize(stream: SuroiBitStream): void;
}
