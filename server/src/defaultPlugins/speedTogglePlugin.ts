import { Config } from "../config";
import { type Game } from "../game";
import { GamePlugin } from "../pluginManager";

/**
 * Plugin to toggle the player speed when sending an emote
 */
export class SpeedTogglePlugin extends GamePlugin {
    constructor(game: Game) {
        super(game);

        this.on("playerEmote", event => {
            if (event.player.baseSpeed === Config.movementSpeed) {
                event.player.baseSpeed = 0.3;
            } else {
                event.player.baseSpeed = Config.movementSpeed;
            }
        });
    }
}
