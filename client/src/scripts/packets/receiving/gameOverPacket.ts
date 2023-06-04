import { ReceivingPacket } from "../../types/receivingPacket";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type MinimapScene } from "../../scenes/minimapScene";

export class GameOverPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const minimap = this.playerManager.game.activePlayer.scene.scene.get("minimap") as MinimapScene;
        minimap.playerIndicatorDead = true;
        minimap.playerIndicator.setTexture("main", "player_indicator_dead.svg").setAngle(0);

        $("#game-over-player-name").text(stream.readPlayerName()); // player name
        $("#game-over-kills").text(stream.readUint8()); // kills
        $("#game-over-damage-done").text(stream.readUint16()); // damage done
        $("#game-over-damage-taken").text(stream.readUint16()); // damage taken

        const timeAlive = new Date(stream.readUint16() * 1000); // time alive
        let timeString = "";

        if (timeAlive.getMinutes() > 0) timeString += `${timeAlive.getMinutes()}m`;
        timeString += `${timeAlive.getSeconds()}s`;

        $("#game-over-time").text(timeString);
        setTimeout(() => $("#game-over-screen").fadeIn(1000), 3000);
    }
}
