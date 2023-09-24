import { ReceivingPacket } from "../../types/receivingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import $ from "jquery";
import { formatDate } from "../../utils/misc";
import { localStorageInstance } from "../../utils/localStorageHandler";
import { DEFAULT_USERNAME } from "../../../../../common/src/constants";

export let gameOverScreenTimeout: NodeJS.Timeout | undefined;

export class GameOverPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        $("#interact-message").hide();
        const activePlayer = this.game.activePlayer;
        if (activePlayer?.actionSound) this.game.soundManager.stop(activePlayer.actionSound);

        $("#gas-msg").fadeOut(500);

        const gameOverScreen: JQuery = $("#game-over-overlay");

        this.game.gameOver = true;
        const won = stream.readBoolean();

        if (!won) {
            $("#btn-spectate").removeClass("btn-disabled").show();
            this.game.map.indicator.setFrame("player_indicator_dead").setRotation(0);
        } else {
            $("#btn-spectate").hide();
        }
        $("#chicken-dinner").toggle(won);

        $("#game-over-text").text(won ? "Winner winner chicken dinner!" : "You died.");
        const name = stream.readPlayerNameWithColor();
        $("#game-over-player-name").html(localStorageInstance.config.anonymousPlayers ? DEFAULT_USERNAME : name);
        $("#game-over-kills").text(stream.readUint8());
        $("#game-over-damage-done").text(stream.readUint16());
        $("#game-over-damage-taken").text(stream.readUint16());

        const timeString = formatDate(stream.readUint16());

        $("#game-over-time").text(timeString);
        if (won) {
            const game = this.game;
            game.music.play();
            game.music.loop();
            game.music.volume(localStorageInstance.config.musicVolume);
            game.musicPlaying = true;
        }
        gameOverScreenTimeout = setTimeout(() => gameOverScreen.fadeIn(1000), 3000);

        // Player rank
        const aliveCount = stream.readBits(7);
        if (won) {
            $("#game-over-rank").text(`#${aliveCount}`);
            $("#game-over-rank-mobile").text(`#${aliveCount}`);
        } else {
            $("#game-over-rank").text(`#${aliveCount + 1}`);
            $("#game-over-rank-mobile").text(`#${aliveCount + 1}`);
        }
    }
}
