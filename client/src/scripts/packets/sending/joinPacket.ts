import { type Player } from "../../objects/player";
import { SendingPacket } from "../../types/sendingPacket";

import { PacketType } from "../../../../../common/src/constants";

export class JoinPacket extends SendingPacket {
    constructor(player: Player) {
        super(player);

        this.type = PacketType.Join;
        this.allocBytes = 1;
    }
}
