import { ReceivingPacket } from "../../types/receivingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import $ from "jquery";
import { formatDate } from "../../utils/misc";

export let gameOverScreenTimeout: NodeJS.Timeout | undefined;

export class GameOverPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        $("#interact-message").hide();
        const gameOverScreen: JQuery = $("#game-over-screen");

        this.playerManager.game.gameOver = true;
        const won = stream.readBoolean();

        if (!won) {
            gameOverScreen.removeClass("chicken-dinner");
            $("#btn-spectate").show();
            $("#btn-spectate").removeClass("btn-disabled");
            this.playerManager.game.map.indicator.setFrame("player_indicator_dead.svg").setRotation(0);
        } else {
            gameOverScreen.addClass("chicken-dinner");
            $("#btn-spectate").hide();
        }

        $("#game-over-text").text(won ? "Winner winner chicken dinner!" : "You died.");
        $("#game-over-player-name").html(stream.readPlayerNameWithColor());
        $("#game-over-kills").text(stream.readUint8());
        $("#game-over-damage-done").text(stream.readUint16());
        $("#game-over-damage-taken").text(stream.readUint16());

        const timeString = formatDate(stream.readUint16());

        $("#game-over-time").text(timeString);
        gameOverScreenTimeout = setTimeout(() => gameOverScreen.fadeIn(1000), 3000);
    }
}
