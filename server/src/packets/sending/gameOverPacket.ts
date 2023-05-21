import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";

export class GameOverPacket extends SendingPacket {
    constructor(player: Player) {
        super(player);

        this.type = PacketType.GameOver;
        this.allocBytes = 1 << 5;
    }

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        stream.writeUTF8String(this.player.name, 16);
        stream.writeUint8(this.player.kills);
        stream.writeUint16(this.player.damageDone);
        stream.writeUint16(this.player.damageTaken);
        stream.writeUint16((Date.now() - this.player.joinTime) / 1000);
    }
}
