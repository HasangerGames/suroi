import $ from "jquery";

import { type Player } from "../../objects/player";
import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

let timeoutId: number;

export class KillPacket extends ReceivingPacket {
    public constructor(player: Player) {
        super(player);
    }

    deserialize(stream: SuroiBitStream): void {
        const kills = stream.readUint8();
        const killText = `Kills: ${kills}`;
        $("#kill-msg-kills").text(killText);
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
