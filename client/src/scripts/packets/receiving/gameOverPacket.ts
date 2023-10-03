import $ from "jquery";
import { DEFAULT_USERNAME } from "../../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";
import { consoleVariables } from "../../utils/console/variables";
import { formatDate } from "../../utils/misc";

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
        $("#game-over-player-name").html(consoleVariables.get.builtIn("cv_anonymize_player_names").value ? DEFAULT_USERNAME : name);
        $("#game-over-kills").text(stream.readUint8());
        $("#game-over-damage-done").text(stream.readUint16());
        $("#game-over-damage-taken").text(stream.readUint16());

        const timeString = formatDate(stream.readUint16());

        $("#game-over-time").text(timeString);

        if (won) {
            const game = this.game;
            const volume = consoleVariables.get.builtIn("cv_music_volume").value;
            if (volume) {
                game.music.play();
            }
            game.music.loop();
            game.music.volume(volume);
            game.musicPlaying = true;
        }

        gameOverScreenTimeout = setTimeout(() => gameOverScreen.fadeIn(1000), 3000);

        // Player rank
        const text = `#${(won ? 0 : stream.readBits(7)) + 1}`;
        $("#game-over-rank").text(text);
        $("#game-over-rank-mobile").text(text);
    }
}
