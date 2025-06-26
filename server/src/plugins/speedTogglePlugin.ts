import { GameConstants } from "@common/constants";
import { GamePlugin } from "../pluginManager";

/**
 * Plugin to toggle the player speed when sending an emote
 */
export default class SpeedTogglePlugin extends GamePlugin {
    protected override initListeners(): void {
        this.on("player_did_emote", ({ player }) => {
            const baseSpeed = GameConstants.player.baseSpeed;

            if (player.baseSpeed === baseSpeed) {
                player.baseSpeed = 12 * baseSpeed;
            } else {
                player.baseSpeed = baseSpeed;
            }
        });
    }
}
