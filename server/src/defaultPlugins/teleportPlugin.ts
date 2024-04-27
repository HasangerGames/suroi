import { Vec } from "../../../common/src/utils/vector";
import { GameEvent, GamePlugin } from "../pluginManager";

/**
 * plugin to teleport a player when they send a map ping
 */
export class TeleportPlugin extends GamePlugin {
    protected override initListeners(): void {
        this.on(GameEvent.PlayerMapPing, event => {
            event.player.position = Vec.clone(event.position);
            event.player.updateObjects = true;
            event.player.setPartialDirty();
        });
    }
}
