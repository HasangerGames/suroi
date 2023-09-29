import { ReceivingPacket } from "../../types/receivingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { enablePlayButton } from "../../main";
import { ObjectCategory } from "../../../../../common/src/constants";

export class JoinedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {

        $("#joysticks-containers").toggle(true)

        if (this.game.socket.readyState === WebSocket.OPEN) {
            const emoteSelectors = [".emote-top", ".emote-right", ".emote-bottom", ".emote-left"];
            for (let i = 0; i < 4; i++) {
                const emoteType = stream.readObjectTypeNoCategory(ObjectCategory.Emote);
                $(`#emote-wheel > ${emoteSelectors[i]}`).css("background-image", `url("./img/game/emotes/${emoteType.idString}.svg")`);
            }
            $("canvas").addClass("active");
            $("#splash-ui").fadeOut(enablePlayButton);

            
            const hasKillLeader = stream.readBoolean()
            if (hasKillLeader) {
                const name = stream.readPlayerNameWithColor()
                const kills = stream.readBits(7)
                $("#killLeader-leader").html(name)
                $("#killLeader-kills-counter").text(kills)
            } else {
                $("#killLeader-leader").html("Unknown")
                $("#killLeader-kills-counter").text(0)
            }

        }
    }
}
