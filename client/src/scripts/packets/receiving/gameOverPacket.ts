import { ReceivingPacket } from "../../types/receivingPacket";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";

export class GameOverPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
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
