import $ from "jquery";
import { DEFAULT_USERNAME } from "../../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";
import { consoleVariables } from "../../utils/console/variables";
import { randomKillWord } from "../../utils/misc";

let timeoutID: number;

export class KillPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const kills = stream.readBits(7);
        const killText = `Kills: ${kills}`;
        $("#ui-kills").text(kills);

        $("#kill-msg-kills").text(killText);
        $("#kill-msg-word").text(randomKillWord());
        const name = stream.readPlayerNameWithColor();
        $("#kill-msg-player-name").html(consoleVariables.get.builtIn("cv_anonymize_player_names").value ? DEFAULT_USERNAME : name);
        $("#kill-msg-weapon-used").text(stream.readBoolean() ? ` with ${stream.readObjectType().definition.name}${stream.readBoolean() ? ` (streak: ${stream.readUint8()})` : ""}` : "");

        const killModal = $("#kill-msg");
        killModal.fadeIn(350, () => {
            // clear the previous fade out timeout so it won't fade away too
            // fast if the player makes more than one kill in a short time span
            if (timeoutID !== undefined) clearTimeout(timeoutID);

            timeoutID = window.setTimeout(() => {
                killModal.fadeOut(350);
            }, 3000);
        });
    }
}
