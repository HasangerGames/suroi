import { type PacketType } from "../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";

export abstract class SendingPacket {
    abstract allocBytes: number;
    abstract type: PacketType;
    game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    serialize(stream: SuroiBitStream): void {
        stream.writePacketType(this.type);
    }
}
