import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type PlayerManager } from "../utils/playerManager";

export abstract class ReceivingPacket {
    playerManager: PlayerManager;
    game: Game;

    constructor(player: PlayerManager) {
        this.playerManager = player;
        this.game = player.game;
    }

    abstract deserialize(stream: SuroiBitStream): void;
}
