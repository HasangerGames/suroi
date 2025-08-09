import { Action } from "./action";
import { PlayerActions } from "@common/constants";
import type { Player } from "../objects/player";
import type { GunItem } from "./gunItem";

export class WeaponSwitchAction extends Action {
    private readonly _type = PlayerActions.SwitchWeapon;
    override get type(): PlayerActions.SwitchWeapon {
        return this._type;
    }

    constructor(player: Player, readonly item: GunItem) {
        const switchDelay = (item.definition.switchDelay ?? 250) / 1000;
        super(player, switchDelay);
    }

    override execute(): void {
        super.execute();
        this.player.dirty.weapons = true;
    }
}