import { ObjectCategory } from "../../../common/src/constants";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { GameObject } from "../types/gameObject";
import { type Player } from "./player";

export class DeathMarker extends GameObject<ObjectCategory.DeathMarker> {
    override readonly type = ObjectCategory.DeathMarker;
    readonly player: Player;
    isNew = true;

    constructor(player: Player) {
        super(player.game, player.position);
        this.player = player;

        setTimeout((): void => { this.isNew = false; }, 100);
    }

    override get data(): Required<ObjectsNetData[ObjectCategory.DeathMarker]> {
        return {
            position: this.position,
            isNew: this.isNew,
            playerId: this.player.id
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override damage(): void { }
}
