import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../../common/src/constants/packetType";

export class InputPacket extends SendingPacket {
    constructor(player: Player) {
        super(player);
        this.type = PacketType.Input;
        this.allocBytes = 32;
    }

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        const p: Player = this.player;
        stream.writeBoolean(p.movingUp);
        stream.writeBoolean(p.movingDown);
        stream.writeBoolean(p.movingLeft);
        stream.writeBoolean(p.movingRight);
        stream.writeBoolean(p.punching);
        stream.writeUnitVector(p.rotation, 8);
    }
}
