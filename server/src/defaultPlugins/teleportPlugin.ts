import { Vec } from "../../../common/src/utils/vector";
import { GamePlugin } from "../pluginManager";

/**
 * Plugin to teleport a player to a map ping when they send one
 */
export class TeleportPlugin extends GamePlugin {
    protected override initListeners(): void {
        this.on("playerMapPing", ({ player, position }) => {
            player.position = Vec.clone(position);
            player.updateObjects = true;
            player.setPartialDirty();
        });
    }
}
