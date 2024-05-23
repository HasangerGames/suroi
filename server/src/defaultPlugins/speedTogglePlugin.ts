import { Config } from "../config";
import { GamePlugin } from "../pluginManager";

/**
 * Plugin to toggle the player speed when sending an emote
 */
export class SpeedTogglePlugin extends GamePlugin {
    protected override initListeners(): void {
        this.on("playerEmote", ({ player }) => {
            const { movementSpeed } = Config;

            if (player.baseSpeed === movementSpeed) {
                player.baseSpeed = 12 * movementSpeed;
            } else {
                player.baseSpeed = movementSpeed;
            }
        });
    }
}
