import { Config } from "../config";
import { Events, GamePlugin } from "../pluginManager";

/**
 * Plugin to toggle the player speed when sending an emote
 */
export class SpeedTogglePlugin extends GamePlugin {
    protected override initListeners(): void {
        this.on(Events.Player_Emote, ({ player }) => {
            const { movementSpeed } = Config;

            if (player.baseSpeed === movementSpeed) {
                player.baseSpeed = 12 * movementSpeed;
            } else {
                player.baseSpeed = movementSpeed;
            }
        });
    }
}
