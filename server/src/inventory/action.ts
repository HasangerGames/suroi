import { PlayerActions } from "../../../common/src/constants";
import { type Player } from "../objects/player";
import { type GunItem } from "./gunItem";

export abstract class Action {
    player: Player;
    private readonly _timeoutId: ReturnType<typeof setTimeout>;
    abstract readonly type: PlayerActions;

    constructor(player: Player, time: number) {
        this.player = player;
        this._timeoutId = setTimeout(this.execute.bind(this), time * 1000);
        this.player.dirty.action = true;
    }

    cancel(): void {
        clearTimeout(this._timeoutId);
        this.player.action = undefined;
        this.player.dirty.action = true;
    }

    execute(): void {
        this.player.action = undefined;
        this.player.dirty.action = true;
    }
}

export class ReloadAction extends Action {
    item: GunItem;
    type = PlayerActions.Reload;

    constructor(player: Player, item: GunItem) {
        super(player, item.definition.reloadtime);
        this.item = item;
    }

    execute(): void {
        super.execute();
        const definition = this.item.definition;
        if (definition.singleReload) {
            this.item.ammo++;
            this.item.reload();
        } else {
            this.item.ammo = definition.capacity;
        }
        this.player.dirty.inventory = true;
    }
}
