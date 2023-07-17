import { ReceivingPacket } from "../../types/receivingPacket";
import type { MinimapScene } from "../../scenes/minimapScene";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

export class GameOverPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        $("#interact-message").hide();
        const gameOverScreen: JQuery = $("#game-over-screen");

        this.playerManager.game.gameOver = true;
        const won = stream.readBoolean();

        if (!won) {
            gameOverScreen.removeClass("chicken-dinner");
            const minimap = this.playerManager.game.activePlayer.scene.scene.get("minimap") as MinimapScene;
            minimap.playerIndicator.setTexture("main", "player_indicator_dead.svg").setAngle(0);
        } else {
            gameOverScreen.addClass("chicken-dinner");
        }

        $("#game-over-text").text(won ? "Winner winner chicken dinner!" : "You died.");
        $("#game-over-player-name").html(stream.readPlayerNameWithColor());
        $("#game-over-kills").text(stream.readUint8());
        $("#game-over-damage-done").text(stream.readUint16());
        $("#game-over-damage-taken").text(stream.readUint16());

        const timeAlive = new Date(stream.readUint16() * 1000);
        let timeString = "";

        if (timeAlive.getMinutes() > 0) timeString += `${timeAlive.getMinutes()}m`;
        timeString += `${timeAlive.getSeconds()}s`;

        $("#game-over-time").text(timeString);
        setTimeout(() => gameOverScreen.fadeIn(1000), 3000);
    }
}
