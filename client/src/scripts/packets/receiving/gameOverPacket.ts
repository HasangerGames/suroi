import { ReceivingPacket } from "../../types/receivingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import $ from "jquery";
import { formatDate } from "../../utils/misc";
import { localStorageInstance } from "../../utils/localStorageHandler";

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
            this.playerManager.game.map.indicator.setFrame("player_indicator_dead").setRotation(0);
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
        if (won) {
            const game = this.playerManager.game;
            game.music.play();
            game.music.loop();
            game.music.volume(localStorageInstance.config.musicVolume);
            game.musicPlaying = true;
        }
        gameOverScreenTimeout = setTimeout(() => gameOverScreen.fadeIn(1000), 3000);//

        // Player rank
        const aliveCount = stream.readBits(7);
        if (won) $("#game-over-rank").text(`#${aliveCount}`);
        else $("#game-over-rank").text(`#${aliveCount + 1}`);
    }
}
