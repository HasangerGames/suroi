import { PROTOCOL_VERSION } from "../../../../../common/src/constants";
import { Emotes } from "../../../../../common/src/definitions/emotes";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { enablePlayButton } from "../../main";
import { ReceivingPacket } from "../../types/receivingPacket";

export class JoinedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const protocolVersion = stream.readUint16();

        if (protocolVersion !== PROTOCOL_VERSION) {
            alert("Invalid game version.");
            // reload the page with a time stamp to try clearing cache
            location.search = `t=${Date.now()}`;
        }

        if (this.game.socket.readyState === WebSocket.OPEN) {
            for (const emoteSelector of [".emote-top", ".emote-right", ".emote-bottom", ".emote-left"] as const) {
                $(`#emote-wheel > ${emoteSelector}`)
                    .css(
                        "background-image",
                        `url("./img/game/emotes/${Emotes.readFromStream(stream).idString}.svg")`
                    );
            }

            $("canvas").addClass("active");
            $("#splash-ui").fadeOut(enablePlayButton);

            const hasKillLeader = stream.readBoolean();
            let name: string | undefined;
            let kills: number | undefined;
            if (hasKillLeader) {
                name = stream.readPlayerNameWithColor();
                kills = stream.readBits(7);
            }
            $("#kill-leader-leader").html(name ?? "Waiting for leader");
            $("#kill-leader-kills-counter").text(kills ?? "0");
        }
    }
}
