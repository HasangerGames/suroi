import $ from "jquery";

import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { randomKillWord } from "../../utils/misc";

export class KillFeedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const killedBy = stream.readUTF8String(16);
        const killed = stream.readUTF8String(16);
        let weaponUsed: string | undefined;
        if (stream.readBoolean()) {
            weaponUsed = stream.readObjectType().definition.name;
        }

        $("#kill-msg-player-name").text(killedBy); // name

        const killFeedEle = $("#kill-feed");

        const killFeedItemEle = $("<div>");

        killFeedItemEle.addClass("kill-feed-item");
        killFeedItemEle.text(`${killed} ${randomKillWord()} ${killedBy}${weaponUsed === undefined ? "" : ` with ${weaponUsed}`}`);

        killFeedEle.prepend(killFeedItemEle);
        setTimeout(() => {
            $(killFeedItemEle).fadeOut(1000, function() { $(this).remove(); });
        }, 5000);
    }
}
