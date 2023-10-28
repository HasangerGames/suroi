import { Emotes } from "../../../../../common/src/definitions/emotes";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { enablePlayButton } from "../../main";
import { ReceivingPacket } from "../../types/receivingPacket";

export class JoinedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        if (this.game.socket.readyState === WebSocket.OPEN) {
            for (const emoteSelector of [".emote-top", ".emote-right", ".emote-bottom", ".emote-left"] as const) {
                $(`#emote-wheel > ${emoteSelector}`)
                    .css(
                        "background-image",
                        `url("./img/game/emotes/${Emotes.definitions[stream.readUint8()].idString}.svg")`
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
