import { PlayerActions } from "../../../common/src/constants";
import { HealType, type HealingItemDefinition } from "../../../common/src/definitions/healingItems";
import { Loots } from "../../../common/src/definitions/loots";
import { type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { type Player } from "../objects/player";
import { type GunItem } from "./gunItem";

export abstract class Action {
    readonly player: Player;
    private readonly _timeoutId: ReturnType<typeof setTimeout>;
    abstract get type(): PlayerActions;
    readonly speedMultiplier = 1 as number;

    protected constructor(player: Player, time: number) {
        this.player = player;
        this._timeoutId = setTimeout(this.execute.bind(this), time * 1000);
        this.player.actionSeq++;
        this.player.actionSeq %= 4;
        this.player.game.fullDirtyObjects.add(this.player);
    }

    cancel(): void {
        clearTimeout(this._timeoutId);
        this.player.action = undefined;
        this.player.actionSeq++;
        this.player.actionSeq %= 4;
        this.player.game.fullDirtyObjects.add(this.player);
    }

    execute(): void {
        this.player.action = undefined;
        this.player.actionSeq++;
        this.player.actionSeq %= 4;
        this.player.game.fullDirtyObjects.add(this.player);
    }
}

export class ReloadAction extends Action {
    private readonly _type = PlayerActions.Reload;
    get type(): PlayerActions.Reload { return this._type; }
    readonly item: GunItem;

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
        this.player.attacking = false;
        this.player.dirty.weapons = true;
        this.player.dirty.inventory = true;
    }
}

export class HealingAction extends Action {
    private readonly _type = PlayerActions.UseItem;
    get type(): PlayerActions.UseItem { return this._type; }

    readonly item: HealingItemDefinition;
    override readonly speedMultiplier = 0.5;

    constructor(player: Player, item: ReifiableDef<HealingItemDefinition>) {
        const itemDef = Loots.reify<HealingItemDefinition>(item);
        super(player, itemDef.useTime);
        this.item = itemDef;
    }

    execute(): void {
        super.execute();

        this.player.inventory.items[this.item.idString]--;

        switch (this.item.healType) {
            case HealType.Health:
                this.player.health += this.item.restoreAmount;
                break;
            case HealType.Adrenaline:
                this.player.adrenaline += this.item.restoreAmount;
                break;
        }
        this.player.dirty.inventory = true;
    }
}
