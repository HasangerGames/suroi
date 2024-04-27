import { Vec } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GamePlugin } from "../pluginManager";

/**
 * plugin to teleport a player when they send a map ping
 */
export class TeleportPlugin extends GamePlugin {
    constructor(game: Game) {
        super(game);

        this.on("playerMapPing", event => {
            event.player.position = Vec.clone(event.position);
            event.player.updateObjects = true;
            event.player.setPartialDirty();
        });
    }
}
