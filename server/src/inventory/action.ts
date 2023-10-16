import { type ObjectCategory, PlayerActions } from "../../../common/src/constants";
import { type HealingItemDefinition, HealType } from "../../../common/src/definitions/healingItems";
import { type ObjectType } from "../../../common/src/utils/objectType";
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

    readonly item: ObjectType<ObjectCategory.Loot, HealingItemDefinition>;
    override readonly speedMultiplier = 0.5;

    constructor(player: Player, item: ObjectType<ObjectCategory.Loot, HealingItemDefinition>) {
        const itemDef = item.definition;
        super(player, itemDef.useTime);
        this.item = item;
    }

    execute(): void {
        super.execute();

        const items = this.player.inventory.items;
        const itemDef = this.item.definition;

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
