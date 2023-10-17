import { PacketType } from "../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";
import { SendingPacket } from "../../types/sendingPacket";

export class GameOverPacket extends SendingPacket {
    override readonly allocBytes = 1 << 6;
    override readonly type = PacketType.GameOver;
    readonly won: boolean;

    constructor(player: Player, won: boolean) {
        super(player);
        this.won = won;
    }

    override serialize(stream: SuroiBitStream): void {
        const player = this.player;
        const game = player.game;

        super.serialize(stream);

        stream.writeBoolean(this.won);
        stream.writePlayerNameWithColor(this.player);
        stream.writeUint8(this.player.kills);
        stream.writeUint16(this.player.damageDone);
        stream.writeUint16(this.player.damageTaken);
        stream.writeUint16((this.player.game.now - this.player.joinTime) / 1000);

        if (!this.won) {
            stream.writeBits(game.aliveCount, 7);
        }
    }
}
