import { ReceivingPacket } from "../../types/receivingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { enablePlayButton } from "../../main";
import core from "../../core";

export class JoinedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        if (core.game?.socket.readyState === WebSocket.OPEN) {
            $("canvas").addClass("active");
            $("#splash-ui").fadeOut(enablePlayButton);
        }
    }
}
