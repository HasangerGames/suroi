import $ from "jquery";

import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { randomKillWord } from "../../utils/misc";

let timeoutId: number;

export class KillPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const kills = stream.readBits(7);
        const killText = `Kills: ${kills}`;

        $("#kill-msg-kills").text(killText);
        $("#kill-msg-word").text(randomKillWord());
        $("#kill-msg-player-name").text(stream.readPlayerName()); // name
        $("#kill-msg-weapon-used").text(stream.readBoolean() ? ` with ${stream.readObjectType().definition.name}` : "");

        const killModal = $("#kill-msg");
        killModal.fadeIn(350, (): void => {
            // clear the previous fade out timeout
            // so it won't fade away too fast if the player makes more than one kill in a short time span
            if (timeoutId !== undefined) clearTimeout(timeoutId);

            timeoutId = window.setTimeout((): void => {
                killModal.fadeOut(350);
            }, 3000);
        });
    }
}
