import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../../common/src/constants";

export class JoinPacket extends SendingPacket {
    constructor(player: Player) {
        super(player);

        this.type = PacketType.Join;
        this.allocBytes = 1;
    }

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
    }
}
