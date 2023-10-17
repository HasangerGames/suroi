import { type PacketType } from "../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { type PlayerManager } from "../utils/playerManager";

export abstract class SendingPacket {
    abstract allocBytes: number;
    abstract type: PacketType;
    playerManager: PlayerManager;
    game: Game;

    constructor(player: PlayerManager) {
        this.playerManager = player;
        this.game = player.game;
    }

    serialize(stream: SuroiBitStream): void {
        stream.writePacketType(this.type);
    }
}
