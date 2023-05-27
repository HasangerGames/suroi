import $ from "jquery";

import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

export class KillFeedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const killedBy = stream.readUTF8String(16);
        const killed = stream.readUTF8String(16);

        $("#kill-msg-player-name").text(killedBy); // name

        const killFeedEle = $("#kill-feed");

        const killFeedItemEle = document.createElement("div");

        killFeedItemEle.classList.add("kill-feed-item");
        killFeedItemEle.textContent = `${killed} killed ${killedBy} with fists`;

        killFeedEle.prepend(killFeedItemEle);
        setTimeout(() => {
            $(killFeedItemEle).fadeOut(700, function() { $(this).remove(); });
        }, 1800);
    }
}
