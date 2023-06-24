import { PlayerActions } from "../../../common/src/constants";
import { type Player } from "../objects/player";
import { type GunItem } from "./gunItem";

export abstract class Action {
    player: Player;
    private readonly _timeoutId: ReturnType<typeof setTimeout>;
    abstract readonly type: PlayerActions;

    protected constructor(player: Player, time: number) {
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
        super(player, item.definition.reloadTime);
        this.item = item;
    }

    execute(): void {
        super.execute();
        const items = this.player.inventory.items;
        const definition = this.item.definition;
        const reloadAmount = definition.singleReload ? 1 : definition.capacity - this.item.ammo;
        const difference = Math.min(items[definition.ammoType], reloadAmount);
        this.item.ammo += difference;
        items[definition.ammoType] -= difference;
        if (definition.singleReload) this.item.reload();
        this.player.dirty.weapons = true;
    }
}
