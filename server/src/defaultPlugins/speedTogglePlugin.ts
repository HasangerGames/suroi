import { GameConstants } from "@common/constants";
import { Events, GamePlugin } from "../pluginManager";

/**
 * Plugin to toggle the player speed when sending an emote
 */
export class SpeedTogglePlugin extends GamePlugin {
    protected override initListeners(): void {
        this.on(Events.Player_Emote, ({ player }) => {
            const { player: { baseSpeed } } = GameConstants;

            if (player.baseSpeed === baseSpeed) {
                player.baseSpeed = 12 * baseSpeed;
            } else {
                player.baseSpeed = baseSpeed;
            }
        });
    }
}
