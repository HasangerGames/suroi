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
            const killedBy = stream.readPlayerName();
            const killed = stream.readPlayerName();
            let weaponUsed: string | undefined;
            if (stream.readBoolean()) {
                weaponUsed = stream.readObjectType().definition.name;
            }
            killFeedItem.addClass("kill-feed-item-red");
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            killFeedItem.html(`<img class="kill-icon" src="${require("../../../assets/img/game/misc/skull.svg")}" alt="Skull"> ${killed} ${randomKillWord()} ${killedBy}${weaponUsed === undefined ? "" : ` with ${weaponUsed}`}`);
        } else if (messageType === KillFeedMessageType.Join) {
            const name = stream.readPlayerName();
            const joined = stream.readBoolean();
            killFeedItem.html(`<i class="fa-solid ${joined ? "fa-arrow-right-to-bracket" : "fa-arrow-right-from-bracket"}"></i> ${name} ${joined ? "joined" : "left"} the game`);
        }

        killFeed.prepend(killFeedItem);
        if (killFeed.children().length > 5) {
            killFeed.children().last().remove();
        }
        setTimeout((): void => {
            $(killFeedItem).fadeOut(1000, function() { $(this).remove(); });
        }, 7000);
    }
}
