import { type Player } from "../../objects/player";
import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

export class JoinedPacket extends ReceivingPacket {
    public constructor(player: Player) {
        super(player);
    }

    deserialize(stream: SuroiBitStream): void {
        $("canvas").addClass("active");
        $("#splash-ui").addClass("fade-out");
    }
}
