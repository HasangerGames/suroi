import $ from "jquery";

import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { random } from "../../../../../common/src/utils/random";

let timeoutId: number;

export class KillPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const kills = stream.readUint8();
        const killText = `Kills: ${kills}`;

        const killWords: string[] = ["killed", "destroyed", "ended", "murdered", "wiped out", "annihilated", "slaughtered", "obliterated"];
        $("#kill-msg-kills").text(killText);
        $("#kill-msg-word").text(killWords[random(0, killWords.length - 1)]);
        $("#kill-msg-player-name").text(stream.readUTF8String(16)); // name

        const killModal = $("#kill-msg");
        killModal.fadeIn(350, () => {
            // clear the previous fade out timeout
            // so it wont fade away too fast if the player makes more than one kill in a short time span
            if (timeoutId !== undefined) clearTimeout(timeoutId);

            timeoutId = window.setTimeout(() => {
                killModal.fadeOut(350);
            }, 3000);
        });
    }
}
