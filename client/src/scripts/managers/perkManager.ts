import type { PerkDefinition } from "@common/definitions/perks";
import { PerkManager, type PerkCollection } from "@common/utils/perkManager";
import type { Game } from "../game";

export class ClientPerkManager extends PerkManager {
    constructor(readonly game: Game, perks?: number | readonly PerkDefinition[]) {
        super(perks);
    }

    overwrite(perks: PerkCollection): void {
        this._items = perks.asBitfield();
    }
}
