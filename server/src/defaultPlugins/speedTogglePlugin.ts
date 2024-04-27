import { Config } from "../config";
import { GameEvent, GamePlugin } from "../pluginManager";

/**
 * Plugin to toggle the player speed when sending an emote
 */
export class SpeedTogglePlugin extends GamePlugin {
    protected override initListeners(): void {
        this.on(GameEvent.PlayerEmote, event => {
            if (event.player.baseSpeed === Config.movementSpeed) {
                event.player.baseSpeed = 0.3;
            } else {
                event.player.baseSpeed = Config.movementSpeed;
            }
        });
    }
}
