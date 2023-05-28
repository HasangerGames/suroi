import $ from "jquery";

import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { randomKillWord } from "../../utils/misc";
import { KILL_FEED_MESSAGE_TYPE_BITS, KillFeedMessageType } from "../../../../../common/src/constants";

export class KillFeedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const killFeed = $("#kill-feed");
        const killFeedItem = $("<div>");
        killFeedItem.addClass("kill-feed-item");

        const messageType: KillFeedMessageType = stream.readBits(KILL_FEED_MESSAGE_TYPE_BITS);
        if (messageType === KillFeedMessageType.Kill) {
            const killedBy = stream.readUTF8String(16);
            const killed = stream.readUTF8String(16);
            let weaponUsed: string | undefined;
            if (stream.readBoolean()) {
                weaponUsed = stream.readObjectType().definition.name;
            }
            killFeedItem.text(`${killed} ${randomKillWord()} ${killedBy}${weaponUsed === undefined ? "" : ` with ${weaponUsed}`}`);
        } else if (messageType === KillFeedMessageType.Join) {
            const name = stream.readUTF8String(16);
            const joined = stream.readBoolean();
            killFeedItem.text(`${name} ${joined ? "joined" : "left"} the game`);
        }

        killFeed.prepend(killFeedItem);
        if (killFeed.children().length > 5) {
            killFeed.children().last().remove();
        }
        setTimeout(() => {
            $(killFeedItem).fadeOut(1000, function() { $(this).remove(); });
        }, 6000);
    }
}
