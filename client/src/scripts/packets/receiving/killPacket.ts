import $ from "jquery";

import { ReceivingPacket } from "../../types/receivingPacket";
import { randomKillWord } from "../../utils/misc";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { localStorageInstance } from "../../utils/localStorageHandler";
import { DEFAULT_USERNAME } from "../../../../../common/src/constants";

let timeoutID: number;

export class KillPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const kills = stream.readBits(7);
        const killText = `Kills: ${kills}`;
        $("#ui-kills").text(kills);

        $("#kill-msg-kills").text(killText);
        $("#kill-msg-word").text(randomKillWord());
        const name = stream.readPlayerNameWithColor();
        $("#kill-msg-player-name").html(localStorageInstance.config.anonymousPlayers ? DEFAULT_USERNAME : name);
        $("#kill-msg-weapon-used").text(stream.readBoolean() ? ` with ${stream.readObjectType().definition.name}${stream.readBoolean() ? ` (streak: ${stream.readUint8()})` : ""}` : "");

        const killModal = $("#kill-msg");
        killModal.fadeIn(350, (): void => {
            // clear the previous fade out timeout
            // so it won't fade away too fast if the player makes more than one kill in a short time span
            if (timeoutID !== undefined) clearTimeout(timeoutID);

            timeoutID = window.setTimeout((): void => {
                killModal.fadeOut(350);
            }, 3000);
        });
    }
}
