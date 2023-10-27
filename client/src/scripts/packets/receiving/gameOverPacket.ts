import $ from "jquery";
import { DEFAULT_USERNAME } from "../../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";
import { formatDate } from "../../utils/misc";

export let gameOverScreenTimeout: NodeJS.Timeout | undefined;

export class GameOverPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const game = this.game;

        $("#interact-message").hide();
        const activePlayer = game.activePlayer;
        if (activePlayer?.actionSound) game.soundManager.stop(activePlayer.actionSound);

        $("#gas-msg").fadeOut(500);

        // Disable joysticks div so you can click on players to spectate
        $("#joysticks-containers").hide();

        const gameOverScreen = $("#game-over-overlay");

        game.gameOver = true;
        const won = stream.readBoolean();

        if (!won) {
            $("#btn-spectate").removeClass("btn-disabled").show();
            game.map.indicator.setFrame("player_indicator_dead").setRotation(0);
        } else {
            $("#btn-spectate").hide();
        }
        $("#chicken-dinner").toggle(won);

        $("#game-over-text").text(won ? "Winner winner chicken dinner!" : "You died.");
        const name = stream.readPlayerNameWithColor();
        $("#game-over-player-name").html(game.console.getConfig("cv_anonymize_player_names") ? DEFAULT_USERNAME : name);
        $("#game-over-kills").text(stream.readUint8());
        $("#game-over-damage-done").text(stream.readUint16());
        $("#game-over-damage-taken").text(stream.readUint16());

        const timeString = formatDate(stream.readUint16());

        $("#game-over-time").text(timeString);

        if (won) {
            const volume = game.console.getConfig("cv_music_volume");
            if (volume) {
                game.music.play();
            }
            game.music.loop();
            game.music.volume(volume);
            game.musicPlaying = true;
        }

        gameOverScreenTimeout = setTimeout(() => gameOverScreen.fadeIn(500), 500);

        // Player rank
        $("#game-over-rank").text(`#${1 + (won ? 0 : stream.readBits(7))}`).toggleClass("won", won);
    }
}
