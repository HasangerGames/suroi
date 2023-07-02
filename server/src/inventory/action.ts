import { type ObjectCategory, PlayerActions } from "../../../common/src/constants";
import { HealType, type HealingItemDefinition } from "../../../common/src/definitions/healingItems";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type Player } from "../objects/player";
import { type GunItem } from "./gunItem";

export abstract class Action {
    player: Player;
    private readonly _timeoutId: ReturnType<typeof setTimeout>;
    abstract readonly type: PlayerActions;
    speedMultiplier = 1;

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
    type = PlayerActions.Reload;
    item: GunItem;

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
        this.player.dirty.inventory = true;
    }
}

export class HealingAction extends Action {
    type = PlayerActions.UseItem;
    item: ObjectType<ObjectCategory.Loot>;
    speedMultiplier = 0.5;

    constructor(player: Player, item: ObjectType<ObjectCategory.Loot>) {
        const itemDef = item.definition as HealingItemDefinition;
        super(player, itemDef.useTime);
        this.item = item;
    }

    execute(): void {
        super.execute();

        const items = this.player.inventory.items;
        const itemDef = this.item.definition as HealingItemDefinition;

        items[itemDef.idString] -= 1;

        switch (itemDef.healType) {
            case HealType.Health:
                this.player.health += itemDef.restoreAmount;
                break;
            case HealType.Adrenaline:
                this.player.adrenaline += itemDef.restoreAmount;
                break;
        }
        this.player.dirty.inventory = true;
    }
}
